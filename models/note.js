'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Note extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Note.hasMany(models.Chapter,{
        foreignKey: 'noteId'
      }); // A note has many chapters
      Note.belongsTo(models.User,{
        foreignKey: 'userId'
      })
    }
  }
  Note.init({
    heading: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Note',
  });
  return Note;
};