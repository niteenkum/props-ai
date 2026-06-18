import pg from "pg";

const { Client } = pg;

async function testPooler(host) {
  const connectionString = `postgresql://postgres.zvxilbynokgcuahfwxbb:Pitchly54321%40@${host}:6543/postgres`;
  console.log(`🔌 Testing ${host}...`);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`✅ SUCCESS on ${host}!`);
    const res = await client.query("SELECT 1");
    console.log(`   QueryResult:`, res.rows[0]);
  } catch (e) {
    console.error(`❌ FAILED on ${host}:`, e.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await testPooler("aws-0-ap-southeast-1.pooler.supabase.com");
  await testPooler("aws-0-ap-south-1.pooler.supabase.com");
}

main().catch(console.error);
