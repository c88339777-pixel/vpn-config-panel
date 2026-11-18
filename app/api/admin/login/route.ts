import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_USER_ID } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// Used by the Android app: signs the admin in with Supabase Auth on the server,
// so the app never needs the Supabase keys. Returns the admin's session tokens.
export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json({ error: "تنظیمات سرور ناقص است" }, { status: 500 });
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "ایمیل و رمز مدیر الزامی است" }, { status: 400 });
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: "ایمیل یا رمز مدیر اشتباه است" }, { status: 401 });
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
