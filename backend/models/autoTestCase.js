function defineAutoTestCase(sequelize, DataTypes) {
  const AutoTestCase = sequelize.define(
    "AutoTestCase",
    {
      ts_id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      module: { type: DataTypes.STRING(120), allowNull: false },
      testfilename: { type: DataTypes.STRING(255), allowNull: false },
      testdata: { type: DataTypes.STRING(512) },
      status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      projectid: { type: DataTypes.STRING(45) },
      tc_id: { type: DataTypes.STRING(100) },
      tsc_id: { type: DataTypes.STRING(100) },
      description: { type: DataTypes.STRING(255) },
      autc_id: { type: DataTypes.STRING(45) },
    },
    {
      tableName: "autotestcases",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ name: "ix_module", fields: ["module"] }],
    }
  );

  AutoTestCase.associate = function (models) {
    // Runs that point directly to a testcase
    AutoTestCase.hasMany(models.AutoTestRun, { foreignKey: "ts_case_id" });
  };

  return AutoTestCase;
}

module.exports = defineAutoTestCase;
