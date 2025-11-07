/**
 * Auto-assignment logic for test cases
 * Distributes test cases based on workload and availability
 */

const { DataTypes } = require('sequelize');
const defineCase = require('../models/cases');
const defineUser = require('../models/users');
const defineMember = require('../models/members');

/**
 * Get workload for each team member in a project
 * @param {Object} sequelize - Sequelize instance
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} - Map of userId to workload
 */
async function getTeamWorkload(sequelize, projectId) {
  const Case = defineCase(sequelize, DataTypes);
  const Member = defineMember(sequelize, DataTypes);
  
  // Get all members of the project
  const members = await Member.findAll({
    where: { projectId },
    attributes: ['userId'],
  });
  
  const userIds = members.map(m => m.userId);
  
  // Count assigned cases for each user
  const workload = {};
  for (const userId of userIds) {
    const count = await Case.count({
      where: {
        assignedTo: userId,
        workflowStatus: ['draft', 'ready', 'in-progress', 'review'],
      },
    });
    workload[userId] = count;
  }
  
  return workload;
}

/**
 * Find the team member with the least workload
 * @param {Object} workload - Map of userId to workload
 * @returns {number|null} - User ID with least workload
 */
function findLeastLoadedMember(workload) {
  let minLoad = Infinity;
  let selectedUserId = null;
  
  for (const [userId, load] of Object.entries(workload)) {
    if (load < minLoad) {
      minLoad = load;
      selectedUserId = parseInt(userId);
    }
  }
  
  return selectedUserId;
}

/**
 * Auto-assign test cases to team members
 * @param {Object} sequelize - Sequelize instance
 * @param {number} projectId - Project ID
 * @param {Array<number>} caseIds - Test case IDs to assign
 * @param {string} strategy - Assignment strategy ('round-robin' or 'least-loaded')
 * @returns {Promise<Object>} - Assignment results
 */
async function autoAssignTestCases(sequelize, projectId, caseIds, strategy = 'least-loaded') {
  const Case = defineCase(sequelize, DataTypes);
  const Member = defineMember(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  
  try {
    // Get project members
    const members = await Member.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
    
    if (members.length === 0) {
      return {
        success: false,
        message: 'No team members found for this project',
      };
    }
    
    const assignments = [];
    
    if (strategy === 'round-robin') {
      // Round-robin assignment
      for (let i = 0; i < caseIds.length; i++) {
        const member = members[i % members.length];
        const testCase = await Case.findByPk(caseIds[i]);
        
        if (testCase) {
          testCase.assignedTo = member.userId;
          await testCase.save();
          
          assignments.push({
            caseId: testCase.id,
            assignedTo: member.userId,
            assigneeName: member.User.username,
          });
        }
      }
    } else {
      // Least-loaded strategy (default)
      const workload = await getTeamWorkload(sequelize, projectId);
      
      for (const caseId of caseIds) {
        const testCase = await Case.findByPk(caseId);
        
        if (testCase && !testCase.assignedTo) {
          const userId = findLeastLoadedMember(workload);
          
          if (userId) {
            testCase.assignedTo = userId;
            await testCase.save();
            
            // Update workload
            workload[userId] = (workload[userId] || 0) + 1;
            
            const member = members.find(m => m.userId === userId);
            assignments.push({
              caseId: testCase.id,
              assignedTo: userId,
              assigneeName: member?.User?.username || 'Unknown',
            });
          }
        }
      }
    }
    
    return {
      success: true,
      message: `Successfully assigned ${assignments.length} test cases`,
      assignments,
    };
  } catch (error) {
    console.error('Error in auto-assignment:', error);
    return {
      success: false,
      message: 'Failed to auto-assign test cases',
      error: error.message,
    };
  }
}

module.exports = {
  getTeamWorkload,
  findLeastLoadedMember,
  autoAssignTestCases,
};
