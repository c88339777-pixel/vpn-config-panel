import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "../../../../lib/server-supabase";
import { isAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { data, error } = await adminSupabase
    .from("vpn_configs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configs: data || [] });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, type, config } = body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof type !== "string" || !type.trim() ||
      typeof config !== "string" || !config.trim()
    ) {
      return NextResponse.json({ error: "اطلاعات کانفیگ معتبر نیست" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("vpn_configs")
      .insert([{ name: name.trim(), type, config, active: true }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, type, config, active } = body;

    if (
      (typeof id !== "string" && typeof id !== "number") ||
      (name === undefined && type === undefined &&
       config === undefined && active === undefined)
    ) {
      return NextResponse.json({ error: "اطلاعات ویرایش معتبر نیست" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "نام معتبر نیست" }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (type !== undefined) {
      if (typeof type !== "string" || !type.trim()) {
        return NextResponse.json({ error: "نوع کانفیگ معتبر نیست" }, { status: 400 });
      }
      updates.type = type;
    }

    if (config !== undefined) {
      if (typeof config !== "string" || !config.trim()) {
        return NextResponse.json({ error: "متن کانفیگ معتبر نیست" }, { status: 400 });
      }
      updates.config = config;
    }

    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return NextResponse.json({ error: "وضعیت معتبر نیست" }, { status: 400 });
      }
      updates.active = active;
    }

    const { data, error } = await adminSupabase
      .from("vpn_configs")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "کانفیگ پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json({ config: data });
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    if (typeof id !== "string" && typeof id !== "number") {
      return NextResponse.json({ error: "شناسه معتبر نیست" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("vpn_configs")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "کانفیگ پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
    }
