const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const defineCase = require('../../models/cases');
const { validateRequiredFields, validateTestCaseData } = require('../../utils/validators');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const { verifyProjectDeveloperFromFolderId } = require('../../middleware/verifyEditable')(sequelize);
  const Case = defineCase(sequelize, DataTypes);

  router.post('/', verifySignedIn, verifyProjectDeveloperFromFolderId, async (req, res) => {
    const folderId = req.query.folderId;

    try {
      // Validate required fields
      const requiredValidation = validateRequiredFields(req.body, [
        'title',
        'state',
        'priority',
        'type',
        'automationStatus',
        'template',
      ]);
      if (!requiredValidation.isValid) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields: requiredValidation.missingFields,
        });
      }

      const { title, state, priority, type, automationStatus, description, template, preConditions, expectedResults } =
        req.body;
      
      // Validate test case data
      const dataValidation = validateTestCaseData({
        title,
        state,
        priority,
        type,
        automationStatus,
        template,
        description,
      });
      if (!dataValidation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: dataValidation.errors,
        });
      }

      const newCase = await Case.create({
        title,
        state,
        priority,
        type,
        automationStatus,
        description,
        template,
        preConditions,
        expectedResults,
        folderId,
      });

      res.json(newCase);
    } catch (error) {
      console.error('Error creating new case:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
