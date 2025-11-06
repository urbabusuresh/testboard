function defineRun(sequelize, DataTypes) {
  const Run = sequelize.define('Run', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    configurations: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'project',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    startDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tc_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    env: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sprintId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
     documentLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
     releaseNotes: {
      type: DataTypes.STRING,
      allowNull: true,
    },

     comments: {
      type: DataTypes.STRING,
      allowNull: true,
    },
     server: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  Run.associate = (models) => {
    Run.belongsTo(models.Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });
  };

  return Run;
}

module.exports = defineRun;
