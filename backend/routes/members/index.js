const express = require('express');
const router = express.Router();
const { DataTypes, QueryTypes } = require('sequelize');
const defineUser = require('../../models/users');
const defineMember = require('../../models/members');

module.exports = function (sequelize) {
  const { verifySignedIn } = require('../../middleware/auth')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middleware/verifyVisible')(sequelize);
  const User = defineUser(sequelize, DataTypes);
  const Member = defineMember(sequelize, DataTypes);
  Member.belongsTo(User, { foreignKey: 'userId' });

  router.get('/', verifySignedIn, verifyProjectVisibleFromProjectId, async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    try {
      const members = await Member.findAll({
        where: {
          projectId: projectId,
        },
        include: [
          {
            model: User,
          },
        ],
      });
      res.json(members);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });



   // ✅ New: Search members by projectId and role list
  router.get('/getProjectMembers', async (req, res) => {
    const { projectId, roles } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    if (!roles) {
      return res.status(400).json({ error: 'roles parameter is required (comma-separated values like 1,2,3)' });
    }

    try {
      // Convert comma-separated roles to integer array
      const roleList = roles.split(',').map((r) => parseInt(r.trim())).filter((r) => !isNaN(r));

      const results = await sequelize.query(
        `
        SELECT 
          m.userId, 
          m.role, 
          u.username 
        FROM members m 
        JOIN users u 
          ON m.userId = u.id 
        WHERE 
          m.projectId = :projectId 
          AND m.role IN (:roleList)
        `,
        {
          replacements: { projectId, roleList },
          type: QueryTypes.SELECT,
        }
      );

      res.json(results);
    } catch (error) {
      console.error('Error searching members:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  return router;
};
