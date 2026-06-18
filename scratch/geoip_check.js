import https from "https";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  const ip = "2406:da18:e5c:b700:8b50:2fb0:446d:d863";
  console.log(`Querying Geolocation for IP: ${ip}...`);
  try {
    const geo = await fetchJson(`https://freeipapi.com/api/json/${ip}`);
    console.log("FreeIPAPI Result:", JSON.stringify(geo, null, 2));
  } catch (e) {
    console.error("Failed to query freeipapi.com:", e.message);
  }
}

main().catch(console.error);
