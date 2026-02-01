const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  whatsapp_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  credits: {
    type: DataTypes.INTEGER,
    defaultValue: parseInt(process.env.INITIAL_CREDITS) || 5,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  total_queries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  total_feedback_given: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  is_blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  last_interaction_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  onboarding_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['whatsapp_number'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

// Instance methods
User.prototype.hasEnoughCredits = function(amount = 1) {
  return this.credits >= amount;
};

User.prototype.deductCredits = async function(amount = 1) {
  if (!this.hasEnoughCredits(amount)) {
    throw new Error('Insufficient credits');
  }
  this.credits -= amount;
  this.total_queries += 1;
  this.last_interaction_at = new Date();
  await this.save();
  return this.credits;
};

User.prototype.addCredits = async function(amount) {
  this.credits += amount;
  await this.save();
  return this.credits;
};

User.prototype.completeOnboarding = async function() {
  this.onboarding_completed = true;
  await this.save();
};

module.exports = User;
