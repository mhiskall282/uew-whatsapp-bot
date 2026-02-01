const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../utils/logger');

let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone client
 */
const initPinecone = async () => {
  try {
    if (!process.env.PINECONE_API_KEY) {
      logger.warn('Pinecone API key not found, vector search will be disabled');
      return null;
    }

    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'uew-knowledge';
    
    // Check if index exists, if not create it
    const indexList = await pineconeClient.listIndexes();
    const indexExists = indexList.indexes.some(index => index.name === indexName);
    
    if (!indexExists) {
      logger.info(`Creating Pinecone index: ${indexName}`);
      await pineconeClient.createIndex({
        name: indexName,
        dimension: 768, // Gemini embedding dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      logger.info(`Pinecone index created: ${indexName}`);
    }

    pineconeIndex = pineconeClient.index(indexName);
    logger.info('Pinecone client initialized successfully');
    
    return pineconeIndex;
  } catch (error) {
    logger.error('Failed to initialize Pinecone', { error: error.message });
    return null;
  }
};

/**
 * Get Pinecone index
 */
const getIndex = async () => {
  if (!pineconeIndex) {
    await initPinecone();
  }
  return pineconeIndex;
};

/**
 * Upsert vectors to Pinecone
 * @param {Array} vectors - Array of {id, values, metadata}
 */
const upsertVectors = async (vectors) => {
  try {
    const index = await getIndex();
    if (!index) {
      throw new Error('Pinecone index not initialized');
    }

    await index.upsert(vectors);
    logger.info(`Upserted ${vectors.length} vectors to Pinecone`);
    return true;
  } catch (error) {
    logger.error('Failed to upsert vectors', { error: error.message });
    return false;
  }
};

/**
 * Query Pinecone for similar vectors
 * @param {Array} queryVector - Query embedding
 * @param {number} topK - Number of results to return
 * @param {Object} filter - Metadata filter
 */
const queryVectors = async (queryVector, topK = 5, filter = {}) => {
  try {
    const index = await getIndex();
    if (!index) {
      throw new Error('Pinecone index not initialized');
    }

    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return queryResponse.matches || [];
  } catch (error) {
    logger.error('Failed to query vectors', { error: error.message });
    return [];
  }
};

/**
 * Delete vectors from Pinecone
 * @param {Array} ids - Array of vector IDs to delete
 */
const deleteVectors = async (ids) => {
  try {
    const index = await getIndex();
    if (!index) {
      throw new Error('Pinecone index not initialized');
    }

    await index.deleteMany(ids);
    logger.info(`Deleted ${ids.length} vectors from Pinecone`);
    return true;
  } catch (error) {
    logger.error('Failed to delete vectors', { error: error.message });
    return false;
  }
};

module.exports = {
  initPinecone,
  getIndex,
  upsertVectors,
  queryVectors,
  deleteVectors,
};
