const express = require('express');
const router = express.Router();
const { User, Conversation, Feedback } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /admin/analytics
 * Basic analytics endpoint
 */
router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const totalConversations = await Conversation.count();
    
    const avgRating = await Feedback.findOne({
      attributes: [
        [Feedback.sequelize.fn('AVG', Feedback.sequelize.col('rating')), 'avg_rating']
      ],
      raw: true,
    });

    const topIntents = await Conversation.findAll({
      attributes: [
        'intent',
        [Conversation.sequelize.fn('COUNT', 'id'), 'count'],
      ],
      where: {
        intent: { [Op.not]: null },
      },
      group: ['intent'],
      order: [[Conversation.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalConversations,
        avgRating: avgRating?.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(2) : null,
        topIntents,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /admin/users
 * Get user list with stats
 */
router.get('/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const users = await User.findAndCountAll({
      attributes: [
        'id',
        'whatsapp_number',
        'name',
        'credits',
        'total_queries',
        'total_feedback_given',
        'is_active',
        'created_at',
        'last_interaction_at',
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: users.rows,
      pagination: {
        total: users.count,
        limit,
        offset,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /admin/feedback
 * Get recent feedback
 */
router.get('/feedback', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const feedback = await Feedback.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['whatsapp_number'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
    });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /admin/conversations/:userId
 * Get conversation history for a user
 */
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Conversation.findAll({
      where: { user_id: userId },
      order: [['created_at', 'ASC']],
      limit: 100,
    });

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
