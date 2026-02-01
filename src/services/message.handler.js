const { User, Conversation, Feedback } = require('../models');
const whatsappService = require('./whatsapp.service');
const geminiService = require('./gemini.service');
const navigationService = require('./navigation.service');
const logger = require('../utils/logger');

class MessageHandler {
  /**
   * Main entry point for handling incoming WhatsApp messages
   * @param {Object} message - WhatsApp message object
   * @param {Object} context - Additional context from webhook
   */
  async handleIncomingMessage(message, context) {
    const startTime = Date.now();
    
    try {
      // Extract message details
      const from = message.from; // User's WhatsApp number
      const messageText = message.text?.body || '';
      const messageId = message.id;
      const messageType = message.type; // text, image, location, etc.

      logger.info('📱 Incoming message', {
        from,
        type: messageType,
        text: messageText.substring(0, 100),
      });

      // Only handle text messages for now
      if (messageType !== 'text') {
        await whatsappService.sendTextMessage(
          from,
          "I can only understand text messages right now. Please send your question as text!"
        );
        return;
      }

      // Mark message as read
      await whatsappService.markAsRead(messageId);

      // Get or create user
      const user = await this.getOrCreateUser(from);

      // Check if user is blocked
      if (!user.is_active || user.is_blocked) {
        logger.warn('⛔ Blocked or inactive user', { from });
        return;
      }

      // Save incoming message to database
      await Conversation.create({
        user_id: user.id,
        whatsapp_message_id: messageId,
        message_type: 'user',
        content: messageText,
      });

      // Handle onboarding for new users
      if (!user.onboarding_completed) {
        await this.handleOnboarding(user);
        return;
      }

      // Check if this is feedback
      if (this.isFeedbackMessage(messageText)) {
        await this.handleFeedback(user, messageText);
        return;
      }

      // Check if user has enough credits
      if (!user.hasEnoughCredits(1)) {
        await this.handleNoCredits(user);
        return;
      }

      // Classify intent using AI
      const classification = await geminiService.classifyIntent(messageText);
      
      logger.info('🧠 Intent classified', {
        intent: classification.intent,
        confidence: classification.confidence,
      });

      // Generate response based on intent
      let response;
      let creditsUsed = 1;

      switch (classification.intent) {
        case 'NAVIGATION':
          response = await this.handleNavigation(classification.entities);
          break;
          
        case 'FAQ':
          response = await this.handleFAQ(messageText, classification.entities);
          break;
          
        case 'WEBSITE_SEARCH':
          response = await this.handleWebsiteSearch(messageText, classification.entities);
          break;
          
        case 'GREETING':
          response = this.handleGreeting(user);
          creditsUsed = 0; // Don't charge for greetings
          break;
          
        case 'HELP':
          response = this.handleHelp();
          creditsUsed = 0; // Don't charge for help
          break;
          
        default:
          response = await this.handleOther(messageText);
          break;
      }

      // Deduct credits
      if (creditsUsed > 0) {
        await user.deductCredits(creditsUsed);
      }

      // Send response to user
      await whatsappService.sendTextMessage(from, response);

      // Save bot response to database
      const responseTime = Date.now() - startTime;
      await Conversation.create({
        user_id: user.id,
        message_type: 'bot',
        content: response,
        intent: classification.intent,
        intent_confidence: classification.confidence,
        metadata: classification.entities || {},
        credits_used: creditsUsed,
        response_time_ms: responseTime,
      });

      logger.info('✅ Message handled successfully', {
        from,
        intent: classification.intent,
        creditsUsed,
        responseTime: `${responseTime}ms`,
      });

    } catch (error) {
      logger.error('❌ Message handling failed', {
        error: error.message,
        stack: error.stack,
      });

      // Try to send error message to user
      try {
        await whatsappService.sendTextMessage(
          message.from,
          "Sorry, I encountered an error processing your message. Please try again!"
        );
      } catch (sendError) {
        logger.error('Failed to send error message', { error: sendError.message });
      }
    }
  }

  /**
   * Get existing user or create new one
   */
  async getOrCreateUser(whatsappNumber) {
    let [user, created] = await User.findOrCreate({
      where: { whatsapp_number: whatsappNumber },
      defaults: {
        whatsapp_number: whatsappNumber,
        credits: parseInt(process.env.INITIAL_CREDITS) || 5,
      },
    });

    if (created) {
      logger.info('👤 New user created', {
        whatsappNumber,
        initialCredits: user.credits,
      });
    }

    return user;
  }

  /**
   * Handle onboarding for new users
   */
  async handleOnboarding(user) {
    const welcomeMessage = `
🎓 *Welcome to UEW Campus Assistant!*

Hello! I'm your virtual guide for the University of Education, Winneba.

*What I Can Help You With:*
📍 Campus navigation & directions
❓ University information & FAQs
📰 News & announcements
🏛️ Departments, facilities & services

*How It Works:*
• You have ${user.credits} free credits to start
• Each question costs 1 credit
• Earn credits by giving feedback!

*Try These:*
• "How do I get to the library?"
• "Where is the SRC office?"
• "Tell me about admissions"
• "What departments are available?"

Ready to explore? Ask me anything! 🚀`;

    await whatsappService.sendTextMessage(user.whatsapp_number, welcomeMessage);
    
    // Mark onboarding as complete
    await user.completeOnboarding();
    
    logger.info('✅ Onboarding completed', { userId: user.id });
  }

  /**
   * Handle when user has no credits
   */
  async handleNoCredits(user) {
    const message = `
😔 *You're out of credits!*

Current balance: ${user.credits} credits

*Earn More Credits:*
⭐ Give feedback on my responses (+${process.env.CREDITS_PER_FEEDBACK} credits)

*How to Give Feedback:*
Rate with stars (1-5) and add a comment:

Examples:
• "⭐⭐⭐⭐⭐ Very helpful, found the location easily!"
• "⭐⭐⭐ Good but directions were unclear"
• "4/5 Great service!"

*Note:* Feedback must be at least ${process.env.MIN_FEEDBACK_LENGTH} characters.

Give feedback now to continue using the bot! 💬`;

    await whatsappService.sendTextMessage(user.whatsapp_number, message);
  }

  /**
   * Check if message is feedback
   */
  isFeedbackMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for star emojis
    if (message.includes('⭐')) {
      return true;
    }

    // Check for rating patterns
    if (/\b[1-5]\s*(star|out of 5|\/5)/i.test(message)) {
      return true;
    }

    // Check for explicit feedback keywords
    if (lowerMessage.startsWith('feedback:') || lowerMessage.startsWith('rating:')) {
      return true;
    }

    return false;
  }

  /**
   * Handle feedback submission
   */
  async handleFeedback(user, messageText) {
    try {
      // Parse feedback
      const { rating, comment } = this.parseFeedback(messageText);

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        await whatsappService.sendTextMessage(
          user.whatsapp_number,
          "Please provide a rating from 1-5 stars.\n\nExample: ⭐⭐⭐⭐⭐ Great help!"
        );
        return;
      }

      // Validate comment length
      const minLength = parseInt(process.env.MIN_FEEDBACK_LENGTH) || 10;
      if (!comment || comment.length < minLength) {
        await whatsappService.sendTextMessage(
          user.whatsapp_number,
          `Please add a comment (at least ${minLength} characters).\n\nExample: ⭐⭐⭐⭐⭐ The directions were clear and I found the library easily!`
        );
        return;
      }

      // Save feedback
      const creditsAwarded = parseInt(process.env.CREDITS_PER_FEEDBACK) || 3;
      
      await Feedback.create({
        user_id: user.id,
        rating,
        comment,
        feedback_type: 'general',
        credits_awarded: creditsAwarded,
        is_processed: true,
      });

      // Award credits
      await user.addCredits(creditsAwarded);
      user.total_feedback_given += 1;
      await user.save();

      // Send thank you message
      const thankYouMessage = `
🎉 *Thank you for your feedback!*

Your rating: ${'⭐'.repeat(rating)}
Comment: "${comment}"

*Reward:*
+${creditsAwarded} credits earned!

*New balance:* ${user.credits} credits

Your feedback helps us improve! 🙏

Ask another question to continue!`;

      await whatsappService.sendTextMessage(user.whatsapp_number, thankYouMessage);

      logger.info('⭐ Feedback saved', {
        userId: user.id,
        rating,
        creditsAwarded,
      });

    } catch (error) {
      logger.error('Feedback handling failed', { error: error.message });
      await whatsappService.sendTextMessage(
        user.whatsapp_number,
        "Sorry, I couldn't process your feedback. Please try again!"
      );
    }
  }

  /**
   * Parse feedback from message
   */
  parseFeedback(message) {
    // Count star emojis
    const starCount = (message.match(/⭐/g) || []).length;
    
    // Look for number ratings
    const numberMatch = message.match(/(\d)[\/\s]?5|\b([1-5])\s*(star|out)/i);
    
    const rating = starCount > 0 ? Math.min(starCount, 5) : 
                   numberMatch ? parseInt(numberMatch[1] || numberMatch[2]) : null;

    // Extract comment (remove stars and ratings)
    let comment = message
      .replace(/⭐/g, '')
      .replace(/\d[\/\s]?5/g, '')
      .replace(/\b[1-5]\s*(star|out of 5)/gi, '')
      .replace(/^(feedback|rating):\s*/i, '')
      .trim();

    return { rating, comment };
  }

  /**
   * Handle navigation requests
   */
  async handleNavigation(entities) {
    const { origin, destination } = entities;
    
    if (!destination) {
      return `
📍 *Campus Navigation*

I'd love to help you find your way! Please tell me where you want to go.

*Examples:*
• "How do I get to the library?"
• "Where is the SRC office?"
• "I'm at Aggrey Hall, need to go to North Campus"

*Available commands:*
• "List locations" - See all known places
• "Show map" - Get campus overview

What location are you looking for?`;
    }

    return await navigationService.generateNavigationResponse(origin, destination);
  }

  /**
   * Handle FAQ questions
   */
  async handleFAQ(question, entities) {
    try {
      // For now, use Gemini to answer
      // TODO: Integrate with knowledge base (Day 2)
      const answer = await geminiService.answerQuestion(question);
      
      return `
${answer}

---
💡 *Need more info?* Visit www.uew.edu.gh
📞 *Contact:* +233-XXX-XXXX-XXX`;

    } catch (error) {
      logger.error('FAQ handling failed', { error: error.message });
      return "I'm having trouble answering that question right now. Please try again or rephrase your question.";
    }
  }

  /**
   * Handle website search requests
   */
  async handleWebsiteSearch(question, entities) {
    // TODO: Implement RAG search with Pinecone (Day 2)
    // For now, redirect to general FAQ
    return await this.handleFAQ(question, entities);
  }

  /**
   * Handle greetings
   */
  handleGreeting(user) {
    const greetings = [
      `Hello! 👋 I'm your UEW campus assistant.`,
      `Hi there! 😊 Ready to explore campus?`,
      `Hey! 🎓 How can I help you today?`,
      `Greetings! 🌟 What would you like to know?`,
    ];

    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    return `
${greeting}

*Your credits:* ${user.credits}

*Quick options:*
📍 Navigation: "How do I get to..."
❓ Info: "Tell me about..."
🆘 Help: "Help"

What can I help you with?`;
  }

  /**
   * Handle help requests
   */
  handleHelp() {
    return `
🤖 *UEW Campus Assistant - Help Guide*

*📍 NAVIGATION*
Get directions to any campus location:
• "How do I get to the library?"
• "Where is the SRC office?"
• "I'm at Aggrey Hall, need to reach North Campus"
• "List locations" - See all available places

*❓ INFORMATION*
Ask about university:
• "What departments does UEW have?"
• "Tell me about admissions"
• "When does the library close?"
• "What is the SRC?"

*⭐ CREDITS & FEEDBACK*
Current system:
• Each question = 1 credit
• Start with ${process.env.INITIAL_CREDITS} free credits
• Earn ${process.env.CREDITS_PER_FEEDBACK} credits per feedback
• Give feedback: "⭐⭐⭐⭐⭐ [your comment]"

*💡 TIPS*
• Be specific in your questions
• Use location names clearly
• Share feedback to earn credits
• Check "List locations" for navigation

Need more help? Just ask a specific question!`;
  }

  /**
   * Handle unclassified/other messages
   */
  async handleOther(message) {
    return `
🤔 I'm not sure how to help with that.

*I can help you with:*
📍 Finding locations on campus
❓ Answering questions about UEW
📰 Getting university information

*Try asking:*
• "How do I get to [location]?"
• "Tell me about [topic]"
• "Help" for more options

What would you like to know?`;
  }
}

module.exports = new MessageHandler();
