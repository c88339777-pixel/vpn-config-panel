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
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const { data: user, error } = await adminSupabase
      .from("vpn_users")
      .select("id, username, password_hash, active")
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

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await adminSupabase
      .from("vpn_user_sessions")
      .insert({
        user_id: user.id,
        token_hash: hashToken(token),
        expires_at: expiresAt.toISOString(),
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
      expires: expiresAt,
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
