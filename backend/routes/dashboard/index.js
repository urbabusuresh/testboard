const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const defineCase = require('../../models/cases');
const defineRun = require('../../models/runs');
const defineRunCase = require('../../models/runCases');
const defineUser = require('../../models/users');
const defineFolder = require('../../models/folders');
const defineMember = require('../../models/members');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const { verifyProjectViewerFromProjectId } = require('../../middleware/verifyVisible')(sequelize);
  
  const Case = defineCase(sequelize, DataTypes);
  const Run = defineRun(sequelize, DataTypes);
  const RunCase = defineRunCase(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);
  const Member = defineMember(sequelize, DataTypes);

  /**
   * GET /api/dashboard/metrics?projectId=<id>
   * Get comprehensive dashboard metrics for a project
   */
  router.get('/metrics', verifySignedIn, verifyProjectViewerFromProjectId, async (req, res) => {
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

      // Test case metrics
      const totalCases = await Case.count({
        where: { folderId: folderIds },
      });

      const casesByWorkflowStatus = await Case.findAll({
        where: { folderId: folderIds },
        attributes: [
          'workflowStatus',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['workflowStatus'],
        raw: true,
      });

      const casesByPriority = await Case.findAll({
        where: { folderId: folderIds },
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['priority'],
        raw: true,
      });

      const assignedCases = await Case.count({
        where: {
          folderId: folderIds,
          assignedTo: { [sequelize.Sequelize.Op.ne]: null },
        },
      });

      const unassignedCases = totalCases - assignedCases;

      // Test run metrics
      const totalRuns = await Run.count({
        where: { projectId },
      });

      const activeRuns = await Run.count({
        where: {
          projectId,
          state: 1, // Active state
        },
      });

      // Team metrics
      const teamMembers = await Member.count({
        where: { projectId },
      });

      // Workload distribution
      const workloadDistribution = await Case.findAll({
        where: {
          folderId: folderIds,
          assignedTo: { [sequelize.Sequelize.Op.ne]: null },
        },
        attributes: [
          'assignedTo',
          [sequelize.fn('COUNT', sequelize.col('Case.id')), 'caseCount'],
        ],
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['username', 'email'],
          },
        ],
        group: ['assignedTo', 'assignee.id'],
        raw: false,
      });

      // Test coverage metrics
      const testCoverage = {
        totalRequirements: 0, // This would need a requirements table
        coveredRequirements: await Case.count({
          where: {
            folderId: folderIds,
            requirementIds: { [sequelize.Sequelize.Op.ne]: null },
          },
        }),
      };

      // Automation metrics
      const automatedCases = await Case.count({
        where: {
          folderId: folderIds,
          automationIds: { [sequelize.Sequelize.Op.ne]: null },
        },
      });

      const automationCoverage = totalCases > 0 
        ? ((automatedCases / totalCases) * 100).toFixed(2)
        : 0;

      res.json({
        projectId,
        testCases: {
          total: totalCases,
          assigned: assignedCases,
          unassigned: unassignedCases,
          byWorkflowStatus: casesByWorkflowStatus,
          byPriority: casesByPriority,
          automated: automatedCases,
          automationCoverage: `${automationCoverage}%`,
        },
        testRuns: {
          total: totalRuns,
          active: activeRuns,
          completed: totalRuns - activeRuns,
        },
        team: {
          totalMembers: teamMembers,
          workloadDistribution,
        },
        testCoverage,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/dashboard/team-performance?projectId=<id>
   * Get team performance metrics
   */
  router.get('/team-performance', verifySignedIn, verifyProjectViewerFromProjectId, async (req, res) => {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      // Get team members
      const members = await Member.findAll({
        where: { projectId },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      const performanceData = [];

      for (const member of members) {
        const userId = member.userId;

        // Get folders for the project
        const folders = await Folder.findAll({
          where: { projectId },
          attributes: ['id'],
        });
        const folderIds = folders.map(f => f.id);

        // Count assigned cases
        const assignedCases = await Case.count({
          where: {
            folderId: folderIds,
            assignedTo: userId,
          },
        });

        // Count completed cases
        const completedCases = await Case.count({
          where: {
            folderId: folderIds,
            assignedTo: userId,
            workflowStatus: 'completed',
          },
        });

        // Calculate total estimated and actual hours
        const hours = await Case.findAll({
          where: {
            folderId: folderIds,
            assignedTo: userId,
          },
          attributes: [
            [sequelize.fn('SUM', sequelize.col('estimatedHours')), 'totalEstimated'],
            [sequelize.fn('SUM', sequelize.col('actualHours')), 'totalActual'],
          ],
          raw: true,
        });

        performanceData.push({
          user: member.User,
          assignedCases,
          completedCases,
          inProgressCases: assignedCases - completedCases,
          completionRate: assignedCases > 0 
            ? ((completedCases / assignedCases) * 100).toFixed(2)
            : 0,
          estimatedHours: hours[0]?.totalEstimated || 0,
          actualHours: hours[0]?.totalActual || 0,
        });
      }

      res.json({
        projectId,
        teamPerformance: performanceData,
      });
    } catch (error) {
      console.error('Error fetching team performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
