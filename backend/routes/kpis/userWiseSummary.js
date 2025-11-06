// routes/executionsUserSummaryOnly.fixed.js
const express = require("express");
const { QueryTypes } = require("sequelize");

module.exports = function (sequelize) {
  const router = express.Router();

  function buildBaseWhere(q) {
    const whereClauses = [];
    const params = [];

    if (q.projectId) { whereClauses.push("projectId = ?"); params.push(q.projectId); }
    if (q.run_id) { whereClauses.push("run_id = ?"); params.push(q.run_id); }
    if (q.testcase_id) { whereClauses.push("testcase_id = ?"); params.push(q.testcase_id); }
    if (q.cycle_type) { whereClauses.push("cycle_type = ?"); params.push(q.cycle_type); }
    if (q.env_name) { whereClauses.push("env_name = ?"); params.push(q.env_name); }
    if (q.executed_by) { whereClauses.push("executed_by = ?"); params.push(q.executed_by); }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";
    return { whereSQL, params };
  }

  const toNum = (v, fallback = 0) => {
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  function formatDateYMD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  router.get("/", async (req, res) => {
    try {
      const { fromDate: qFrom, toDate: qTo, compareDays: qCompareDays, ...filters } = req.query;

      const now = new Date();
      const compareDays = Math.max(1, parseInt(qCompareDays || "7", 10));
      let currentFrom, currentTo, prevFrom, prevTo;

      if (qFrom && qTo) {
        const cf = new Date(qFrom);
        const ct = new Date(qTo);
        if (Number.isNaN(cf.getTime()) || Number.isNaN(ct.getTime()) || cf > ct) {
          return res.status(400).json({ error: "Invalid fromDate/toDate range" });
        }
        currentFrom = formatDateYMD(cf);
        currentTo = formatDateYMD(ct);

        // previous window equal-length immediately before currentFrom
        const days = Math.floor((new Date(currentTo).getTime() - new Date(currentFrom).getTime()) / (24 * 3600 * 1000)) + 1;
        const prevCt = new Date(new Date(currentFrom).getTime() - 24 * 3600 * 1000);
        const prevCf = new Date(prevCt.getTime() - (days - 1) * 24 * 3600 * 1000);
        prevFrom = formatDateYMD(prevCf);
        prevTo = formatDateYMD(prevCt);
      } else {
        const ct = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // today midnight
        const cf = new Date(ct.getTime() - (compareDays - 1) * 24 * 3600 * 1000);
        currentFrom = formatDateYMD(cf);
        currentTo = formatDateYMD(ct);
        const prevCtDate = new Date(cf.getTime() - 24 * 3600 * 1000);
        const prevCfDate = new Date(prevCtDate.getTime() - (compareDays - 1) * 24 * 3600 * 1000);
        prevFrom = formatDateYMD(prevCfDate);
        prevTo = formatDateYMD(prevCtDate);
      }

      // Build base where (excluding date)
      const { whereSQL: baseWhereSQL, params: baseParams } = buildBaseWhere(filters);

      // CTE-based query (execs_curr / execs_prev used once each)
      const userCompareQ = `
      WITH execs_curr AS (
        SELECT *
        FROM rapr_test_automation.testcase_executions
        ${baseWhereSQL ? baseWhereSQL + " AND " : "WHERE "}
          DATE(updated_at) BETWEEN ? AND ?
      ),
      execs_prev AS (
        SELECT *
        FROM rapr_test_automation.testcase_executions
        ${baseWhereSQL ? baseWhereSQL + " AND " : "WHERE "}
          DATE(updated_at) BETWEEN ? AND ?
      ),

      per_user_curr AS (
        SELECT
          COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by,
          COUNT(*) AS total_executions,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed,
          SUM(status = 'Skipped') AS skipped,
          SUM(status = 'Untested') AS untested,
          SUM(status = 'Retest') AS retest,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Blocked') AS blocked,
          SUM(include_in_run = 1) AS included_in_run,
          COUNT(DISTINCT testcase_id) AS distinct_testcases,
          COUNT(DISTINCT run_id) AS test_runs,
          AVG(TIMESTAMPDIFF(SECOND, COALESCE(preparation_start, executed_at), COALESCE(executed_at, preparation_end))) AS avg_duration_seconds
        FROM execs_curr
        GROUP BY executed_by
      ),

      per_user_prev AS (
        SELECT
          COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by,
          COUNT(*) AS total_executions,
          SUM(status = 'Passed') AS passed,
          SUM(status = 'Failed') AS failed,
          SUM(status = 'Skipped') AS skipped,
          SUM(status = 'Untested') AS untested,
          SUM(status = 'Retest') AS retest,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Blocked') AS blocked,
          SUM(include_in_run = 1) AS included_in_run,
          COUNT(DISTINCT testcase_id) AS distinct_testcases,
          COUNT(DISTINCT run_id) AS test_runs,
          AVG(TIMESTAMPDIFF(SECOND, COALESCE(preparation_start, executed_at), COALESCE(executed_at, preparation_end))) AS avg_duration_seconds
        FROM execs_prev
        GROUP BY executed_by
      ),

      reruns_curr AS (
        SELECT executed_by_key AS executed_by, SUM(cnt - 1) AS reruns
        FROM (
          SELECT COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by_key, run_id, testcase_id, COUNT(*) AS cnt
          FROM execs_curr
          GROUP BY executed_by_key, run_id, testcase_id
          HAVING COUNT(*) > 1
        ) t
        GROUP BY executed_by_key
      ),

      reruns_prev AS (
        SELECT executed_by_key AS executed_by, SUM(cnt - 1) AS reruns
        FROM (
          SELECT COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by_key, run_id, testcase_id, COUNT(*) AS cnt
          FROM execs_prev
          GROUP BY executed_by_key, run_id, testcase_id
          HAVING COUNT(*) > 1
        ) t
        GROUP BY executed_by_key
      ),

      flaky_curr AS (
        SELECT executed_by_key AS executed_by, COUNT(*) AS flaky_count
        FROM (
          SELECT COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by_key, testcase_id, COUNT(DISTINCT status) AS status_variants
          FROM execs_curr
          GROUP BY executed_by_key, testcase_id
          HAVING COUNT(DISTINCT status) > 1
        ) t
        GROUP BY executed_by_key
      ),

      flaky_prev AS (
        SELECT executed_by_key AS executed_by, COUNT(*) AS flaky_count
        FROM (
          SELECT COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by_key, testcase_id, COUNT(DISTINCT status) AS status_variants
          FROM execs_prev
          GROUP BY executed_by_key, testcase_id
          HAVING COUNT(DISTINCT status) > 1
        ) t
        GROUP BY executed_by_key
      )

      -- Left join current to previous (users in current window)
      SELECT
        COALESCE(pc.executed_by, pp.executed_by) AS executed_by,
        COALESCE(pc.total_executions,0) AS total_executions,
        COALESCE(pc.passed,0) AS passed,
        COALESCE(pc.failed,0) AS failed,
        COALESCE(pc.skipped,0) AS skipped,
        COALESCE(pc.untested,0) AS untested,
        COALESCE(pc.retest,0) AS retest,
        COALESCE(pc.in_progress,0) AS in_progress,
        COALESCE(pc.blocked,0) AS blocked,
        COALESCE(pc.included_in_run,0) AS included_in_run,
        COALESCE(pc.distinct_testcases,0) AS distinct_testcases,
        COALESCE(pc.test_runs,0) AS test_runs,
        COALESCE(rc.reruns,0) AS reruns,
        COALESCE(fc.flaky_count,0) AS flaky_count,
        COALESCE(pc.avg_duration_seconds, NULL) AS avg_duration_seconds,
        CASE WHEN COALESCE(pc.total_executions,0) > 0 THEN ROUND(COALESCE(pc.passed,0)/GREATEST(pc.total_executions,1)*100,2) ELSE 0 END AS passPercent,
        COALESCE(pp.total_executions,0) AS total_executions_prev,
        COALESCE(pp.passed,0) AS passed_prev,
        COALESCE(pp.failed,0) AS failed_prev,
        COALESCE(pp.skipped,0) AS skipped_prev,
        COALESCE(pp.untested,0) AS untested_prev,
        COALESCE(pp.retest,0) AS retest_prev,
        COALESCE(pp.in_progress,0) AS in_progress_prev,
        COALESCE(pp.blocked,0) AS blocked_prev,
        COALESCE(pp.included_in_run,0) AS included_in_run_prev,
        COALESCE(pp.distinct_testcases,0) AS distinct_testcases_prev,
        COALESCE(pp.test_runs,0) AS test_runs_prev,
        COALESCE(rp.reruns,0) AS reruns_prev,
        COALESCE(fp.flaky_count,0) AS flaky_count_prev,
        COALESCE(pp.avg_duration_seconds, NULL) AS avg_duration_seconds_prev,
        CASE WHEN COALESCE(pp.total_executions,0) > 0 THEN ROUND(COALESCE(pp.passed,0)/GREATEST(pp.total_executions,1)*100,2) ELSE 0 END AS passPercent_prev
      FROM per_user_curr pc
      LEFT JOIN per_user_prev pp ON pc.executed_by = pp.executed_by
      LEFT JOIN reruns_curr rc ON rc.executed_by = pc.executed_by
      LEFT JOIN reruns_prev rp ON rp.executed_by = pp.executed_by
      LEFT JOIN flaky_curr fc ON fc.executed_by = pc.executed_by
      LEFT JOIN flaky_prev fp ON fp.executed_by = pp.executed_by

      UNION

      -- Users only in previous window (not in current)
      SELECT
        COALESCE(pc.executed_by, pp.executed_by) AS executed_by,
        COALESCE(pc.total_executions,0) AS total_executions,
        COALESCE(pc.passed,0) AS passed,
        COALESCE(pc.failed,0) AS failed,
        COALESCE(pc.skipped,0) AS skipped,
        COALESCE(pc.untested,0) AS untested,
        COALESCE(pc.retest,0) AS retest,
        COALESCE(pc.in_progress,0) AS in_progress,
        COALESCE(pc.blocked,0) AS blocked,
        COALESCE(pc.included_in_run,0) AS included_in_run,
        COALESCE(pc.distinct_testcases,0) AS distinct_testcases,
        COALESCE(pc.test_runs,0) AS test_runs,
        COALESCE(rc.reruns,0) AS reruns,
        COALESCE(fc.flaky_count,0) AS flaky_count,
        COALESCE(pc.avg_duration_seconds, NULL) AS avg_duration_seconds,
        CASE WHEN COALESCE(pc.total_executions,0) > 0 THEN ROUND(COALESCE(pc.passed,0)/GREATEST(pc.total_executions,1)*100,2) ELSE 0 END AS passPercent,
        COALESCE(pp.total_executions,0) AS total_executions_prev,
        COALESCE(pp.passed,0) AS passed_prev,
        COALESCE(pp.failed,0) AS failed_prev,
        COALESCE(pp.skipped,0) AS skipped_prev,
        COALESCE(pp.untested,0) AS untested_prev,
        COALESCE(pp.retest,0) AS retest_prev,
        COALESCE(pp.in_progress,0) AS in_progress_prev,
        COALESCE(pp.blocked,0) AS blocked_prev,
        COALESCE(pp.included_in_run,0) AS included_in_run_prev,
        COALESCE(pp.distinct_testcases,0) AS distinct_testcases_prev,
        COALESCE(pp.test_runs,0) AS test_runs_prev,
        COALESCE(rp.reruns,0) AS reruns_prev,
        COALESCE(fp.flaky_count,0) AS flaky_count_prev,
        COALESCE(pp.avg_duration_seconds, NULL) AS avg_duration_seconds_prev,
        CASE WHEN COALESCE(pp.total_executions,0) > 0 THEN ROUND(COALESCE(pp.passed,0)/GREATEST(pp.total_executions,1)*100,2) ELSE 0 END AS passPercent_prev
      FROM per_user_prev pp
      LEFT JOIN per_user_curr pc ON pp.executed_by = pc.executed_by
      LEFT JOIN reruns_curr rc ON rc.executed_by = pc.executed_by
      LEFT JOIN reruns_prev rp ON rp.executed_by = pp.executed_by
      LEFT JOIN flaky_curr fc ON fc.executed_by = pc.executed_by
      LEFT JOIN flaky_prev fp ON fp.executed_by = pp.executed_by
      WHERE pc.executed_by IS NULL
      ORDER BY total_executions DESC;
      `;

      // daily time-series for current window
      const userDailyQ = `
      SELECT
        DATE(updated_at) AS day,
        COALESCE(CAST(executed_by AS CHAR), 'UNASSIGNED') AS executed_by,
        COUNT(*) AS total_executions,
        SUM(status = 'Passed') AS passed,
        SUM(status = 'Failed') AS failed,
        SUM(status = 'Skipped') AS skipped,
        SUM(status = 'Untested') AS untested,
        SUM(status = 'Retest') AS retest,
        SUM(status = 'In Progress') AS in_progress,
        SUM(status = 'Blocked') AS blocked,
        SUM(include_in_run = 1) AS included_in_run,
        COUNT(DISTINCT testcase_id) AS distinct_testcases,
        COUNT(DISTINCT run_id) AS test_runs
      FROM rapr_test_automation.testcase_executions
      ${baseWhereSQL ? baseWhereSQL + " AND " : "WHERE "}
        DATE(updated_at) BETWEEN ? AND ?
      GROUP BY day, executed_by
      ORDER BY day DESC, executed_by;
      `;

      // replacements: for userCompareQ we need baseParams then currentFrom/currentTo (for execs_curr),
      // then baseParams then prevFrom/prevTo (for execs_prev)
      // That ordering matches the two uses of baseWhereSQL in execs_curr and execs_prev.
      const replacementsForCompare = [
        ...baseParams, currentFrom, currentTo,
        ...baseParams, prevFrom, prevTo
      ];

      const replacementsForDaily = [...baseParams, currentFrom, currentTo];

      const userCompareRows = await sequelize.query(userCompareQ, { replacements: replacementsForCompare, type: QueryTypes.SELECT });
      const userDailyRows = await sequelize.query(userDailyQ, { replacements: replacementsForDaily, type: QueryTypes.SELECT });

      // compute percent change helper
      const computeChange = (curr, prev) => {
        if (prev === 0) {
          if (curr === 0) return 0;
          return null;
        }
        return Math.round(((curr - prev) / prev) * 10000) / 100;
      };

      const userSummary = (userCompareRows || []).map((r) => {
        const total_executions = toNum(r.total_executions, 0);
        const total_executions_prev = toNum(r.total_executions_prev, 0);
        const passed = toNum(r.passed, 0);
        const passed_prev = toNum(r.passed_prev, 0);
        const passPercent = toNum(r.passPercent, 0);
        const passPercent_prev = toNum(r.passPercent_prev, 0);

        return {
          executed_by: r.executed_by,
          total_executions,
          passed,
          failed: toNum(r.failed, 0),
          skipped: toNum(r.skipped, 0),
          untested: toNum(r.untested, 0),
          retest: toNum(r.retest, 0),
          in_progress: toNum(r.in_progress, 0),
          blocked: toNum(r.blocked, 0),
          included_in_run: toNum(r.included_in_run, 0),
          distinct_testcases: toNum(r.distinct_testcases, 0),
          test_runs: toNum(r.test_runs, 0),
          reruns: toNum(r.reruns, 0),
          flaky_count: toNum(r.flaky_count, 0),
          avg_duration_seconds: r.avg_duration_seconds === null ? null : Number(r.avg_duration_seconds),
          passPercent,

          // previous
          total_executions_prev,
          passed_prev,
          failed_prev: toNum(r.failed_prev, 0),
          skipped_prev: toNum(r.skipped_prev, 0),
          untested_prev: toNum(r.untested_prev, 0),
          retest_prev: toNum(r.retest_prev, 0),
          in_progress_prev: toNum(r.in_progress_prev, 0),
          blocked_prev: toNum(r.blocked_prev, 0),
          included_in_run_prev: toNum(r.included_in_run_prev, 0),
          distinct_testcases_prev: toNum(r.distinct_testcases_prev, 0),
          test_runs_prev: toNum(r.test_runs_prev, 0),
          reruns_prev: toNum(r.reruns_prev, 0),
          flaky_count_prev: toNum(r.flaky_count_prev, 0),
          avg_duration_seconds_prev: r.avg_duration_seconds_prev === null ? null : Number(r.avg_duration_seconds_prev),
          passPercent_prev,

          // derived
          total_executions_change_pct: computeChange(total_executions, total_executions_prev),
          passed_change_pct: computeChange(passed, passed_prev),
          passPercent_change_pct: computeChange(passPercent, passPercent_prev),
          reruns_change_pct: computeChange(toNum(r.reruns,0), toNum(r.reruns_prev,0)),
          flaky_change_pct: computeChange(toNum(r.flaky_count,0), toNum(r.flaky_count_prev,0)),
        };
      });

      const result = {
        currentWindow: { from: currentFrom, to: currentTo },
        previousWindow: { from: prevFrom, to: prevTo },
        compareDays,
        userSummary,
        userDaily: userDailyRows,
        generatedAt: new Date().toISOString(),
      };

      return res.json(result);
    } catch (err) {
      console.error("Error GET /api/executions/user-summary-only (fixed):", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
