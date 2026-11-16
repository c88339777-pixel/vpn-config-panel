import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "../../../../lib/server-supabase";
import { hashPassword } from "../../../../lib/user-auth";
import { isAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { data, error } = await adminSupabase
    .from("vpn_users")
    .select("id, username, active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "خطا در دریافت کاربران" }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "نام کاربری باید ۳ تا ۳۰ حرف انگلیسی یا عدد باشد" },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 200) {
      return NextResponse.json(
        { error: "رمز باید حداقل ۸ و حداکثر ۲۰۰ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    const { data, error } = await adminSupabase
      .from("vpn_users")
      .insert({
        username,
        password_hash,
        active: true,
      })
      .select("id, username, active, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.code === "23505" ? "این نام کاربری قبلاً ثبت شده" : "خطا در ساخت کاربر" },
        { status: error.code === "23505" ? 409 : 500 }
      );
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json({ error: "شناسه کاربر لازم است" }, { status: 400 });
    }

    const updates: {
      active?: boolean;
      password_hash?: string;
    } = {};

    if (typeof body.active === "boolean") {
      updates.active = body.active;
    }

    if (typeof body.password === "string") {
      if (body.password.length < 8 || body.password.length > 200) {
        return NextResponse.json(
          { error: "رمز باید حداقل ۸ کاراکتر باشد" },
          { status: 400 }
        );
      }

      updates.password_hash = await hashPassword(body.password);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "تغییری ارسال نشده" }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from("vpn_users")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "خطا در ویرایش کاربر" }, { status: 500 });
    }

    // با تغییر رمز یا غیرفعال کردن کاربر، نشست‌های قبلی باطل می‌شوند.
    if (updates.password_hash || updates.active === false) {
      await adminSupabase
        .from("vpn_user_sessions")
        .delete()
        .eq("user_id", id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json({ error: "شناسه کاربر لازم است" }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from("vpn_users")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
}
