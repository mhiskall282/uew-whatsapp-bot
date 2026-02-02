'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      wa_id: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5, // INITIAL_CREDITS
      },
      last_active: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Optional: add indexes
    await queryInterface.addIndex('users', ['phone_number'], {
      unique: true,
      name: 'users_phone_number_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  },
};