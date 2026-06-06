// Proxy to WA service
const WA_SERVICE = process.env.WA_SERVICE_URL || "http://localhost:3002";

export async function GET() {
  try {
    const res = await fetch(`${WA_SERVICE}/status`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ connected: false, hasQR: false, error: "WA service offline" }, { status: 503 });
  }
}
