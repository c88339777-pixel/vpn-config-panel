import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "../../../../lib/server-supabase";
import { hashToken } from "../../../../lib/user-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("vpn_user_session")?.value;

  if (token) {
    await adminSupabase
      .from("vpn_user_sessions")
      .delete()
      .eq("token_hash", hashToken(token));
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("vpn_user_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
