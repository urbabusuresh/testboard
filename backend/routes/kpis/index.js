// routes/executionsSummary.js
const express = require("express");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { QueryTypes } = require("sequelize");

module.exports = function (sequelize) {
  const router = express.Router();

  // Build WHERE clause from supported query params
  function buildWhereFromQuery(q) {
    const whereClauses = [];
    const params = [];

    if (q.projectId) {
      whereClauses.push("projectId = ?");
      params.push(q.projectId);
    }
    if (q.run_id) {
      whereClauses.push("run_id = ?");
      params.push(q.run_id);
    }
    if (q.cycle_type) {
      whereClauses.push("cycle_type = ?");
      params.push(q.cycle_type);
    }
    if (q.env_name) {
      whereClauses.push("env_name = ?");
      params.push(q.env_name);
    }

    // date filters applied to created_at (adjust to executed_at if desired)
    if (q.fromDate && q.toDate) {
      whereClauses.push("created_at BETWEEN ? AND ?");
      params.push(q.fromDate, q.toDate);
    } else if (q.fromDate) {
      whereClauses.push("created_at >= ?");
      params.push(q.fromDate);
    } else if (q.toDate) {
      whereClauses.push("created_at <= ?");
      params.push(q.toDate);
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";
    return { whereSQL, params };
  }

  /**
   * GET /api/executions/summary
   * Query params: projectId, run_id, cycle_type, env_name, fromDate, toDate
   * Optional: download=excel
   */
  router.get("/", async (req, res) => {
    try {
      const {
        download = null, // set ?download=excel to receive an xlsx
        ...filters
      } = req.query;

      const { whereSQL, params } = buildWhereFromQuery(filters);

      // 1) Basic counts
      const countsQ = `
        SELECT
          COUNT(*) AS total,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed,
          SUM(status = 'Skipped') AS skipped,
          SUM(status = 'Untested') AS untested,
          SUM(status = 'Retest') AS retest,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Blocked') AS blocked,
          SUM(include_in_run = 1) AS included_in_run
        FROM rapr_test_automation.testcase_executions
        ${whereSQL};
      `;

      // 2) Flaky tests: testcase_id having >1 distinct status in the period/scope
      const flakyQ = `
        SELECT COUNT(*) AS flakyCount
        FROM (
          SELECT testcase_id
          FROM rapr_test_automation.testcase_executions
          ${whereSQL}
          GROUP BY testcase_id
          HAVING COUNT(DISTINCT status) > 1
        ) t;
      `;

      // 3) Average duration (seconds) using timestamps if present
      const avgDurationQ = `
        SELECT AVG(
          TIMESTAMPDIFF(SECOND,
            COALESCE(preparation_start, executed_at),
            COALESCE(executed_at, preparation_end)
          )
        ) AS avgDurationSeconds
        FROM rapr_test_automation.testcase_executions
        ${whereSQL};
      `;

      // 4) Environment breakdown (top 5 environments by runs)
      const envBreakdownQ = `
        SELECT COALESCE(env_name, 'unknown') AS env_name,
          COUNT(*) AS runs,
          SUM(status='Passed') AS passed,
          ROUND(SUM(status='Passed')/GREATEST(COUNT(*),1)*100,2) AS passPercent
        FROM rapr_test_automation.testcase_executions
        ${whereSQL}
        GROUP BY env_name
        ORDER BY runs DESC
        LIMIT 5;
      `;

      // 5) Executions that reference bugs (non-empty bug_ids)
      const bugRefQ = `
        SELECT COUNT(*) AS executionsWithBugs
        FROM rapr_test_automation.testcase_executions
        ${whereSQL}
       
      `;
// AND bug_ids IS NOT NULL AND TRIM(bug_ids) != '';


      // 6) overall testcases with runs

      const overallTestRunCounts= ` SELECT run_id,count(distinct(testcase_id)) as testcase_count 
      FROM rapr_test_automation.testcase_executions  ${whereSQL} group by run_id`;

      const overallTestCounts= ` SELECT count(distinct(testcase_id)) as testcase_count 
      FROM rapr_test_automation.testcase_executions  ${whereSQL} `;

      // Execute queries with replacements
      const [[counts]] = await sequelize.query(countsQ, { replacements: params });
      const [[flaky]] = await sequelize.query(flakyQ, { replacements: params });
      const [[avgDuration]] = await sequelize.query(avgDurationQ, { replacements: params });
      const [envRows] = await sequelize.query(envBreakdownQ, { replacements: params });
      const [[bugRef]] = await sequelize.query(bugRefQ, { replacements: params });
      const [overallTestRunCountsData] = await sequelize.query(overallTestRunCounts, { replacements: params });
const [[overallTestCountsData]] = await sequelize.query(overallTestCounts, { replacements: params });

      
      const total = Number(counts.total || 0);
      const passed = Number(counts.passed || 0);
      const failed = Number(counts.failed || 0);
      const in_progress = Number(counts.in_progress || 0);
      const retest = Number(counts.retest || 0);
      const untested = Number(counts.untested || 0);
      const skipped = Number(counts.skipped || 0);
      const blocked = Number(counts.blocked || 0);
      const included_in_run = Number(counts.included_in_run || 0);
      const passPercent = total ? Math.round((passed / total) * 10000) / 100 : 0;

      const overallTestCountsDataVal= Number(overallTestCountsData.testcase_count);
      const result = {
        total,
        passed,
        failed,
        skipped,
        retest,
        untested,
        in_progress,
        blocked,
        included_in_run,
        passPercent,
        flakyCount: Number(flaky.flakyCount || 0),
        avgDurationSeconds: avgDuration.avgDurationSeconds ? Number(avgDuration.avgDurationSeconds) : null,
        executionsWithBugs: Number(bugRef.executionsWithBugs || 0),
        envBreakdown: envRows, // array of { env_name, runs, passed, passPercent }
        overallTestRunCountsData:overallTestRunCountsData,
        distinctTestCaseRuns:overallTestRunCountsData.length,
        overallTestCountsData:overallTestCountsDataVal,
        generatedAt: new Date().toISOString(),
      };

      // If user requested an excel download, produce it
      if (download === "excel") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Executions KPI");

        sheet.addRow(["KPI", "Value"]);
        sheet.addRow(["Total Executions", result.total]);
        sheet.addRow(["Testcase Runs",distinctTestCaseRuns])
        sheet.addRow(["Testcases",overallTestCountsDataVal])
        sheet.addRow(["Passed", result.passed]);
        sheet.addRow(["Failed", result.failed]);
        sheet.addRow(["In Progress", result.in_progress]);
        sheet.addRow(["Blocked", result.blocked]);
        sheet.addRow(["Retest", result.retest]);
        sheet.addRow(["Skipped", result.skipped]);
        sheet.addRow(["UnTested", result.untested]);
        sheet.addRow(["Included in Run", result.included_in_run]);
        sheet.addRow(["Pass Percent", `${result.passPercent}%`]);
        sheet.addRow(["Flaky Count", result.flakyCount]);
        sheet.addRow(["Avg Duration (s)", result.avgDurationSeconds ?? "N/A"]);
        sheet.addRow(["Executions with Bugs", result.executionsWithBugs]);

        sheet.addRow([]);
        sheet.addRow(["Environment Breakdown (top)"]);
        sheet.addRow(["Env Name", "Runs", "Passed", "PassPercent"]);
        (result.envBreakdown || []).forEach((r) => {
          sheet.addRow([r.env_name, r.runs, r.passed, r.passPercent]);
        });

        // write workbook to response stream
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename=executions-kpi-${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
        return res.end();
      }

      // Default JSON response
      return res.json(result);
    } catch (err) {
      console.error("Error GET /api/executions/summary:", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

 router.get("/getProjectTestStats", async (req, res) => {
  try {
    const projectIdRaw = req.query.projectId ?? req.body?.projectId;
    if (!projectIdRaw) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ success: false, error: "projectId must be an integer" });
    }

    // 1) get project row
    const [projectRows] = await sequelize.query(
      "SELECT * FROM projects WHERE id = :projectId",
      { replacements: { projectId } }
    );
    const project = Array.isArray(projectRows) ? projectRows[0] || null : projectRows || null;

    // 2) call stored procedure (which may return multiple result sets)
    const [procResults] = await sequelize.query(
      "CALL GetProjectTestStats(:projectId)",
      { replacements: { projectId } }
    );

    // Normalize procResults to extract the stats row.
    // If the SP returns two result sets (project, stats), procResults[1][0] is stats.
    // Otherwise, try procResults[0][0] or procResults[0].
    let stats = {};
    if (Array.isArray(procResults)) {
      if (procResults.length >= 2 && Array.isArray(procResults[1])) {
        stats = procResults[1][0] || {};
      } else if (Array.isArray(procResults[0])) {
        stats = procResults[0][0] || procResults[0] || {};
      } else {
        stats = procResults[0] || {};
      }
    } else if (procResults && typeof procResults === "object") {
      stats = procResults;
    }

    return res.status(200).json({ success: true, project: project || {}, stats: stats || {} });
  } catch (err) {
    console.error("Error fetching test stats:", err);
    const message =
      err && err.original && err.original.code === "ER_SP_DOES_NOT_EXIST"
        ? "Stored procedure GetProjectTestStats not found. Create it in rapr_test_automation DB."
        : err && err.message
        ? err.message
        : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});


 // make sure at top of file you have:
// const { QueryTypes } = require("sequelize");
router.get("/getProjectTestCasesSummary", async (req, res) => {
  try {
    const projectIdRaw = req.query.projectId ?? req.body?.projectId;
    const moduleRaw = req.query.module ?? req.body?.module;

    if (!projectIdRaw) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ success: false, error: "projectId must be an integer" });
    }

    let sql = `
      SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) AS count
      FROM rapr_test_automation.testcases tc
      LEFT JOIN TestCaseScenarios sc ON tc.ts_id = sc.ts_id
      WHERE tc.projectId = :projectId
    `;

    const replacements = { projectId };

    // Only add module filter if module is not empty
    if (moduleRaw && moduleRaw.trim() !== "") {
      const modulesArray = moduleRaw.split(',').map(m => m.trim()).filter(Boolean);
      sql += ` AND (sc.module IN (:modules) OR sc.module IS NULL)`;
      replacements.modules = modulesArray.length ? modulesArray : ['']; // fallback empty array
    }

    sql += ` GROUP BY tc.status ORDER BY COUNT(*) DESC;`;

    const rows = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const normalized = (Array.isArray(rows) ? rows : []).map((r) => ({
      status: r.status ?? "Unknown",
      count: Number(r.count) || 0,
    }));

    const total = normalized.reduce((s, r) => s + r.count, 0);

    return res.status(200).json({ success: true, data: normalized, total });
  } catch (err) {
    console.error("Error GET /api/executions/getProjectTestCasesSummary:", err);
    const message = err && err.message ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});



router.get("/getProjectTestCasesSummaryByModule", async (req, res) => {
    try {
      // ---------------- Input Validation ----------------
      const projectIdRaw = req.query.projectId ?? req.body?.projectId;
      const runId = req.query.runId ?? req.body?.runId;
      if (!projectIdRaw) {
        return res.status(400).json({ success: false, error: "projectId is required" });
      }

let isRunAvailable=false;
      if(Number(runId)){
 isRunAvailable=true;

      }
      const projectId = Number(projectIdRaw);
      if (!Number.isInteger(projectId)) {
        return res.status(400).json({ success: false, error: "projectId must be an integer" });
      }

      // ---------------- SQL Query ----------------
      const sql = `
        SELECT 
          COALESCE(sc.module, 'Unknown') AS module,
          COALESCE(tc.status, 'Unknown') AS status,
          COUNT(*) AS count
        FROM rapr_test_automation.testcases tc
        LEFT JOIN rapr_test_automation.TestCaseScenarios sc
          ON tc.ts_id = sc.ts_id
        WHERE tc.projectId = :projectId
        GROUP BY COALESCE(sc.module, 'Unknown'), COALESCE(tc.status, 'Unknown')
        ORDER BY module ASC, count DESC;
      `;

      const result = await sequelize.query(sql, {
        replacements: { projectId },
        type: QueryTypes.SELECT,
      });

      // ---------------- Data Normalization ----------------
      const normalized = (result || []).map((r) => ({
        module: r.module ?? "Unknown",
        status: r.status ?? "Unknown",
        count: Number(r.count) || 0,
      }));

      // ---------------- Group by Module ----------------
      const grouped = normalized.reduce((acc, { module, status, count }) => {
        if (!acc[module]) acc[module] = { module, total: 0, statuses: [] };
        acc[module].statuses.push({ status, count });
        acc[module].total += count;
        return acc;
      }, {});

      const responseData = Object.values(grouped);
      const grandTotal = responseData.reduce((sum, m) => sum + m.total, 0);

      // ---------------- Final Response ----------------
      return res.status(200).json({
        success: true,
        projectId,
        totalModules: responseData.length,
        grandTotal,
        modules: responseData,
      });
    } catch (err) {
      console.error("❌ Error in /getProjectTestCasesSummaryByModule:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    }
  });
  return router;
};
