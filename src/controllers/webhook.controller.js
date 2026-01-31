const logger = require('../utils/logger');
const messageHandler = require('../services/message.handler');

exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed');
    res.sendStatus(403);
  }
};

exports.handleMessage = async (req, res) => {
  // Respond quickly to WhatsApp
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              // Process message asynchronously
              messageHandler.handleIncomingMessage(message, change.value).catch(err => {
                logger.error('Message handling error', { error: err.message });
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Webhook error', { error: error.message });
  }
};