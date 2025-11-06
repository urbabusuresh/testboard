// models/projects_config.js
function defineProjectsConfig(sequelize, DataTypes) {
  const ProjectsConfig = sequelize.define(
    "ProjectsConfig",
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      projectid: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      tenantid: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      env: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "all",
      },
      config_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      config_value: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      value_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      scope: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      effective_from: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      effective_to: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "projects_config",
      timestamps: false,
    }
  );

  return ProjectsConfig;
}

module.exports = defineProjectsConfig;
