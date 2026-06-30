import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVICE_URL = process.env.MERTH_SERVICE_URL ?? "http://localhost:8000";

interface PlanRequestBody {
  cartUrl?: string;
  storeId?: string;
}

/**
 * Thin same-origin proxy to the Python service (../service). The browser never
 * talks to the service directly; all routing/scraping logic lives in Python.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: PlanRequestBody;
  try {
    body = (await request.json()) as PlanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.cartUrl || !body.storeId) {
    return NextResponse.json(
      { error: "Provide both a shared-cart URL and a store ID." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${SERVICE_URL}/plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cartUrl: body.cartUrl, storeId: body.storeId }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message =
        (data?.detail?.message as string | undefined) ??
        (typeof data?.detail === "string" ? data.detail : undefined) ??
        (data?.error as string | undefined) ??
        "Route planning failed.";
      return NextResponse.json({ error: message }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: `Could not reach the MERTH service at ${SERVICE_URL}. Is it running?` },
      { status: 502 },
    );
  }
}
