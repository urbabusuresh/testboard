'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Cases', 'assignedTo', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    
    await queryInterface.addColumn('Cases', 'workflowStatus', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'draft',
      comment: 'Workflow status: draft, ready, in-progress, review, completed',
    });
    
    await queryInterface.addColumn('Cases', 'estimatedHours', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Estimated hours to complete the test case',
    });
    
    await queryInterface.addColumn('Cases', 'actualHours', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Actual hours spent on the test case',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Cases', 'assignedTo');
    await queryInterface.removeColumn('Cases', 'workflowStatus');
    await queryInterface.removeColumn('Cases', 'estimatedHours');
    await queryInterface.removeColumn('Cases', 'actualHours');
  }
};
