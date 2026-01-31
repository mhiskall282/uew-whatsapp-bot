const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      whatsapp_number: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },

      name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },

      credits: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
      },

      total_queries: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      total_feedback_given: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      is_blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      onboarding_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      last_interaction_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
    }
  );

  // ===== METHODS =====

  User.prototype.hasEnoughCredits = function (amount = 1) {
    return this.credits >= amount;
  };

  User.prototype.deductCredits = async function (amount = 1) {
    this.credits = Math.max(this.credits - amount, 0);
    this.total_queries += 1;
    this.last_interaction_at = new Date();
    await this.save();
  };

  User.prototype.addCredits = async function (amount = 1) {
    this.credits += amount;
    await this.save();
  };

  User.prototype.completeOnboarding = async function () {
    this.onboarding_completed = true;
    await this.save();
  };

  return User;
};
