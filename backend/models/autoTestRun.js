function defineAutoTestRun(sequelize, DataTypes) {
  const AutoTestRun = sequelize.define(
    "AutoTestRun",
    {
      testrunid: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      ts_type: { type: DataTypes.ENUM("immediate", "scheduled"), allowNull: false },
      ts_repeated: { type: DataTypes.ENUM("Y", "N"), allowNull: false, defaultValue: "N" },
      ts_schedule_time: { type: DataTypes.DATE },
      ts_buildname: { type: DataTypes.STRING(160), allowNull: false },
      ts_description: { type: DataTypes.STRING(255) },
      ts_env: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "sit" },
      ts_browser: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "chrome" },
      testdataPath: { type: DataTypes.STRING(512) },
      test_group_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      ts_case_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      ts_reports_path: { type: DataTypes.TEXT },
      projectid: { type: DataTypes.STRING(45) },
      status: {
        type: DataTypes.ENUM(
          "queued",
          "running",
          "passed",
          "failed",
          "errored",
          "cancelled",
          "paused",
          "inactive"
        ),
        allowNull: false,
        defaultValue: "queued",
      },
      pid: { type: DataTypes.INTEGER },
      exit_code: { type: DataTypes.INTEGER },
      started_at: { type: DataTypes.DATE },
      finished_at: { type: DataTypes.DATE },
      runId:{type: DataTypes.STRING(255)},
    },
    {
      tableName: "autotestcaseruns",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ name: "ix_runs_created", fields: ["created_at"], using: "BTREE" }],
    }
  );

  AutoTestRun.associate = function (models) {
    AutoTestRun.belongsTo(models.AutoTestCase, { foreignKey: "ts_case_id" });
    AutoTestRun.belongsTo(models.AutoTestGroup, { foreignKey: "test_group_id" });
  };

  return AutoTestRun;
}

module.exports = defineAutoTestRun;
