const { Feedback, User } = require('../models');
const logger = require('../utils/logger');

class FeedbackService {
  /**
   * Parse feedback from user message
   * @param {string} message 
   * @returns {Object} {rating, comment}
   */
  parseFeedback(message) {
    // Count stars
    const starCount = (message.match(/⭐/g) || []).length;
    
    // Or look for numbers
    const numberMatch = message.match(/(\d)[\/\s]?5|\b([1-5])\s*(star|out)/i);
    
    const rating = starCount > 0 ? Math.min(starCount, 5) : 
                   numberMatch ? parseInt(numberMatch[1] || numberMatch[2]) : null;

    // Extract comment (remove stars and rating mentions)
    let comment = message
      .replace(/⭐/g, '')
      .replace(/\d[\/\s]?5/g, '')
      .replace(/\b[1-5]\s*(star|out of 5)/gi, '')
      .trim();

    return { rating, comment };
  }

  /**
   * Save feedback and award credits
   * @param {User} user 
   * @param {number} rating 
   * @param {string} comment 
   * @returns {Promise<Feedback>}
   */
  async saveFeedback(user, rating, comment) {
    try {
      const feedback = await Feedback.create({
        user_id: user.id,
        rating,
        comment,
        feedback_type: 'general',
        credits_awarded: parseInt(process.env.CREDITS_PER_FEEDBACK) || 3,
        is_processed: true,
      });

      // Award credits
      await user.addCredits(feedback.credits_awarded);
      user.total_feedback_given += 1;
      await user.save();

      logger.info('Feedback saved', {
        userId: user.id,
        rating,
        creditsAwarded: feedback.credits_awarded,
      });

      return feedback;
    } catch (error) {
      logger.error('Save feedback failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if message is feedback
   * @param {string} message 
   * @returns {boolean}
   */
  isFeedback(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for star emojis
    if (message.includes('⭐')) {
      return true;
    }

    // Check for rating patterns
    if (/\b[1-5]\s*(star|out of 5|\/5)/i.test(message)) {
      return true;
    }

    // Check for feedback keywords
    if (lowerMessage.includes('feedback') || lowerMessage.includes('rating')) {
      return true;
    }

    return false;
  }
}

module.exports = new FeedbackService();