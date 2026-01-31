// src/models/Feedback.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Feedback = sequelize.define(
    "Feedback",
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

      conversation_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },

      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      feedback_type: {
        type: DataTypes.ENUM("general", "navigation", "faq", "bug", "feature"),
        allowNull: false,
        defaultValue: "general",
      },

      credits_awarded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_processed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "feedback",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["conversation_id"] },
        { fields: ["rating"] },
        { fields: ["created_at"] },
      ],
    }
  );

  return Feedback;
};
