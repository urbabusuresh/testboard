// models/folders.js
module.exports = (sequelize, DataTypes) => {
  const Folder = sequelize.define(
    'Folder',
    {
      // id is auto by default; define explicitly if you want
      name: { type: DataTypes.STRING, allowNull: false },
      detail: { type: DataTypes.STRING, allowNull: true },
      parentFolderId: { type: DataTypes.INTEGER, allowNull: true },
      projectId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'folders', // make table name explicit
      underscored: true, // folder_id → folderId mapping convenience
    }
  );

  Folder.associate = (models) => {
    // Folder → Project
    if (!models.Project) throw new Error('Project model not loaded');
    Folder.belongsTo(models.Project, {
      as: 'project',
      foreignKey: 'projectId',
      onDelete: 'CASCADE',
    });

    // Self-referencing parent/children (NO models.folder)
    Folder.belongsTo(Folder, {
      as: 'parent',
      foreignKey: 'parentFolderId',
      onDelete: 'CASCADE',
    });
    Folder.hasMany(Folder, {
      as: 'children',
      foreignKey: 'parentFolderId',
      onDelete: 'CASCADE',
    });

    // Folder → Case (optional, only if Case model exists)
    if (models.Case) {
      Folder.hasMany(models.Case, {
        as: 'cases',
        foreignKey: 'folderId',
        onDelete: 'CASCADE',
      });
    }
  };

  return Folder;
};
