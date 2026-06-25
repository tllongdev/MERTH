import { NextResponse } from "next/server";
import { planDemo, planLive } from "@/lib/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlanRequestBody {
  mode?: "demo" | "live";
  cartUrl?: string;
  storeId?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: PlanRequestBody;
  try {
    body = (await request.json()) as PlanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode ?? "demo";

  try {
    if (mode === "demo") {
      return NextResponse.json(planDemo());
    }

    if (!body.cartUrl || !body.storeId) {
      return NextResponse.json(
        { error: "Live mode requires both a shared-cart URL and a store ID." },
        { status: 400 },
      );
    }
    const result = await planLive(body.cartUrl, body.storeId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error planning route.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
