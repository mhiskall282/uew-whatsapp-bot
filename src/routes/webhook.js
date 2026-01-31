const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /webhook
 * Webhook verification endpoint for WhatsApp
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Webhook verification request', { mode, token });

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('✓ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('✗ Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * Receive WhatsApp messages
 */
router.post('/', async (req, res) => {
  // Always respond quickly to WhatsApp
  res.sendStatus(200);

  // Import message handler (lazy load to avoid circular dependencies)
  const messageHandler = require('../services/message.handler');

  try {
    const body = req.body;

    logger.debug('Webhook received', { body: JSON.stringify(body) });

    // Check if it's a WhatsApp message event
    if (body.object !== 'whatsapp_business_account') {
      logger.warn('Not a WhatsApp business account event');
      return;
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        // Check for messages
        if (change.value?.messages) {
          for (const message of change.value.messages) {
            logger.info('Message received', {
              from: message.from,
              type: message.type,
              messageId: message.id,
            });

            // Process message asynchronously
            messageHandler.handleIncomingMessage(message, change.value)
              .catch(err => {
                logger.error('Message processing failed', {
                  error: err.message,
                  messageId: message.id,
                });
              });
          }
        }

        // Check for status updates
        if (change.value?.statuses) {
          for (const status of change.value.statuses) {
            logger.debug('Status update', {
              id: status.id,
              status: status.status,
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
    });
  }
});

module.exports = router;