const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const defineProject = require('../../models/projects');
const { validateRequiredFields, validateProjectData } = require('../../utils/validators');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const Project = defineProject(sequelize, DataTypes);

  router.post('/', verifySignedIn, async (req, res) => {
    try {
      const { name, detail, isPublic } = req.body;
      
      // Validate required fields
      const requiredValidation = validateRequiredFields(req.body, ['name', 'isPublic']);
      if (!requiredValidation.isValid) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields: requiredValidation.missingFields,
        });
      }
      
      // Validate project data
      const dataValidation = validateProjectData({ name, detail, isPublic });
      if (!dataValidation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: dataValidation.errors,
        });
      }
      
      const newProject = await Project.create({
        name,
        detail,
        isPublic,
        userId: req.userId,
      });
      res.json(newProject);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
};
