const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
  }

  /**
   * Generate text response
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateText(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      logger.error('Gemini generateText error', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate embedding vector
   * @param {string} text 
   * @returns {Promise<Array<number>>}
   */
  async generateEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error('Gemini generateEmbedding error', { error: error.message });
      throw error;
    }
  }

  /**
   * Classify user intent
   * @param {string} message 
   * @returns {Promise<{intent: string, confidence: number, entities: Object}>}
   */
  async classifyIntent(message) {
    const prompt = `
You are an intent classifier for a university campus assistant chatbot.

User message: "${message}"

Classify the message into ONE of these intents:
1. NAVIGATION - User wants directions or location info (e.g., "How do I get to...", "Where is...", "I'm at X, need to go to Y")
2. FAQ - General questions about the university (departments, facilities, schedules, admission, etc.)
3. WEBSITE_SEARCH - Questions about recent news, announcements, or specific information from the university website
4. FEEDBACK - User wants to give feedback or rating
5. GREETING - General greetings like hi, hello, good morning
6. HELP - User asks for help or doesn't know what to do
7. OTHER - Anything else

Also extract relevant entities:
- For NAVIGATION: extract origin and destination locations
- For FAQ: extract the topic being asked about
- For WEBSITE_SEARCH: extract search keywords

Respond ONLY with valid JSON in this exact format:
{
  "intent": "NAVIGATION|FAQ|WEBSITE_SEARCH|FEEDBACK|GREETING|HELP|OTHER",
  "confidence": 0.0-1.0,
  "entities": {
    "origin": "location name or null",
    "destination": "location name or null",
    "topic": "topic name or null",
    "keywords": ["keyword1", "keyword2"] or []
  }
}`;

    try {
      const response = await this.generateText(prompt);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      logger.info('Intent classified', {
        message: message.substring(0, 50),
        intent: result.intent,
        confidence: result.confidence,
      });
      
      return result;
    } catch (error) {
      logger.error('Intent classification failed', { error: error.message });
      
      // Fallback classification
      return {
        intent: 'OTHER',
        confidence: 0.3,
        entities: {},
      };
    }
  }

  /**
   * Answer FAQ question using context
   * @param {string} question 
   * @param {string} context 
   * @returns {Promise<string>}
   */
  async answerQuestion(question, context = '') {
    const prompt = `
You are a helpful assistant for the University of Education, Winneba (UEW).

${context ? `Context from knowledge base:\n${context}\n\n` : ''}

User question: ${question}

Provide a helpful, accurate answer. If you're not certain about something, say so.
Keep the response concise and friendly. If the context doesn't contain the answer, 
say "I don't have specific information about that" and suggest the user contact the university directly.

Response:`;

    try {
      const answer = await this.generateText(prompt);
      return answer.trim();
    } catch (error) {
      logger.error('Answer generation failed', { error: error.message });
      return "I'm having trouble processing your question right now. Please try again later.";
    }
  }

  /**
   * Generate summary of content
   * @param {string} content 
   * @returns {Promise<string>}
   */
  async generateSummary(content) {
    const prompt = `
Summarize the following content in 2-3 sentences. Focus on the most important information.

Content:
${content}

Summary:`;

    try {
      const summary = await this.generateText(prompt);
      return summary.trim();
    } catch (error) {
      logger.error('Summary generation failed', { error: error.message });
      return '';
    }
  }
}

module.exports = new GeminiService();