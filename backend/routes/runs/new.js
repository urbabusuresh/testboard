const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const defineRun = require('../../models/runs');
const { validateRequiredFields, validateTestRunData } = require('../../utils/validators');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const { verifyProjectReporterFromProjectId } = require('../../middleware/verifyEditable')(sequelize);
  const Run = defineRun(sequelize, DataTypes);

  router.post('/', verifySignedIn, verifyProjectReporterFromProjectId, async (req, res) => {
    try {
      const projectId = req.query.projectId;
      const { name, configurations, description, state } = req.body;
      
      // Validate required fields
      const requiredValidation = validateRequiredFields(req.body, ['name']);
      if (!requiredValidation.isValid || !projectId) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields: !projectId ? [...requiredValidation.missingFields, 'projectId'] : requiredValidation.missingFields,
        });
      }
      
      // Validate test run data
      const dataValidation = validateTestRunData({ name, description, state });
      if (!dataValidation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: dataValidation.errors,
        });
      }

      const newRun = await Run.create({
        name,
        configurations,
        description,
        state,
        projectId,
      });

      res.json(newRun);
    } catch (error) {
      console.error('Error creating new run:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
