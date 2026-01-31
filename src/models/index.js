const sequelize = require('../config/database');
// const User = require('./User');
// const Conversation = require('./Conversation');
// const Feedback = require('./Feedback');
// const Location = require('./Location');
// const KnowledgeBase = require('./KnowledgeBase');

// ✅ Initialize models (each file should export: (sequelize) => Model)
const User = require("./User")(sequelize);
const Conversation = require("./Conversation")(sequelize);
const Feedback = require("./Feedback")(sequelize);
const Location = require("./Location")(sequelize);
const KnowledgeBase = require("./KnowledgeBase")(sequelize);

// Define associations/relationships

// User <-> Conversations
User.hasMany(Conversation, {
  foreignKey: 'user_id',
  as: 'conversations',
});

Conversation.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User <-> Feedback
User.hasMany(Feedback, {
  foreignKey: 'user_id',
  as: 'feedbacks',
});

Feedback.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Conversation <-> Feedback
Conversation.hasMany(Feedback, {
  foreignKey: 'conversation_id',
  as: 'feedbacks',
});

Feedback.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation',
});

module.exports = {
  sequelize,
  User,
  Conversation,
  Feedback,
  Location,
  KnowledgeBase,
};