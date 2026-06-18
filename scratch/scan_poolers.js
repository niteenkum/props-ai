import pg from "pg";

const { Client } = pg;

const REGIONS = [
  "ap-southeast-1", // Singapore (Our target region based on IPv6)
  "ap-south-1",     // Mumbai
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
  "sa-east-1", "ca-central-1", "me-central-1", "af-south-1"
];

const INDICES = [0, 1, 2, 3];

async function testPooler(index, region) {
  const host = `aws-${index}-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.zvxilbynokgcuahfwxbb:Pitchly54321%40@${host}:6543/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`🎉 SUCCESS on host: ${host}!`);
    const res = await client.query("SELECT 1");
    console.log(`   QueryResult:`, res.rows[0]);
    return true;
  } catch (e) {
    if (e.message.includes("tenant/user postgres.zvxilbynokgcuahfwxbb not found")) {
      // The host exists but the tenant is on a different pooler or region
      console.log(`⚠️  Host ${host} is UP, but tenant not found here.`);
    } else if (!e.message.includes("ENOTFOUND") && !e.message.includes("getaddrinfo")) {
      console.log(`⚠️  Interesting response on ${host}:`, e.message);
    }
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log("Starting exhaustive scan of Supabase pooler hostnames...");
  for (const region of REGIONS) {
    for (const index of INDICES) {
      const success = await testPooler(index, region);
      if (success) {
        console.log(`\n🏆 FOUND IT! The correct connection pooler host is: aws-${index}-${region}.pooler.supabase.com`);
        return;
      }
    }
  }
  console.log("Exhaustive scan completed.");
}

main().catch(console.error);
