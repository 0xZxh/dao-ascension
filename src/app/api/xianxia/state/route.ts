import { NextRequest, NextResponse } from "next/server";
import { getXianxiaWorldSnapshot } from "@/lib/xianxia/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
    const snapshot = await getXianxiaWorldSnapshot(accountId);
    return NextResponse.json({
      ok: true,
      snapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取仙途世界状态失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
