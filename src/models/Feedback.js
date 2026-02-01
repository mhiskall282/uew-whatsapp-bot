const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Feedback = sequelize.define('Feedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  conversation_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'conversations',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
    comment: 'Rating from 1-5 stars',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  feedback_type: {
    type: DataTypes.ENUM('general', 'navigation', 'information', 'website', 'bug'),
    defaultValue: 'general',
    allowNull: false,
  },
  credits_awarded: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  is_processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether credits have been awarded',
  },
}, {
  tableName: 'feedback',
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['rating'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['is_processed'],
    },
    {
      fields: ['feedback_type'],
    },
  ],
});

module.exports = Feedback;
