function defineAutoTestGroup(sequelize, DataTypes) {
  const AutoTestGroup = sequelize.define(
    "AutoTestGroup",
    {
      ts_group_id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      group_name: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      ts_ids: { type: DataTypes.JSON, allowNull: false }, // e.g. [101, 205]
      testdataPath: { type: DataTypes.STRING(512) },
      status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      projectid: { type: DataTypes.STRING(45) },
    },
    {
      tableName: "autotestcasegroups",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  AutoTestGroup.associate = function (models) {
    // Runs that belong to a group
    AutoTestGroup.hasMany(models.AutoTestRun, { foreignKey: "test_group_id" });
  };

  return AutoTestGroup;
}

module.exports = defineAutoTestGroup;
