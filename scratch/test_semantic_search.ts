import { localSemanticSearchAction } from "../app/actions/vector-search-actions";

async function main() {
  console.log("=== Testing Local Semantic Search Action ===");
  try {
    const res = await localSemanticSearchAction("React developer", "niteen.kumar014@gmail.com");
    if (res.success) {
      console.log("✅ Semantic search executed successfully!");
      console.log("Emails found:", res.emails.length);
      console.log("Calendar events found:", res.calendar.length);
    } else {
      console.error("❌ Search failed:", res.error);
    }
  } catch (err: any) {
    console.error("❌ Unexpected error during test:", err.message);
  }
}

main();
