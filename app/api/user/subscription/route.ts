import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import {
  buildSubscriptionUrl,
  ensureSubToken,
  regenerateSubToken,
} from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "لطفاً دوباره وارد حساب خود شوید" },
        { status: 401, headers: NO_STORE }
      );
    }

    const token = await ensureSubToken(user.id);

    return NextResponse.json(
      { url: buildSubscriptionUrl(request, token) },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("User subscription link error:", error);
    return NextResponse.json(
      { error: "خطا در ساخت لینک اشتراک" },
      { status: 500, headers: NO_STORE }
    );
  }
}

/** Creates a new link and invalidates the old one. */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "لطفاً دوباره وارد حساب خود شوید" },
        { status: 401, headers: NO_STORE }
      );
    }

    const token = await regenerateSubToken(user.id);

    return NextResponse.json(
      { url: buildSubscriptionUrl(request, token) },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("User subscription regenerate error:", error);
    return NextResponse.json(
      { error: "خطا در ساخت لینک جدید" },
      { status: 500, headers: NO_STORE }
    );
  }
}
