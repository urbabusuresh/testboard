// routes/automation/autotestruns.js  (PURE CommonJS, factory style)

const express = require("express");
const { Op } = require("sequelize");
const { startRun } = require("./service/runner");
const { Scheduler } = require("./service/scheduler");

module.exports = function (sequelize) {
  const router = express.Router();
  const scheduler = new Scheduler();

  // ✅ Use initialized models from Sequelize
  const { AutoTestRun, AutoTestCase, AutoTestGroup } = sequelize.models;

  /** Immediate run (single testcase OR group) */
  router.post("/", async (req, res) => {
    try {
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
    runId,
    projectid,
  } = req.body 
      const result = await startRun(req.body);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  /** Schedule a run and persist */
  router.post("/schedule", async (req, res) => {
    try {
      const {
        ts_schedule_time,
        ts_repeated = "N",
        ts_buildname,
        ts_description = null,
        ts_env = "sit",
        ts_browser = "chrome",
        testdataPath = null,
        ts_case_id = null,
        test_group_id = null,
        runId=null,
        projectid,
      } = req.body;

      if (!ts_schedule_time)
        return res.status(400).json({ error: "ts_schedule_time required" });
      if (!ts_buildname)
        return res.status(400).json({ error: "ts_buildname required" });
      if (!ts_case_id && !test_group_id)
        return res
          .status(400)
          .json({ error: "ts_case_id or test_group_id required" });

      const row = await AutoTestRun.create({
        ts_type: "scheduled",
        ts_repeated,
        ts_schedule_time: new Date(ts_schedule_time),
        ts_buildname,
        ts_description,
        ts_env,
        ts_browser,
        testdataPath,
        ts_case_id,
        test_group_id,
        status: "queued",
        runId,
        projectid
      });

      const jobId = scheduler.add(row);
      res.json({ testrunid: row.get("testrunid"), jobId });
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  /** List runs */
  router.get("/", async (req, res) => {
    try {
      const { status, limit = 50 ,projectid,runId,caseId,queryType} = req.query;
      const where = {};
      if (status) where.status = { [Op.eq]: status };
      if (projectid) where.projectid = { [Op.eq]: projectid };
      if (runId && runId !== 'null' && runId !== null && runId !== undefined && runId !== '' ) where.runId = { [Op.eq]: runId };
     
      const rows = await AutoTestRun.findAll({
        where,
        order: [["created_at", "DESC"]],
        limit: Number(limit),
      });

      res.json({ runs: rows });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  
  /** List runs */
  router.get("/byTestCases", async (req, res) => {
    try {
      const { status, limit = 50 ,projectid,runId,caseId,queryType} = req.query;
      const where = {};
      if (status) where.status = { [Op.eq]: status };
      if (projectid) where.projectid = { [Op.eq]: projectid };
      if (runId && runId !== 'null' && runId !== null && runId !== undefined && runId !== '' ) where.runId = { [Op.eq]: runId };
      if (caseId && caseId !== 'null' && caseId !== null && caseId !== undefined && caseId !== ''&& queryType=='byCase' ) where.ts_case_id = { [Op.eq]: runId };
      
      // SELECT * FROM rapr_test_automation.autotestcaseruns where ts_case_id IN (SELECT ts_id FROM rapr_test_automation.autotestcases where projectid = 1 and tc_id='TCS_1480') 
      
      const rows = await AutoTestRun.findAll({
        where,
        order: [["created_at", "DESC"]],
        limit: Number(limit),
      });

      res.json({ runs: rows });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  /** One run */
  router.get("/:id", async (req, res) => {
    try {
      const row = await AutoTestRun.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: "not found" });
      res.json({ run: row });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  /** Cancel a scheduled run (if scheduled) */
  router.delete("/:id/schedule", async (req, res) => {
    try {
      scheduler.remove(Number(req.params.id));
      await AutoTestRun.update(
        { status: "inactive" },
        { where: { testrunid: req.params.id, ts_type: "scheduled" } }
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  return router;
};
