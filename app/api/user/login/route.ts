import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/server-supabase";
import {
  verifyPassword,
  createSessionToken,
  hashToken,
} from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const { data: user, error } = await adminSupabase
      .from("vpn_users")
      .select(
        "id, username, password_hash, active, plan_start, plan_expires_at, total_gb, used_gb"
      )
      .eq("username", username)
      .maybeSingle();

    if (error || !user || !user.active) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const now = Date.now();

    const startsAt = user.plan_start
      ? new Date(user.plan_start).getTime()
      : null;

    const expiresAt = user.plan_expires_at
      ? new Date(user.plan_expires_at).getTime()
      : null;

    const totalGb =
      user.total_gb === null ? null : Number(user.total_gb);

    const usedGb = Number(user.used_gb || 0);

    if (startsAt !== null && startsAt > now) {
      return NextResponse.json(
        { error: "اشتراک شما هنوز شروع نشده است" },
        { status: 403 }
      );
    }

    if (expiresAt !== null && expiresAt <= now) {
      return NextResponse.json(
        { error: "اشتراک شما منقضی شده است. لطفاً تمدید کنید" },
        { status: 403 }
      );
    }

    if (totalGb !== null && usedGb >= totalGb) {
      return NextResponse.json(
        { error: "حجم اشتراک شما به پایان رسیده است" },
        { status: 403 }
      );
    }

    const token = createSessionToken();
    const sessionExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const { error: insertError } = await adminSupabase
      .from("vpn_user_sessions")
      .insert({
        user_id: user.id,
        token_hash: hashToken(token),
        expires_at: sessionExpiresAt.toISOString(),
      });

    if (insertError) throw insertError;

    const response = NextResponse.json({
      success: true,
      username: user.username,
    });

    response.cookies.set("vpn_user_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiresAt,
    });

    return response;
  } catch (error) {
    console.error("User login error:", error);

    return NextResponse.json(
      { error: "خطا در ارتباط با سرور" },
      { status: 500 }
    );
  }
}
