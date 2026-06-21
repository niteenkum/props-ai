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
    const projectId = "743249057741030649";
    const screenId = "62644e60218048f99910b75841ddd491";

    console.log(`Fetching screen ${screenId} from project ${projectId}...`);
    const screenResult = await makeRequest("tools/call", {
      name: "get_screen",
      arguments: {
        projectId,
        screenId
      }
    });

    console.log("Screen Details Result:", JSON.stringify(screenResult, null, 2));
  } catch (error) {
    console.error("Error calling Stitch MCP:", error);
  }
}

run();
