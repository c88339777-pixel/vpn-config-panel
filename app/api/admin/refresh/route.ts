import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_USER_ID } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// Used by the Android app to renew the admin session without asking for the password again.
export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json({ error: "تنظیمات سرور ناقص است" }, { status: 500 });
    }

    const body = await request.json();
    const refreshToken =
      typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";

    if (!refreshToken) {
      return NextResponse.json({ error: "نشست نامعتبر است" }, { status: 400 });
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: "نشست منقضی شده است" }, { status: 401 });
    }

    if (data.user.id !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "این حساب مدیر نیست" }, { status: 403 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
}
