import { getEmbedding } from "../app/utils/embeddings";

async function main() {
  console.log("Testing getEmbedding function with text: 'Hello, Corsair Hackathon!'");
  try {
    const embedding = await getEmbedding("Hello, Corsair Hackathon!");
    console.log("✅ Success!");
    console.log("Vector dimensions:", embedding.length);
    console.log("First 10 values:", embedding.slice(0, 10));
  } catch (err: any) {
    console.error("❌ Test failed:", err.message);
  }
}

main();
