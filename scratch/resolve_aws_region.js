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

function parseIpv6(ip) {
  // expand shorthand and return array of 8 16-bit blocks
  const parts = ip.split("::");
  let left = parts[0] ? parts[0].split(":") : [];
  let right = parts[1] ? parts[1].split(":") : [];
  if (parts.length > 1) {
    const missing = 8 - (left.length + right.length);
    const mid = Array(missing).fill("0");
    left = left.concat(mid).concat(right);
  }
  return left.map(x => parseInt(x || "0", 16));
}

function matchPrefix(ipBlocks, prefixStr) {
  const [prefixIp, bitsStr] = prefixStr.split("/");
  const bits = parseInt(bitsStr, 10);
  const prefixBlocks = parseIpv6(prefixIp);

  let remainingBits = bits;
  for (let i = 0; i < 8; i++) {
    if (remainingBits <= 0) return true;
    const mask = remainingBits >= 16 ? 0xffff : (0xffff << (16 - remainingBits)) & 0xffff;
    if ((ipBlocks[i] & mask) !== (prefixBlocks[i] & mask)) {
      return false;
    }
    remainingBits -= 16;
  }
  return true;
}

async function main() {
  const targetIp = "2406:da18:e5c:b700:8b50:2fb0:446d:d863";
  const targetBlocks = parseIpv6(targetIp);
  console.log("Fetching AWS IP ranges...");
  const data = await fetchJson("https://ip-ranges.amazonaws.com/ip-ranges.json");

  console.log("Searching...");
  for (const item of data.ipv6_prefixes) {
    if (matchPrefix(targetBlocks, item.ipv6_prefix)) {
      console.log("MATCH FOUND:", item);
    }
  }
}

main().catch(console.error);
