const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiUrl = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send a text message
   * @param {string} to - Recipient WhatsApp number
   * @param {string} text - Message text
   */
  async sendTextMessage(to, text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: true,
            body: text,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('WhatsApp message sent', {
        to,
        messageId: response.data.messages[0].id,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send WhatsApp message', {
        to,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Send message with interactive buttons
   * @param {string} to 
   * @param {string} bodyText 
   * @param {Array} buttons - Array of {id, title}
   */
  async sendButtonMessage(to, bodyText, buttons) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: bodyText,
            },
            action: {
              buttons: buttons.slice(0, 3).map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${idx}`,
                  title: btn.title.substring(0, 20), // Max 20 chars
                },
              })),
            },
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('WhatsApp button message sent', { to });
      return response.data;
    } catch (error) {
      logger.error('Failed to send button message', {
        to,
        error: error.message,
      });
      // Fallback to text message
      return this.sendTextMessage(to, bodyText);
    }
  }

  /**
   * Send message with list options
   * @param {string} to 
   * @param {string} bodyText 
   * @param {string} buttonText 
   * @param {Array} sections - Array of {title, rows: [{id, title, description}]}
   */
  async sendListMessage(to, bodyText, buttonText, sections) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: bodyText,
            },
            action: {
              button: buttonText,
              sections: sections,
            },
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('WhatsApp list message sent', { to });
      return response.data;
    } catch (error) {
      logger.error('Failed to send list message', {
        to,
        error: error.message,
      });
      // Fallback to text message
      return this.sendTextMessage(to, bodyText);
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId 
   */
  async markAsRead(messageId) {
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.debug('Message marked as read', { messageId });
    } catch (error) {
      logger.error('Failed to mark message as read', {
        messageId,
        error: error.message,
      });
    }
  }
}

module.exports = new WhatsAppService();