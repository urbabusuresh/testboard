// routes/summaryReportController.js
const express = require("express");
const { QueryTypes } = require("sequelize");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();

module.exports = function (sequelize) {
  const router = express.Router();

  const toNum = (v, fallback = 0) => (v === null || v === undefined ? fallback : Number(v));

  function buildDynamicWhere(filters) {
    const clauses = [];
    const params = [];

    if (filters.projectId) {
      clauses.push("projectId = ?");
      params.push(filters.projectId);
    }

    if (filters.run_id) {
      clauses.push("run_id = ?");
      params.push(filters.run_id);
    }

    if (filters.executed_by) {
      clauses.push("executed_by = ?");
      params.push(filters.executed_by);
    }

    if (filters.status) {
      clauses.push("status = ?");
      params.push(filters.status);
    }

    if (filters.env_name) {
      clauses.push("env_name = ?");
      params.push(filters.env_name);
    }

    if (filters.cycle_type) {
      clauses.push("cycle_type = ?");
      params.push(filters.cycle_type);
    }

    if (filters.fromDate && filters.toDate) {
      clauses.push("DATE(executed_at) BETWEEN ? AND ?");
      params.push(filters.fromDate, filters.toDate);
    } else if (filters.fromDate) {
      clauses.push("DATE(executed_at) >= ?");
      params.push(filters.fromDate);
    } else if (filters.toDate) {
      clauses.push("DATE(executed_at) <= ?");
      params.push(filters.toDate);
    }

    const whereSQL = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return { whereSQL, params };
  }

  router.get("/summary-report", async (req, res) => {
    try {
      const filters = req.query;
      const { whereSQL, params } = buildDynamicWhere(filters);

      if (!filters.projectId || !filters.run_id) {
        return res.status(400).json({ error: "projectId and run_id are required" });
      }

      console.log("📊 Filters applied:", filters);

      // -------------------------------
      // 1️⃣ Overall Summary
      // -------------------------------
      const overall = await sequelize.query(
        `
        SELECT 
          COUNT(*) AS total,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed,
          SUM(status = 'Skipped') AS skipped,
          SUM(status = 'Blocked') AS blocked,
          SUM(status = 'Untested') AS untested,
          SUM(status = 'Retest') AS retest,
          ROUND(100 * SUM(status = 'Passed') / NULLIF(COUNT(*),0), 2) AS pass_rate,
          ROUND(100 * SUM(status = 'Failed') / NULLIF(COUNT(*),0), 2) AS fail_rate
        FROM testcase_executions
        ${whereSQL};
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 2️⃣ Daily Trend
      // -------------------------------
      const daily = await sequelize.query(
        `
        SELECT 
          DATE(executed_at) AS day,
          COUNT(*) AS total,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed,
          ROUND(100 * SUM(status = 'Passed') / NULLIF(COUNT(*),0), 2) AS pass_percentage
        FROM testcase_executions
        ${whereSQL}
        GROUP BY DATE(executed_at)
        ORDER BY day ASC;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 3️⃣ Tester Productivity
      // -------------------------------
      const testers = await sequelize.query(
        `
        SELECT 
          COALESCE(executed_by, 'Unassigned') AS executed_by,
          COUNT(*) AS total_executed,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed,
          ROUND(100 * SUM(status = 'Passed') / NULLIF(COUNT(*),0), 2) AS pass_rate
        FROM testcase_executions
        ${whereSQL}
        GROUP BY executed_by
        ORDER BY total_executed DESC;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 4️⃣ Environment Summary
      // -------------------------------
      const envSummary = await sequelize.query(
        `
        SELECT 
          COALESCE(env_os, 'N/A') AS os,
          COALESCE(env_browser, 'N/A') AS browser,
          COUNT(*) AS total,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed
        FROM testcase_executions
        ${whereSQL}
        GROUP BY env_os, env_browser
        ORDER BY total DESC;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 5️⃣ Flaky Tests
      // -------------------------------
      const flakyTests = await sequelize.query(
        `
        SELECT 
          testcase_id,
          COUNT(DISTINCT status) AS status_variants
        FROM testcase_executions
        ${whereSQL}
        GROUP BY testcase_id
        HAVING status_variants > 1
        ORDER BY status_variants DESC
        LIMIT 100;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 6️⃣ Requirement Coverage
      // -------------------------------
      const requirements = await sequelize.query(
        `
        SELECT requirement_ids
        FROM testcase_executions
        ${whereSQL} 
          AND requirement_ids IS NOT NULL 
          AND requirement_ids <> '[]'
        LIMIT 5000;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      const totalReqs = requirements
        .map(r => (r.requirement_ids.match(/\d+/g) || []))
        .flat()
        .filter((v, i, a) => a.indexOf(v) === i);

      // -------------------------------
      // 7️⃣ Reruns
      // -------------------------------
      const reruns = await sequelize.query(
        `
        SELECT 
          testcase_id, 
          COUNT(*) AS exec_count
        FROM testcase_executions
        ${whereSQL}
        GROUP BY testcase_id
        HAVING exec_count > 1
        ORDER BY exec_count DESC;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 8️⃣ Avg Duration
      // -------------------------------
      const duration = await sequelize.query(
        `
        SELECT 
          ROUND(AVG(TIMESTAMPDIFF(SECOND, preparation_start, executed_at)),2) AS avg_duration_sec
        FROM testcase_executions
        ${whereSQL}
          AND preparation_start IS NOT NULL 
          AND executed_at IS NOT NULL;
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 9️⃣ Quality Index
      // -------------------------------
      const qualityIndex = await sequelize.query(
        `
        SELECT
          ROUND(
            (SUM(status = 'Passed') * 1.0 + SUM(status = 'Retest') * 0.5 - SUM(status = 'Failed') * 1.5)
            / NULLIF(COUNT(*),1), 2
          ) AS quality_index
        FROM testcase_executions
        ${whereSQL};
        `,
        { replacements: params, type: QueryTypes.SELECT }
      );

      // -------------------------------
      // 🔟 Automation Summary
      // -------------------------------
      const automationStatus = await sequelize.query(
        `
        SELECT status, COUNT(*) AS count
        FROM rapr_test_automation.autotestcaseruns
        WHERE runId = ?
        GROUP BY status
        ORDER BY count DESC;
        `,
        { replacements: [filters.run_id], type: QueryTypes.SELECT }
      );

      const automationCasewise = await sequelize.query(
        `
        SELECT ts_case_id, status, COUNT(*) AS count
        FROM rapr_test_automation.autotestcaseruns
        WHERE runId = ?
        GROUP BY ts_case_id, status
        ORDER BY ts_case_id;
        `,
        { replacements: [filters.run_id], type: QueryTypes.SELECT }
      );

      // -------------------------------
      // ✅ Combined Report
      // -------------------------------
      const report = {
        filtersApplied: filters,
        generatedAt: new Date().toISOString(),
        overall: overall[0] || {},
        dailyTrend: daily,
        testerProductivity: testers,
        environmentSummary: envSummary,
        flakyTests,
        totalRequirements: totalReqs.length,
        rerunSummary: reruns,
        averageDurationSeconds: duration[0]?.avg_duration_sec || 0,
        qualityIndex: qualityIndex[0]?.quality_index || 0,
        automationSummary: {
          overallStatus: automationStatus,
          casewiseStatus: automationCasewise,
        },
      };

      return res.json(report);
    } catch (err) {
      console.error("❌ Error generating summary report:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });
router.get("/test-summary/:projectId/:runId", async (req, res) => {
  try {
    const { projectId, runId } = req.params;

    // -------------------------------
    // Existing 7 queries (unchanged)
    // -------------------------------
    const [summaryRows] = await sequelize.query(`
      SELECT
        r.id AS run_id,
        r.name AS run_name,
        r.projectId,
        COUNT(te.execution_id) AS total_testcases,
        SUM(te.status = 'Passed') AS passed_count,
        SUM(te.status = 'Failed') AS failed_count,
        SUM(te.status = 'Blocked') AS blocked_count,
        SUM(te.status = 'Untested') AS untested_count,
        CONCAT(ROUND((SUM(te.status = 'Passed') / COUNT(*)) * 100, 2), '%') AS pass_rate,
        COUNT(DISTINCT te.bug_ids) AS defects_linked,
        MIN(te.created_at) AS start_time,
        MAX(te.updated_at) AS end_time
      FROM rapr_test_automation.runs r
      JOIN rapr_test_automation.testcase_executions te
        ON te.run_id = r.id AND te.projectId = r.projectId
      WHERE r.projectId = ? AND r.id = ?
      GROUP BY r.id, r.name, r.projectId;
    ` ,{ replacements: [projectId,runId], type: QueryTypes.SELECT }
      );

    const [executionsRows] = await sequelize.query(`
      SELECT 
        te.execution_id,
        r.name AS run_name,
        tc.tc_id,
        tc.ts_id,
        tc.tc_description,
        tc.tc_type,
        te.status,
        te.executed_by,
        te.executed_at,
        te.cycle_number,
        te.env_name,
        te.env_os,
        te.env_browser,
        te.bug_ids,
        te.remarks,
        te.reviewed_by,
        te.approved_by,
        te.created_at,
        te.updated_at
      FROM rapr_test_automation.testcase_executions te
      JOIN rapr_test_automation.testcases tc 
        ON te.testcase_id = tc.tc_sid
      JOIN rapr_test_automation.runs r
        ON te.run_id = r.id
      WHERE te.projectId = ? AND te.run_id = ?
      ORDER BY te.execution_id;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [testersRows] = await sequelize.query(`
      SELECT 
        te.executed_by AS tester,
        COUNT(*) AS total_executed,
        SUM(te.status = 'Passed') AS passed,
        SUM(te.status = 'Failed') AS failed,
        CONCAT(ROUND((SUM(te.status = 'Passed') / COUNT(*)) * 100, 2), '%') AS pass_rate
      FROM rapr_test_automation.testcase_executions te
      WHERE te.projectId = ? AND te.run_id = ?
        AND te.executed_by IS NOT NULL
      GROUP BY te.executed_by
      ORDER BY total_executed DESC;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [traceabilityRows] = await sequelize.query(`
      SELECT 
        tc.tc_id,
        tc.ts_id,
        tc.tc_description,
        tc.tracability AS requirement_id,
        te.status,
        te.bug_ids
      FROM rapr_test_automation.testcase_executions te
      JOIN rapr_test_automation.testcases tc
        ON te.testcase_id = tc.tc_sid
      WHERE te.projectId = ? AND te.run_id = ?;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [defectsRows] = await sequelize.query(`
      SELECT 
        te.execution_id,
        te.bug_ids,
        tc.tc_id,
        tc.tc_description,
        b.bug_id,
        b.priority,
        b.bug_severity,
        b.bug_status,
        b.resolution,
        bf.short_desc,
        bf.comments_noprivate,
        assigned_to_profile.login_name AS assigned_to_name,
        reporter_profile.login_name AS reporter_name,
        DATEDIFF(b.delta_ts, b.creation_ts) AS days_to_resolve
      FROM rapr_test_automation.testcase_executions te
      JOIN rapr_test_automation.testcases tc ON te.testcase_id = tc.tc_sid
      JOIN bugzilla.bugs b ON FIND_IN_SET(b.bug_id, te.bug_ids) > 0
      JOIN bugzilla.bugs_fulltext bf ON b.bug_id = bf.bug_id
      JOIN bugzilla.profiles assigned_to_profile ON b.assigned_to = assigned_to_profile.userid
      JOIN bugzilla.profiles reporter_profile ON b.reporter = reporter_profile.userid
      WHERE te.projectId = ? AND te.run_id = ?
      ORDER BY te.execution_id, b.bug_id;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [environmentsRows] = await sequelize.query(`
      SELECT 
        te.env_name,
        te.env_os,
        te.env_browser,
        COUNT(*) AS total,
        SUM(te.status = 'Passed') AS passed,
        SUM(te.status = 'Failed') AS failed
      FROM rapr_test_automation.testcase_executions te
      WHERE te.projectId = ? AND te.run_id = ?
      GROUP BY te.env_name, te.env_os, te.env_browser;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [trendRows] = await sequelize.query(`
      SELECT 
        DATE(te.executed_at) AS execution_date,
        COUNT(*) AS total_executions,
        SUM(te.status = 'Passed') AS passed,
        SUM(te.status = 'Failed') AS failed
      FROM rapr_test_automation.testcase_executions te
      WHERE te.projectId = ? AND te.run_id = ?
      GROUP BY DATE(te.executed_at)
      ORDER BY execution_date;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    // -------------------------------
    // NEW: KPI / Additional Insights
    // -------------------------------
    const [overallRows] = await sequelize.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(status = 'Passed') AS passed,
        SUM(status = 'Failed') AS failed,
        SUM(status = 'Skipped') AS skipped,
        SUM(status = 'Blocked') AS blocked,
        SUM(status = 'Untested') AS untested,
        SUM(status = 'Retest') AS retest,
        ROUND(100 * SUM(status = 'Passed') / NULLIF(COUNT(*),0), 2) AS pass_rate,
        ROUND(100 * SUM(status = 'Failed') / NULLIF(COUNT(*),0), 2) AS fail_rate
      FROM rapr_test_automation.testcase_executions
      WHERE projectId = ? AND run_id = ?;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [flakyRows] = await sequelize.query(`
      SELECT 
        testcase_id,
        COUNT(DISTINCT status) AS status_variants
      FROM rapr_test_automation.testcase_executions
      WHERE projectId = ? AND run_id = ?
      GROUP BY testcase_id
      HAVING status_variants > 1
      ORDER BY status_variants DESC
      LIMIT 100;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [rerunRows] = await sequelize.query(`
      SELECT 
        testcase_id, 
        COUNT(*) AS exec_count
      FROM rapr_test_automation.testcase_executions
      WHERE projectId = ? AND run_id = ?
      GROUP BY testcase_id
      HAVING exec_count > 1
      ORDER BY exec_count DESC;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    const [automationRows] = await sequelize.query(`
      SELECT status, COUNT(*) AS count
      FROM rapr_test_automation.autotestcaseruns
      WHERE runId = ?
      GROUP BY status
      ORDER BY count DESC;
    `,{ replacements: [runId], type: QueryTypes.SELECT });

    const [qualityRows] = await sequelize.query(`
      SELECT
        ROUND(
          (SUM(status = 'Passed') * 1.0 + SUM(status = 'Retest') * 0.5 - SUM(status = 'Failed') * 1.5)
          / NULLIF(COUNT(*),1), 2
        ) AS quality_index
      FROM rapr_test_automation.testcase_executions
      WHERE projectId = ? AND run_id = ?;
    `,{ replacements: [projectId,runId], type: QueryTypes.SELECT });

    // -------------------------------
    // Excel File Build
    // -------------------------------
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RAPTR Automation QA Report";
    workbook.created = new Date();

    const normalize = (data) =>
      Array.isArray(data) ? data : data ? [data] : [];

    const addSheet = (name, data) => {
      const ws = workbook.addWorksheet(name);
      const rows = normalize(data);

      if (!rows.length) {
        ws.addRow(["No data available"]);
        return;
      }

      const headers = Object.keys(rows[0]);
      ws.addRow(headers);
      rows.forEach((r) => ws.addRow(Object.values(r)));
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };
    };

    // ✅ Keep same format + new KPI sheets
    addSheet("Run Summary", summaryRows);
    addSheet("Executions", executionsRows);
    addSheet("Tester Performance", testersRows);
    addSheet("Traceability Matrix", traceabilityRows);
    addSheet("Defects", defectsRows);
    addSheet("Environments", environmentsRows);
    addSheet("Trend", trendRows);

    // ➕ NEW KPI SHEETS
    addSheet("Overall Summary", overallRows);
    addSheet("Flaky Tests", flakyRows);
    addSheet("Rerun Summary", rerunRows);
    addSheet("Automation Summary", automationRows);
    addSheet("Quality Index", qualityRows);

    // 📤 Download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Test_Report_Project${projectId}_Run${runId}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ Report generation error:", err);
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
});



  return router;
};
