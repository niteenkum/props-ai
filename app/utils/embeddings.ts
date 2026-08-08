/**
 * Gemini Text Embeddings Utility
 * Powered by gemini-embedding-2
 * NOTE: Embeddings require GEMINI_API_KEY directly — OpenRouter does not proxy embedding models.
 */

export async function getEmbedding(text: string): Promise<number[]> {
  const rawApiKey = process.env.GEMINI_API_KEY;
  if (!rawApiKey) {
    throw new Error("GEMINI_API_KEY is required for embeddings (OpenRouter does not support embedding models).");
  }
  
  // Sanitize the API key by removing outer quotes if present
  const apiKey = rawApiKey.replace(/^"|"$/g, "").trim();

  // Sanitize text: remove excessive whitespace, truncate to fit model context (around 2048 tokens / ~8000 chars)
  const cleanText = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!cleanText) {
    // Return a zero-vector if text is empty to prevent failure
    return new Array(768).fill(0);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: {
          parts: [{ text: cleanText }],
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Embeddings API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const values = data.embedding?.values;
    if (!values || !Array.isArray(values)) {
      throw new Error("Invalid embedding response format from Gemini API");
    }

    return values;
  } catch (err: any) {
    console.error("[getEmbedding] Failed to generate embedding:", err);
    throw err;
  }
}
