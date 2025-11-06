// routes/executionsRaw.js
const express = require("express");

module.exports = function (sequelize) {
  const router = express.Router();

  // GET /api/executions/raw?executed_by=1&day=2025-09-04&projectId=1&limit=200&offset=0
  router.get("/", async (req, res) => {
    try {
      const { executed_by, day, projectId, limit = 200, offset = 0 } = req.query;

      if (!executed_by) return res.status(400).json({ error: "executed_by is required" });

      const replacements = [];
      let where = "WHERE executed_by = ?";
      replacements.push(executed_by);

      if (projectId) {
        where += " AND projectId = ?";
        replacements.push(projectId);
      }

      if (day) {
        where += " AND DATE(updated_at) = ?";
        replacements.push(day);
      }

      const sql = `
        SELECT
          execution_id, run_id, testcase_id, cycle_number, cycle_type,
          status, include_in_run, test_data, preparation_start, preparation_end,
          prepared_by, executed_by, executed_at, requirement_ids, bug_ids,
          attachment_ids, remarks, reviewed_by, review_date, reviewer_comments,
          approved_by, approved_date, approver_comments, created_at, updated_at,
          env_os, env_browser, env_database, env_name, projectId
        FROM rapr_test_automation.testcase_executions
        ${where}
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?;
      `;
      replacements.push(Number(limit));
      replacements.push(Number(offset));

      const [rows] = await sequelize.query(sql, { replacements });
      // sequelize.query() on some versions returns [rows, meta]; to be safe, if rows is undefined, fetch first element
      const resultRows = Array.isArray(rows) ? rows : (rows && rows.length ? rows : []);

      return res.json(resultRows);
    } catch (err) {
      console.error("Error GET /api/executions/raw:", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
