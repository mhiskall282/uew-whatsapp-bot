// In pineconeService.js or a new test-ingest.js

const { upsertToPinecone } = require('./services/pineconeService'); // adjust path

async function testRealUpsert() {
  const sampleChunks = [
    {
      id: "uew-home-1",
      text: "The University of Education, Winneba (UEW) was established in 1992. It has two main campuses: Winneba and Ajumako.",
      source: "https://uew.edu.gh/about"
    },
    {
      id: "uew-home-2",
      text: "North Campus is also known as Simpa A. It hosts faculties like Science Education and Business.",
      source: "https://uew.edu.gh/campuses"
    }
  ];

  await upsertToPinecone(sampleChunks);
  console.log("Real chunks upserted!");

  // Optional: check stats after
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  const stats = await index.describeIndexStats();
  console.log("Current stats:", stats);
}

testRealUpsert().catch(console.error);