const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const defineCase = require('../../models/cases');
const defineUser = require('../../models/users');
const defineFolder = require('../../models/folders');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const { verifyProjectViewerFromProjectId } = require('../../middleware/verifyVisible')(sequelize);
  const Case = defineCase(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);

  /**
   * GET /kanban?projectId=<id>
   * Get test cases organized by workflow status for Kanban board
   */
  router.get('/', verifySignedIn, verifyProjectViewerFromProjectId, async (req, res) => {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      // Get all folders for the project
      const folders = await Folder.findAll({
        where: { projectId },
        attributes: ['id'],
      });

      const folderIds = folders.map(f => f.id);

      // Get all cases for these folders with assignee information
      const cases = await Case.findAll({
        where: {
          folderId: folderIds,
        },
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: Folder,
            attributes: ['id', 'name'],
          },
        ],
        order: [['priority', 'DESC'], ['updatedAt', 'DESC']],
      });

      // Organize cases by workflow status
      const kanbanData = {
        draft: [],
        ready: [],
        'in-progress': [],
        review: [],
        completed: [],
      };

      cases.forEach(testCase => {
        const status = testCase.workflowStatus || 'draft';
        if (kanbanData[status]) {
          kanbanData[status].push(testCase);
        } else {
          kanbanData.draft.push(testCase);
        }
      });

      res.json({
        projectId,
        columns: kanbanData,
        totalCases: cases.length,
      });
    } catch (error) {
      console.error('Error fetching kanban data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /kanban/:caseId/status
   * Update workflow status of a test case (for drag-and-drop)
   */
  router.put('/:caseId/status', verifySignedIn, async (req, res) => {
    try {
      const { caseId } = req.params;
      const { workflowStatus } = req.body;

      const allowedStatuses = ['draft', 'ready', 'in-progress', 'review', 'completed'];
      
      if (!workflowStatus || !allowedStatuses.includes(workflowStatus)) {
        return res.status(400).json({
          error: 'Invalid workflow status',
          allowedStatuses,
        });
      }

      const testCase = await Case.findByPk(caseId);
      
      if (!testCase) {
        return res.status(404).json({ error: 'Test case not found' });
      }

      testCase.workflowStatus = workflowStatus;
      await testCase.save();

      res.json({
        id: testCase.id,
        workflowStatus: testCase.workflowStatus,
        message: 'Workflow status updated successfully',
      });
    } catch (error) {
      console.error('Error updating workflow status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /kanban/:caseId/assign
   * Assign a test case to a user
   */
  router.put('/:caseId/assign', verifySignedIn, async (req, res) => {
    try {
      const { caseId } = req.params;
      const { assignedTo } = req.body;

      const testCase = await Case.findByPk(caseId);
      
      if (!testCase) {
        return res.status(404).json({ error: 'Test case not found' });
      }

      // If assignedTo is provided, verify the user exists
      if (assignedTo !== null && assignedTo !== undefined) {
        const user = await User.findByPk(assignedTo);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
      }

      testCase.assignedTo = assignedTo;
      await testCase.save();

      // Fetch updated case with assignee
      const updatedCase = await Case.findByPk(caseId, {
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      res.json({
        id: updatedCase.id,
        assignedTo: updatedCase.assignedTo,
        assignee: updatedCase.assignee,
        message: 'Test case assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning test case:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
