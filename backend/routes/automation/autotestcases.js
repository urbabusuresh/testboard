// routes/automation/autotestcases.js
const express = require("express");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { DataTypes } = require('sequelize');
const defineRun = require('../../models/runs');
const TESTS_PATH = process.env.TESTS_PATH || "../PyTestOne/Tests";

module.exports = function (sequelize) {
  const router = express.Router();
  const Run = defineRun(sequelize, DataTypes);
  // ✅ get initialized model from sequelize
  const { AutoTestCase } = sequelize.models;

  /** Sync a module's .py files into autotestcases (optional utility) */
  router.post("/sync", async (req, res) => {
    try {
      const { module,projectId } = req.body;
      if (!module) return res.status(400).json({ error: "module required" });

      const moduleDir = path.join(TESTS_PATH, module);
      if (!fs.existsSync(moduleDir)) {
        return res.status(404).json({ error: "module folder not found" });
      }

      const files = fs.readdirSync(moduleDir).filter((f) => f.endsWith(".py") && /(^test_|_test_|_test\.py$)/i.test(f));
      // upsert/create any new files
      for (const f of files) {
        await AutoTestCase.findOrCreate({
          where: { module, testfilename: f },
          defaults: { module, testfilename: f,status: 1 ,projectid:projectId},
        });
      }

      // deactivate removed, activate existing
      await AutoTestCase.update(
        { status: 0 },
        { where: { module, testfilename: { [Op.notIn]: files } } }
      );
      await AutoTestCase.update(
        { status: 1 },
        { where: { module, testfilename: { [Op.in]: files } } }
      );

      res.json({ module, files });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** List unique modules from catalog */
  router.get("/modules", async (_req, res) => {
    try {
      const rows = await AutoTestCase.findAll({
        attributes: ["module"],
        group: ["module"],
        order: [["module", "ASC"]],
      });
      res.json({ modules: rows.map((r) => r.get("module")) });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** List cases for a module */
 router.get('/project/:projectId/modules', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project Id required' });
    }

    const sql = `
      SELECT module 
      FROM testmodules 
      WHERE automation = 1 AND projectId = ?;
    `;

    const rows = await sequelize.query(sql, {
      replacements: [Number(projectId)],
      type: sequelize.QueryTypes.SELECT,
    });

    // rows is an array of plain objects like: [{ module: 'xyz' }]
    res.json({ modules: rows.map(r => r.module) });
  } catch (err) {
    console.error('project/:projectId/modules:', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});



  /** List unique modules from catalog */
  router.get("/modules/:projectId", async (req, res) => {
    try {
      const rows = await AutoTestCase.findAll({
        where: { projectid: req.params.projectId },
        attributes: ["module"],
        group: ["module"],
        order: [["module", "ASC"]],
      });
      res.json({ modules: rows.map((r) => r.get("module")) });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });
  /** List cases for a module */
  router.get("/project/:projectId/modules/:module/cases", async (req, res) => {
    try {
    
      const rows = await AutoTestCase.findAll({
        where: { module: req.params.module, status: 1 ,projectid:req.params.projectId},
        order: [["testfilename", "ASC"]],
      });
      res.json({
        cases: rows.map((r) => ({
          ts_id: r.get("ts_id"),
          tsc_id: r.get("tsc_id"),
          module: r.get("module"),
          testfilename: r.get("testfilename"),
          description: r.get("description"),
          tc_id: r.get("tc_id"),
          autc_id: r.get("autc_id"),
          created_by: r.get("created_by"),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** List cases for a module */
  router.get("/project/:projectId/modules/:module/testcaseid/:caseid", async (req, res) => {
    try {
    
      const rows = await AutoTestCase.findAll({
        where: { module: req.params.module, tc_id: req.params.caseid, status: 1 ,projectid:req.params.projectId},
        order: [["testfilename", "ASC"]],
      });
      res.json({
        cases: rows.map((r) => ({
          ts_id: r.get("ts_id"),
          tsc_id: r.get("tsc_id"),
          module: r.get("module"),
          testfilename: r.get("testfilename"),
          description: r.get("description"),
          tc_id: r.get("tc_id"),
          autc_id: r.get("autc_id"),
          created_by: r.get("created_by"),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });
  
  /** List cases for a module */
  router.get("/project/:projectId/modules/:module/casesByRunId/:runId", async (req, res) => {
    try {
      const  runId  = req.params.runId;
      const runIdCheck = Number(runId);
      const validRunId = !isNaN(runIdCheck) && runIdCheck > 0 ? runIdCheck : null;
      
      if (!validRunId) {
        return res.status(400).json({ error: "runId must be a positive number" });
      }
      let   testcase_ids;
      if(validRunId)
       {
const runs = await Run.findAll({
        where: {
          projectId: req.params.projectId,
          id: validRunId,
        },
      });
      if(runs.length==0)
      {
        return res.status(400).json({ error: "runId not found" });
      }
       testcase_ids = runs[0].tc_id.split(',');
       }
       
      const rows = await AutoTestCase.findAll({
        where: { module: req.params.module, status: 1 ,projectid:req.params.projectId,tc_id:{[Op.in]:testcase_ids}},
        order: [["testfilename", "ASC"]],
      });
      res.json({
        cases: rows.map((r) => ({
          ts_id: r.get("ts_id"),
          tsc_id: r.get("tsc_id"),
          module: r.get("module"),
          testfilename: r.get("testfilename"),
          description: r.get("description"),
          tc_id: r.get("tc_id"),
          autc_id: r.get("autc_id"),
          created_by: r.get("created_by"),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** Create testcase */
  router.post("/", async (req, res) => {
    try {
      const { module, testfilename, testdata, status = 1, created_by = null } =
        req.body;
      if (!module || !testfilename) {
        return res
          .status(400)
          .json({ error: "module and testfilename required" });
      }
      const row = await AutoTestCase.create({
        projectid,
        module,
        testfilename,
        testdata,
        status,
        created_by,
      });
      res.json({ testcase: row });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** Update testcase */
  router.patch("/:ts_id", async (req, res) => {
    try {
      const row = await AutoTestCase.findByPk(req.params.ts_id);
      if (!row) return res.status(404).json({ error: "not found" });
      await row.update(req.body);
      res.json({ testcase: row });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** Soft delete testcase */
  router.delete("/:ts_id", async (req, res) => {
    try {
      const row = await AutoTestCase.findByPk(req.params.ts_id);
      if (!row) return res.status(404).json({ error: "not found" });
      await row.update({ status: 0 });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
