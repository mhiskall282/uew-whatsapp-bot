const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KnowledgeBase = sequelize.define('KnowledgeBase', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    unique: true,
  },
  content_type: {
    type: DataTypes.ENUM('page', 'news', 'announcement', 'faq', 'other'),
    defaultValue: 'page',
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Category like admissions, academics, student-life, etc.',
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI-generated summary of the content',
  },
  embedding_id: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'ID in Pinecone vector database',
  },
  last_scraped_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  content_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Hash to detect content changes',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata like author, date, tags',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  access_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'How many times this content has been retrieved',
  },
}, {
  tableName: 'knowledge_base',
  indexes: [
    {
      unique: true,
      fields: ['url'],
    },
    {
      fields: ['content_type'],
    },
    {
      fields: ['category'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['last_scraped_at'],
    },
    {
      fields: ['access_count'],
    },
  ],
});

module.exports = KnowledgeBase;
