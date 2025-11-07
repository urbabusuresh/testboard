const express = require('express');
const router = express.Router();
const { autoAssignTestCases } = require('../../utils/autoAssign');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const { verifyProjectManagerFromProjectId } = require('../../middleware/verifyEditable')(sequelize);

  /**
   * POST /api/assignments/auto
   * Auto-assign test cases to team members
   * Body: { projectId, caseIds, strategy }
   */
  router.post('/auto', verifySignedIn, verifyProjectManagerFromProjectId, async (req, res) => {
    try {
      const { projectId, caseIds, strategy } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
        return res.status(400).json({ error: 'caseIds must be a non-empty array' });
      }

      const result = await autoAssignTestCases(
        sequelize,
        projectId,
        caseIds,
        strategy || 'least-loaded'
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in auto-assignment endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
