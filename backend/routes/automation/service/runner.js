// backend/lib/automation/runner.js  (PURE CommonJS)

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// models + runner + scheduler (all CommonJS)

// Use absolute paths so cwd differences don't break anything
const TESTS_PATH  = path.resolve(process.env.TESTS_PATH  || "../PyTestOne/Tests");
const REPORTS_DIR = path.resolve(process.env.REPORTS_DIR || "./reports");
// routes/automation/service/runner.js


// ✅ get initialized models from your central models index
//    (server already does: const { sequelize } = require('./models'))
const { sequelize } = require("../../../models");
const { AutoTestRun, AutoTestCase, AutoTestGroup } = sequelize.models;


function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function stamp() { return new Date().toISOString().replace(/[:.]/g, ""); }

async function expandSelection({ ts_case_id, test_group_id }) {
  if (ts_case_id) {
    const tc = await AutoTestCase.findByPk(ts_case_id);
    if (!tc) throw new Error("Testcase not found");
    return [{ module: tc.get("module"), file: tc.get("testfilename") }];
  }
  if (test_group_id) {
    const group = await AutoTestGroup.findByPk(test_group_id);
    if (!group) throw new Error("Group not found");
    const ids = Array.isArray(group.get("ts_ids")) ? group.get("ts_ids") : [];
    if (!ids.length) throw new Error("Group has no testcases");
    const tcs = await AutoTestCase.findAll({ where: { ts_id: ids } });
    if (!tcs.length) throw new Error("No matching testcases for group");
    return tcs.map(tc => ({ module: tc.get("module"), file: tc.get("testfilename") }));
  }
  throw new Error("Either ts_case_id or test_group_id is required");
}

function buildReportDir(firstModule, build, scenario) {
  const dir = path.join(REPORTS_DIR, String(firstModule || "unknown"), String(build), String(scenario || "automation"), stamp());
  ensureDir(dir);
  return dir;
}

async function startRun(payload = {}) {
  const {
    ts_type = "immediate",
    ts_repeated = "N",
    ts_schedule_time = null,
    ts_buildname,
    ts_description = null,
    ts_env = "sit",
    ts_browser = "chrome",
    testdataPath = null,
    ts_case_id = null,
    test_group_id = null,
    scenario = "automation",
    projectid = null,
    runId = null,
  } = payload;

  if (!ts_buildname) throw new Error("ts_buildname is required");
  if (!ts_case_id && !test_group_id) throw new Error("ts_case_id or test_group_id is required");

  const selection = await expandSelection({ ts_case_id, test_group_id });
  const firstModule = selection[0]?.module || "unknown";
  const reportsPath = buildReportDir(firstModule, ts_buildname, scenario);

  const run = await AutoTestRun.create({
    ts_type, ts_repeated, ts_schedule_time,
    ts_buildname, ts_description, ts_env, ts_browser,
    testdataPath, ts_case_id, test_group_id,
    ts_reports_path: reportsPath,
    status: "running",
    started_at: new Date(),
    projectid,
    runId
  });

// --- replace everything from "const files = selection.map..." down to return ---

const files = selection.map(s => path.join(TESTS_PATH, s.module, s.file));

// Pick the Python to run (prefer a venv)
const pythonExe =  process.env.PYTEST_BIN || 'python';

// Build pytest args
const pytestArgs = [
 process.env.PYTEST_M, process.env.PYTEST_PATH,
  ...files,
  `--app=${firstModule}`,
  `--env=${ts_env}`,
  `--browser=${ts_browser}`,
  `--alluredir=${reportsPath}` // (space-separated form is safest)
];

// Optional: set the pytest project root so conftest/fixtures resolve.
// Provide this via env: PYTEST_PROJECT_ROOT=C:\path\to\PyTestOne
const projectRoot = process.env.TESTS_PATH || path.dirname(TESTS_PATH);

// Prepare log files
const logDir = path.join(reportsPath, '_logs');
ensureDir(logDir);
const stdoutPath = path.join(logDir, 'stdout.log');
const stderrPath = path.join(logDir, 'stderr.log');
const outStream  = fs.createWriteStream(stdoutPath, { flags: 'a' });
const errStream  = fs.createWriteStream(stderrPath, { flags: 'a' });

// Keep small in-memory tails for DB
const MAX_BUF = 2 * 1024 * 1024;
let bufOut = Buffer.alloc(0);
let bufErr = Buffer.alloc(0);
const cap = (cur, chunk) => {
  let next = Buffer.concat([cur, chunk]);
  if (next.length > MAX_BUF) next = next.slice(next.length - MAX_BUF);
  return next;
};

console.log('Running command:', pythonExe, pytestArgs.join(' '));

const child = spawn(pythonExe, pytestArgs, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false
});

const pid = child?.pid ?? null;
run.update({ pid }).catch(() => {});

child.stdout.on('data', (d) => {
  outStream.write(d);
  bufOut = cap(bufOut, Buffer.isBuffer(d) ? d : Buffer.from(d));
});

child.stderr.on('data', (d) => {
  errStream.write(d);
  bufErr = cap(bufErr, Buffer.isBuffer(d) ? d : Buffer.from(d));
});

child.on('error', async (err) => {
  outStream.end(); errStream.end();
  try {
    await run.update({
      status: 'error',
      exit_code: null,
      error_message: String(err && err.message || err),
      finished_at: new Date(),
      stdout_path: stdoutPath,
      stderr_path: stderrPath
    });
  } catch {}
});

child.on('close', async (code) => {
  outStream.end(); errStream.end();

  const stdoutTail = bufOut.toString('utf8');
  const stderrTail = bufErr.toString('utf8');

  try {
    await run.update({
      status: code === 0 ? 'passed' : 'failed',
      exit_code: code ?? null,
      finished_at: new Date(),
      stdout_path: stdoutPath,
      stderr_path: stderrPath,
      stdout_tail: stdoutTail.slice(-50000),
      stderr_tail: stderrTail.slice(-50000),
    });
  } catch {}

  // If tests passed, generate Allure HTML report
  if (code === 0 || code >0 ||code<0 ) {
    function resolveAllureBin() {
  if (process.env.ALLURE_BIN && fs.existsSync(process.env.ALLURE_BIN)) {
    return process.env.ALLURE_BIN;
  }
  if (process.platform === 'win32') {
    // Try common Windows shims
    const candidates = [
      'allure.cmd',  // Scoop shim
      'allure.bat',  // Zip/installer
      'allure.exe',  // Chocolatey
    ];
    for (const c of candidates) {
      // Let PATHEXT + PATH resolve if present
      try {
        const p = spawn(c, ['--version'], { stdio: 'ignore', shell: false });
        p.on('error', () => {});
        return c; // return first candidate; version check continues in bg
      } catch {}
    }
    // Fallback to NPX
    return null;
  } else {
    return 'allure'; // Unix systems typically have a plain binary
  }
}

const resultsDir = reportsPath;
const htmlDir = path.join(reportsPath, 'html');
ensureDir(htmlDir);

let allureBin = 'allure';
let gen, genOut = '', genErr = '';

if (allureBin) {
  console.log(`Running Allure CLI: ${allureBin} generate "${resultsDir}" -o "${htmlDir}" --clean`);
  gen = spawn(allureBin, ['generate', resultsDir, '-o', htmlDir, '--clean'], {
    stdio: ['pipe', 'pipe', 'pipe'], // capture
    shell: false
  });
} else {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  console.log(`Running Allure via NPX: ${npx} -y allure-commandline generate "${resultsDir}" -o "${htmlDir}" --clean`);
  gen = spawn(npx, ['-y', 'allure-commandline', 'generate', resultsDir, '-o', htmlDir, '--clean'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false
  });
}

// Stream child process output to your console
gen.stdout.on('data', (d) => {
  console.log(`[ALLURE-OUT] ${d.toString().trim()}`);
});
gen.stderr.on('data', (d) => {
  console.error(`[ALLURE-ERR] ${d.toString().trim()}`);
});


gen.stdout.on('data', d => { genOut += d.toString('utf8'); });
gen.stderr.on('data', d => { genErr += d.toString('utf8'); });

gen.on('close', async (gcode) => {
  try {
    await run.update({
      allure_status: gcode === 0 ? 'generated' : 'failed',
      allure_output: htmlDir,
      allure_exit_code: gcode,
      allure_stdout: genOut.slice(-50000),
      allure_stderr: genErr.slice(-50000),
    });
  } catch {}
});

gen.on('error', async (err) => {
  try {
    await run.update({
      allure_status: 'failed',
      allure_output: htmlDir,
      allure_error: String(err && err.message || err),
      allure_stderr: genErr.slice(-50000),
    });
  } catch {}
});

    
  }
});

// Return immediately; process continues in background but with output captured
return { testrunid: run.get('testrunid'), pid, reportsPath };

}
module.exports = { startRun };