function defineLovData(sequelize, DataTypes) {
  const LovData = sequelize.define('lovdata', {
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    colorCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
    
  });

  

  return LovData;
}

module.exports = defineLovData;
