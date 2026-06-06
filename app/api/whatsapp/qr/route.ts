const WA_SERVICE = process.env.WA_SERVICE_URL || "http://localhost:3002";

export async function GET() {
  try {
    const res  = await fetch(`${WA_SERVICE}/qr`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ connected: false, qr: null, error: "WA service offline" }, { status: 503 });
  }
}
