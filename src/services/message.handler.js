const { User, Conversation } = require('../models');
const whatsappService = require('./whatsapp.service');
const geminiService = require('./gemini.service');
const navigationService = require('./navigation.service');
const logger = require('../utils/logger');
const feedbackService = require('./feedback.service');

class MessageHandler {
  async handleIncomingMessage(message, context) {
    const startTime = Date.now();

    try {
      const from = message.from;
      const messageText = message.text?.body || '';
      const messageId = message.id;

      logger.info('Incoming message', { from, text: messageText });

      // Mark as read
      await whatsappService.markAsRead(messageId);

      // Get or create user
      const user = await this.getOrCreateUser(from);

      if (!user.is_active || user.is_blocked) {
        logger.warn('Blocked or inactive user', { from });
        return;
      }

      // Save user message
      await Conversation.create({
        user_id: user.id,
        whatsapp_message_id: messageId,
        message_type: 'user',
        content: messageText,
      });

      // Handle onboarding
      if (!user.onboarding_completed) {
        await this.handleOnboarding(user, messageText);
        return;
      }

      // ✅ Handle feedback BEFORE credits + intent (so users can earn credits)
      if (feedbackService.isFeedback(messageText)) {
        await this.handleFeedback(user, messageText);
        return;
      }

      // Check credits
      if (!user.hasEnoughCredits()) {
        await this.handleNoCredits(user);
        return;
      }

      // Classify intent
      const classification = await geminiService.classifyIntent(messageText);

      // Handle based on intent
      let response;
      switch (classification.intent) {
        case 'NAVIGATION':
          response = await this.handleNavigation(classification.entities);
          break;
        case 'FAQ':
          response = await this.handleFAQ(messageText);
          break;
        case 'GREETING':
          response = this.handleGreeting(user);
          break;
        case 'HELP':
          response = this.handleHelp();
          break;
        default:
          response =
            "I'm not sure how to help with that. Try asking about campus locations or university information!";
      }

      // Deduct credit
      await user.deductCredits(1);

      // Send response
      await whatsappService.sendTextMessage(from, response);

      // Save bot message
      const responseTime = Date.now() - startTime;
      await Conversation.create({
        user_id: user.id,
        message_type: 'bot',
        content: response,
        intent: classification.intent,
        intent_confidence: classification.confidence,
        credits_used: 1,
        response_time_ms: responseTime,
      });

      logger.info('Message handled successfully', {
        from,
        intent: classification.intent,
        responseTime,
      });
    } catch (error) {
      logger.error('Message handling failed', { error: error.message });
    }
  }

  async getOrCreateUser(whatsappNumber) {
    const [user] = await User.findOrCreate({
      where: { whatsapp_number: whatsappNumber },
      defaults: {
        whatsapp_number: whatsappNumber,
        credits: parseInt(process.env.INITIAL_CREDITS, 10) || 5,
      },
    });
    return user;
  }

  async handleOnboarding(user, message) {
    const response = `
👋 Welcome to UEW Campus Assistant!

I'm here to help you with:
📍 Campus navigation & directions
❓ University information & FAQs
📰 Latest news & announcements

You have ${user.credits} free credits to get started!

Each question costs 1 credit. You can earn more credits by:
⭐ Giving feedback after I help you
📝 Completing surveys

Ready to explore? Ask me anything!
Example: "How do I get to the library?"`;

    await whatsappService.sendTextMessage(user.whatsapp_number, response);
    await user.completeOnboarding();
  }

  async handleNoCredits(user) {
    const response = `
😔 You're out of credits!

🌟 Earn ${process.env.CREDITS_PER_FEEDBACK} credits by giving feedback:
Simply rate my last response (1-5 stars) and add a short comment.

Example: "⭐⭐⭐⭐⭐ Very helpful, found the library easily!"

Or just type: FEEDBACK`;

    await whatsappService.sendTextMessage(user.whatsapp_number, response);
  }

  async handleFeedback(user, message) {
    // If they typed just "feedback", ask for a rating format
    if (message.trim().toLowerCase() === 'feedback') {
      const response = `
Please rate your experience with stars (1-5) and a comment:

Example: ⭐⭐⭐⭐⭐ Very helpful!

Or: 4/5 Good directions but could be clearer`;
      await whatsappService.sendTextMessage(user.whatsapp_number, response);
      return;
    }

    const { rating, comment } = feedbackService.parseFeedback(message);

    if (!rating) {
      const response = `
Please rate your experience with stars (1-5) and a comment:

Example: ⭐⭐⭐⭐⭐ Very helpful!

Or: 4/5 Good directions but could be clearer`;
      await whatsappService.sendTextMessage(user.whatsapp_number, response);
      return;
    }

    const saved = await feedbackService.saveFeedback(user, rating, comment);

    // Reload user so the credits shown are accurate
    await user.reload();

    const creditsEarned = saved.credits_awarded || (parseInt(process.env.CREDITS_PER_FEEDBACK, 10) || 3);

    const response = `
🎉 Thank you for your feedback!

Rating: ${'⭐'.repeat(rating)}
Credits earned: +${creditsEarned}
Your new balance: ${user.credits} credits

Your feedback helps us improve! 🙏`;

    await whatsappService.sendTextMessage(user.whatsapp_number, response);
  }

  async handleNavigation(entities) {
    const { origin, destination } = entities || {};

    if (!destination) {
      return "I'd love to help you navigate! Please tell me where you want to go.\n\nExample: 'How do I get to the library?'";
    }

    return await navigationService.generateNavigationResponse(origin, destination);
  }

  async handleFAQ(question) {
    const answer = await geminiService.answerQuestion(question);
    return answer;
  }

  handleGreeting(user) {
    return `Hello! 👋 I'm your UEW campus assistant. I have ${user.credits} credits available.\n\nHow can I help you today?`;
  }

  handleHelp() {
    return `
🤖 **How to Use UEW Campus Assistant**

📍 **Navigation:**
- "How do I get to the library?"
- "I'm at Aggrey Hall, need to go to North Campus"
- "Where is the SRC office?"

❓ **Information:**
- "What departments does UEW have?"
- "When does the library close?"
- "Tell me about admissions"

⭐ **Earn Credits:**
- Give feedback: "⭐⭐⭐⭐⭐ Great help!"
- Rate responses after getting help

💡 **Tips:**
- Each question uses 1 credit
- You can earn credits through feedback
- Share your location for better directions

What would you like to know?`;
  }
}

module.exports = new MessageHandler();
