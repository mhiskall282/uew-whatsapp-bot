// src/models/Conversation.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Conversation = sequelize.define(
    "Conversation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      whatsapp_message_id: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },

      message_type: {
        type: DataTypes.ENUM("user", "bot", "system"),
        allowNull: false,
        defaultValue: "user",
      },

      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      intent: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      intent_confidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },

      credits_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      response_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "conversations",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["whatsapp_message_id"] },
        { fields: ["intent"] },
        { fields: ["created_at"] },
      ],
    }
  );

  return Conversation;
};
