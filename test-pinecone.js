// test-pinecone.js   ← your test file

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function testPinecone() {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME;

    // Get index handle
    const index = pc.index(indexName);

    // Now call describeIndexStats
    const stats = await index.describeIndexStats();

    console.log('Index stats:', JSON.stringify(stats, null, 2));
    // === Test upsert a single dummy vector ===
const dummyVector = {
  id: "test-vector-1",
  values: Array(768).fill(0.1),           // fake 768-dim vector
  metadata: {
    text: "This is a test chunk from UEW homepage",
    source: "https://uew.edu.gh"
  }
};

await index.upsert([dummyVector]);

console.log("Dummy vector upserted successfully!");

// Wait a few seconds (eventual consistency in serverless)
await new Promise(r => setTimeout(r, 3000));

// Check stats again
const statsAfter = await index.describeIndexStats();
console.log("Stats after upsert:", JSON.stringify(statsAfter, null, 2));

    // Optional: with namespaces filter (very common)
    // const statsWithFilter = await index.describeIndexStats({
    //   describeIndexStatsRequest: { includeNamespaces: true }
    // });
    // console.log('Detailed stats:', statsWithFilter);

  } catch (error) {
    console.error('Pinecone error:', error.message);
    console.error(error);
  }
}

testPinecone();