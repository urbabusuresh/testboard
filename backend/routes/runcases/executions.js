const express = require("express");
const defineTestCaseExecution = require("../../models/testCaseExecution");
const { DataTypes } = require('sequelize');
module.exports = function (sequelize) {
  const router = express.Router();
   const TestCaseExecution = defineTestCaseExecution(sequelize, DataTypes);

  /**
   * 🔹 Upsert (Insert or Update)
   */
  router.post("/upsert", async (req, res) => {
    try {
      const { execution_id, projectId,run_id, cycle_number,testcase_id,cycle_type,status,execution_state } = req.body;
      
       let existing =null;
     
         
        existing = await TestCaseExecution.findOne({
        where: {  run_id, cycle_number ,testcase_id,cycle_type,projectId },
      });
      
      if (existing) {
        await existing.update(req.body);
        return res.json({
          message: "✅ TestCaseExecution updated successfully",
          execution_id,
        });
      } else {
        const payload = { ...req.body };

    // 🚨 if execution_id is blank or falsy, drop it
    if (!payload.execution_id || payload.execution_id === 0) {
      delete payload.execution_id;
    }
        await TestCaseExecution.create(payload);
        return res.json({
          message: "✅ TestCaseExecution inserted successfully",
          execution_id,
        });
      }
    } catch (err) {
      console.error("Error in UPSERT /executions:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Update by execution_id
   */
  router.put("/:execution_id", async (req, res) => {
    try {
      const { execution_id } = req.params;
      const existing = await TestCaseExecution.findOne({ where: { execution_id } });

      if (!existing) {
        return res.status(404).json({ message: "Execution not found" });
      }

      await existing.update(req.body);

      res.json({
        message: "✅ TestCaseExecution updated successfully",
        execution_id,
      });
    } catch (err) {
      console.error("Error updating TestCaseExecution:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Delete by execution_id
   */
  router.delete("/:execution_id", async (req, res) => {
    try {
      const { execution_id } = req.params;
      const deleted = await TestCaseExecution.destroy({ where: { execution_id } });

      if (!deleted) {
        return res.status(404).json({ message: "Execution not found" });
      }

      res.json({
        message: "🗑️ TestCaseExecution deleted successfully",
        execution_id,
      });
    } catch (err) {
      console.error("Error deleting TestCaseExecution:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  
   /**
   * 🔹 Get executions with filters, pagination, sorting
   */
  router.get("/", async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "execution_id",
        sortOrder = "ASC",

        ...filters
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // ✅ Apply filters dynamically
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.cycle_number) {
        where.cycle_number = filters.cycle_number;
      }
      if (filters.run_id) {
        where.run_id = filters.run_id;
      }
      if (filters.testcase_id) {
        where.testcase_id = filters.testcase_id;
      }
      if (filters.reviewed_by) {
        where.reviewed_by = filters.reviewed_by;
      }
      if (filters.approved_by) {
        where.approved_by = filters.approved_by;
      }
      if (filters.execution_state && filters.execution_state!=undefined &&filters.execution_state>-5) {
        where.execution_state = filters.execution_state;
      }

      // ✅ Date filters
      if (filters.fromDate && filters.toDate) {
        where.executed_at = {
          [Op.between]: [new Date(filters.fromDate), new Date(filters.toDate)],
        };
      } else if (filters.fromDate) {
        where.executed_at = { [Op.gte]: new Date(filters.fromDate) };
      } else if (filters.toDate) {
        where.executed_at = { [Op.lte]: new Date(filters.toDate) };
      }

      // ✅ Query DB
      const { rows, count } = await TestCaseExecution.findAndCountAll({
        where,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: +limit,
        offset: +offset,
      });

      res.json({
        page: +page,
        limit: +limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
        data: rows,
      });
    } catch (err) {
      console.error("Error in GET /executions:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Get by execution_id
   */
  router.get("/:execution_id", async (req, res) => {
    try {
      const { execution_id } = req.params;
      const execution = await TestCaseExecution.findAll({ where: { execution_id } });

      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }

      res.json(execution);
    } catch (err) {
      console.error("Error reading by execution_id:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Get by execution_id
   */
  router.get("/run/:run_id", async (req, res) => {
    try {
      const { run_id } = req.params;
      const execution = await TestCaseExecution.findOne({ where: { run_id } });

      if (!execution) {
        return res.status(404).json({ message: "Execution Runs not found" });
      }

      res.json(execution);
    } catch (err) {
      console.error("Error reading by run_id:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Get all by testcase_id
   */
  router.get("/testcase/:testcase_id", async (req, res) => {
    try {
      const { testcase_id } = req.params;
      const executions = await TestCaseExecution.findAll({
        where: { testcase_id },
      });

      res.json(executions);
    } catch (err) {
      console.error("Error reading by testcase_id:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  /**
   * 🔹 Get all by testcase_id + run_id
   */
  router.get("/testcase/:testcase_id/build/:run_id", async (req, res) => {
    try {
      const { testcase_id, run_id } = req.params;
      const executions = await TestCaseExecution.findAll({
        where: { testcase_id, run_id },
      });

      res.json(executions);
    } catch (err) {
      console.error("Error reading by testcase_id & run_id:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
};
