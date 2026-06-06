const WA_SERVICE = process.env.WA_SERVICE_URL || "http://localhost:3002";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  try {
    const res  = await fetch(
      `${WA_SERVICE}/messages/${encodeURIComponent(groupId)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ messages: [], error: "WA service offline" }, { status: 503 });
  }
}
