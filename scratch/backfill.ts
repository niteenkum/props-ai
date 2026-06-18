import { backfillEmbeddingsAction } from "../app/actions/vector-search-actions";

async function main() {
  console.log("=== Starting Vector Embedding Backfill on Supabase ===");
  try {
    const result = await backfillEmbeddingsAction();
    if (result.success) {
      console.log("✅ Backfill completed successfully!");
      console.log("Synced Emails embedded:", result.emailsCount);
      console.log("Calendar Events embedded:", result.calendarCount);
    } else {
      console.error("❌ Backfill failed:", result.error);
    }
  } catch (err: any) {
    console.error("❌ Unexpected error during backfill:", err.message);
  }
}

main();
