const WA_SERVICE = process.env.WA_SERVICE_URL || "http://localhost:3002";

export async function POST() {
  try {
    const res  = await fetch(`${WA_SERVICE}/disconnect`, { method: "POST", cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ ok: false, error: "WA service offline" }, { status: 503 });
  }
}
