const apiKey = "AQ.Ab8RN6LtbvLxe5RzZ7Ko6V4MX7XnXFPg8Ws7OyqrKAm07J_vfw";
const endpoint = "https://stitch.googleapis.com/mcp";

async function makeRequest(method, params = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
  }
  
  return response.json();
}

async function run() {
  try {
    const toolsResult = await makeRequest("tools/list");
    const tools = toolsResult.result.tools || [];
    console.log("Found tools:");
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
      console.log("  Input schema keys:", Object.keys(tool.inputSchema.properties || {}));
    }
  } catch (error) {
    console.error("Error calling Stitch MCP:", error);
  }
}

run();
