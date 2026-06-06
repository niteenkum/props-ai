const WA_SERVICE = process.env.WA_SERVICE_URL || "http://localhost:3002";

export async function GET() {
  try {
    const res  = await fetch(`${WA_SERVICE}/groups`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ groups: [], error: "WA service offline" }, { status: 503 });
  }
}
