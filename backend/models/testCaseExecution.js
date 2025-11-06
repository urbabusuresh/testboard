function defineTestCaseExecution(sequelize, DataTypes) {
  const TestCaseExecution = sequelize.define(
    "TestCaseExecution",
    {
      execution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      run_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      cycle_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      testcase_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      cycle_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      include_in_run: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      test_data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      preparation_start: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      preparation_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      prepared_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      executed_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      executed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      requirement_ids: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      bug_ids: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      attachment_ids: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      review_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewer_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approved_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      approved_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      approver_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      execution_state:
      {
      type:DataTypes.INTEGER,
      allowNull:true,
      defaultValue:0,
      },
      env_os: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      env_browser: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      env_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      env_database: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      projectId:{
          type: DataTypes.NUMBER,
        allowNull: false,
      }
    },
    {
      tableName: "testcase_executions",
      timestamps: false, // ✅ unless you have createdAt/updatedAt
    }
  );

  return TestCaseExecution;
}

module.exports = defineTestCaseExecution;
