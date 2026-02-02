// const express = require('express');
// const router = express.Router();
// const logger = require('../utils/logger');

// /**
//  * GET /webhook
//  * Webhook verification endpoint for WhatsApp
//  */
// router.get('/', (req, res) => {
//   const mode = req.query['hub.mode'];
//   const token = req.query['hub.verify_token'];
//   const challenge = req.query['hub.challenge'];

//   logger.info('Webhook verification request', { mode, token });

//   if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
//     logger.info('✓ Webhook verified successfully');
//     res.status(200).send(challenge);
//   } else {
//     logger.warn('✗ Webhook verification failed');
//     res.sendStatus(403);
//   }
// });

// /**
//  * POST /webhook
//  * Receive WhatsApp messages
//  */
// router.post('/', async (req, res) => {
//   // Always respond quickly to WhatsApp
//   res.sendStatus(200);

//   // Import message handler (lazy load to avoid circular dependencies)
//   const messageHandler = require('../services/message.handler');

//   try {
//     const body = req.body;

//     logger.debug('Webhook received', { body: JSON.stringify(body) });

//     // Check if it's a WhatsApp message event
//     if (body.object !== 'whatsapp_business_account') {
//       logger.warn('Not a WhatsApp business account event');
//       return;
//     }

//     // Process each entry
//     for (const entry of body.entry || []) {
//       for (const change of entry.changes || []) {
//         // Check for messages
//         if (change.value?.messages) {
//           for (const message of change.value.messages) {
//             logger.info('Message received', {
//               from: message.from,
//               type: message.type,
//               messageId: message.id,
//             });

//             // Process message asynchronously
//             messageHandler.handleIncomingMessage(message, change.value)
//               .catch(err => {
//                 logger.error('Message processing failed', {
//                   error: err.message,
//                   messageId: message.id,
//                 });
//               });
//           }
//         }

//         // Check for status updates
//         if (change.value?.statuses) {
//           for (const status of change.value.statuses) {
//             logger.debug('Status update', {
//               id: status.id,
//               status: status.status,
//             });
//           }
//         }
//       }
//     }
//   } catch (error) {
//     logger.error('Webhook processing error', {
//       error: error.message,
//       stack: error.stack,
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /webhook - WhatsApp webhook verification
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Webhook verification request received', {
    mode,
    token,
    challenge: challenge ? '[present]' : '[missing]',
    query: req.query,
  });

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed', { mode, token });
  return res.sendStatus(403);
});

/**
 * POST /webhook - Receive WhatsApp events (messages + statuses)
 */
router.post('/', async (req, res) => {
  // Always acknowledge immediately – Meta requires fast 200 response
  res.sendStatus(200);

  try {
    const body = req.body;

    // Log the FULL raw payload for debugging (mask sensitive parts if needed in prod)
    logger.debug('WhatsApp webhook POST received', {
      body: JSON.stringify(body, null, 2),
      headers: req.headers['content-type'],
    });

    // Basic validation – more tolerant than strict equality
    if (!body || typeof body !== 'object') {
      logger.warn('Invalid webhook payload: not an object');
      return;
    }

    // Check for WhatsApp Business Account event (allow missing or unexpected object field)
    const isWhatsAppEvent =
      body.object === 'whatsapp_business_account' ||
      (body.entry && body.entry.some(e => e.changes?.some(c => c.field === 'messages')));

    if (!isWhatsAppEvent) {
      logger.warn('Payload does not appear to be a valid WhatsApp Business event', {
        hasEntry: !!body.entry,
        hasChanges: body.entry?.some(e => !!e.changes),
        objectValue: body.object,
      });
      return;
    }

    logger.info('Valid WhatsApp event received');

    // Process entries
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        // Handle incoming messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            logger.info('Incoming message detected', {
              from: message.from,
              type: message.type,
              id: message.id,
              timestamp: message.timestamp,
            });

            // Lazy-load handler to avoid circular imports
            const messageHandler = require('../services/message.handler');

            // Process async – don't block webhook response
            messageHandler
              .handleIncomingMessage(message, value)
              .catch(err => {
                logger.error('Message handler failed', {
                  error: err.message,
                  stack: err.stack,
                  messageId: message.id,
                });
              });
          }
        }

        // Handle status updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            logger.info('Message status update', {
              messageId: status.id,
              status: status.status,
              recipient: status.recipient_id,
              timestamp: status.timestamp,
            });
            // Optional: update your DB with delivery/read status
          }
        }
      }
    }
  } catch (error) {
    logger.error('Critical webhook processing error', {
      error: error.message,
      stack: error.stack,
    });
    // Still respond 200 – Meta doesn't care about your internal errors
  }
});

module.exports = router;