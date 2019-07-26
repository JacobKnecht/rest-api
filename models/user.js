'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User.firstName property is required' },
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User.lastName property is required' },
      },
    },
    emailAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: { msg: 'User.emailAddress property must be a valid email address' },
        notEmpty: { msg: 'User.emailAddress property is required' },
      },
      unique: {
        args: true,
        msg: 'User.emailAddress property must be unique to each user'
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User.password property is required' },
      },
    }
  }, {});
  User.associate = function(models) {
    // associations can be defined here
    User.hasMany(models.Course, {
      as: 'user',
      foreignKey: {
        fieldName: 'userId',
        allowNull: false,
      },
    });
  };
  return User;
};
