const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

// try npm wrapper first
let allureNpm = null;
try { allureNpm = require("allure-commandline"); } catch (_) {}
const mountedReports = new Map();
const HTML_ROOT = process.env.ALLURE_HTML_ROOT || path.resolve("allure-html");
fs.mkdirSync(HTML_ROOT, { recursive: true });

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function hash(s) { return crypto.createHash("sha1").update(s).digest("hex").slice(0, 8); }
function safeName(s) {
  return (s || "report").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

function runAllureGenerate(inputDir, outDir) {
  ensureDir(outDir);

  if (allureNpm) {
    const proc = allureNpm(["generate", inputDir, "-c", "-o", outDir]);
    return new Promise((resolve, reject) =>
      proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("allure generate failed"))))
    );
  }

  const bin = process.env.ALLURE_BIN || "allure";
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["generate", inputDir, "-c", "-o", outDir], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("allure generate failed"))));
    child.on("error", reject);
  });
}

module.exports = function (sequelize) {
  const router = express.Router();

  // POST /api/allure/generate   { resultsDir: "path", name?: "nice-name" }
  router.post("/generate", async (req, res) => {
    console.log("called generate...")
    try {
      const { resultsDir, name } = req.body || {};
      if (!resultsDir) return res.status(400).json({ error: "resultsDir is required" });
      if (!fs.existsSync(resultsDir)) return res.status(404).json({ error: "resultsDir not found" });

      const folder = `allure-report`;
      const outDir = path.join(resultsDir, folder);

      await runAllureGenerate(resultsDir, outDir);

      return res.json({
        ok: true,
        url: `/allure/${folder}/index.html`,
        outDir,
      });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

 

  return router;
};
