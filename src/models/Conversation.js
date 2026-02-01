const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
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
  whatsapp_message_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  message_type: {
    type: DataTypes.ENUM('user', 'bot'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  intent: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Detected intent: navigation, faq, website_search, feedback, admin',
  },
  intent_confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional context like location, entities, etc.',
  },
  credits_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to generate response',
  },
}, {
  tableName: 'conversations',
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['intent'],
    },
    {
      fields: ['message_type'],
    },
  ],
});

module.exports = Conversation;
