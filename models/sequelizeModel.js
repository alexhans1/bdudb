'use strict';

const Sequelize = require('sequelize');

module.exports = function(sequelize) {
  const User = sequelize.define(
    'users',
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        required: true,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        required: true,
        allowNull: false,
      },
      name: Sequelize.STRING,
      vorname: Sequelize.STRING,
      gender: Sequelize.STRING,
      food: Sequelize.STRING,
      image: Sequelize.STRING,
      position: Sequelize.INTEGER,
      resetPasswordToken: Sequelize.STRING,
      resetPasswordExpires: Sequelize.BIGINT,
      last_login: Sequelize.DATE,
    },
    {
      underscored: true,
    },
  );

  const Tournament = sequelize.define(
    'tournaments',
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        required: true,
        allowNull: false,
      },
      ort: Sequelize.STRING,
      startdate: Sequelize.DATEONLY,
      enddate: Sequelize.DATEONLY,
      deadline: Sequelize.DATEONLY,
      format: Sequelize.STRING,
      league: Sequelize.STRING,
      accommodation: Sequelize.STRING,
      speakerprice: Sequelize.DECIMAL(6, 2),
      judgeprice: Sequelize.DECIMAL(6, 2),
      rankingvalue: Sequelize.INTEGER,
      teamspots: Sequelize.INTEGER,
      judgespots: Sequelize.INTEGER,
      link: Sequelize.STRING,
      comments: Sequelize.STRING,
      language: Sequelize.STRING,
    },
    {
      underscored: true,
    },
  );

  const Registration = sequelize.define(
    'tournaments_users',
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      role: Sequelize.STRING,
      teamname: Sequelize.STRING,
      comment: Sequelize.TEXT,
      attended: {
        type: Sequelize.DATEONLY,
        defaultValue: 0,
      },
      price_owed: {
        type: Sequelize.DECIMAL(6, 2),
        defaultValue: 0.0,
      },
      price_paid: {
        type: Sequelize.DECIMAL(6, 2),
        defaultValue: 0.0,
      },
      success: Sequelize.STRING,
      points: {
        type: Sequelize.DECIMAL(6, 2),
        defaultValue: 0.0,
      },
      partner1: Sequelize.INTEGER,
      partner2: Sequelize.INTEGER,
    },
    {
      underscored: true,
    },
  );

  User.belongsToMany(Tournament, {
    through: 'tournaments_users',
    foreignKey: 'user_id',
  });

  Tournament.belongsToMany(User, {
    through: 'tournaments_users',
    foreignKey: 'tournament_id',
  });

  return {
    User: User,
    Tournament: Tournament,
    Registration: Registration,
  };
};
