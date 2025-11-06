// routes/automation/autotestcasegroups.js  (PURE CommonJS, factory)

const express = require("express");

module.exports = function (sequelize) {
  const router = express.Router();

  // ✅ Use initialized models from Sequelize
  const { AutoTestGroup, AutoTestCase } = sequelize.models;

  /** Create group with inline ts_ids JSON */
  router.post("/", async (req, res) => {
    try {
      const {
        group_name,
        ts_ids = [],
        testdataPath = null,
        created_by = null,
        status = 1,
      } = req.body;

      if (!group_name) return res.status(400).json({ error: "group_name required" });
      if (!Array.isArray(ts_ids)) return res.status(400).json({ error: "ts_ids must be array" });

      const row = await AutoTestGroup.create({
        group_name,
        ts_ids,
        testdataPath,
        created_by,
        status,
      });

      res.json({ group: row });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** List groups */
  router.get("/", async (_req, res) => {
    try {
      const groups = await AutoTestGroup.findAll({ order: [["group_name", "ASC"]] });
      res.json({ groups });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** Get one group */
  router.get("/:id", async (req, res) => {
    try {
      const row = await AutoTestGroup.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: "not found" });
      res.json({ group: row });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** Update group */
  router.patch("/:id", async (req, res) => {
    try {
      const row = await AutoTestGroup.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: "not found" });

      const next = req.body;
      if (next.ts_ids && !Array.isArray(next.ts_ids)) {
        return res.status(400).json({ error: "ts_ids must be array" });
      }

      await row.update(next);
      res.json({ group: row });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /** Resolve group -> concrete cases */
  router.get("/:id/cases", async (req, res) => {
    try {
      const row = await AutoTestGroup.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: "not found" });

      const ids = Array.isArray(row.get("ts_ids")) ? row.get("ts_ids") : [];
      const caseRows = ids.length
        ? await AutoTestCase.findAll({ where: { ts_id: ids } })
        : [];

      const cases = caseRows.map((r) => ({
        ts_id: r.get("ts_id"),
        module: r.get("module"),
        testfilename: r.get("testfilename"),
      }));

      res.json({ cases });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
