import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "../../../../../../lib/server-supabase";
import { isAdmin } from "../../../../../../lib/admin-auth";

export const runtime = "nodejs";

type Context = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: Context) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { data, error } = await adminSupabase
    .from("vpn_user_configs")
    .select("config_id")
    .eq("user_id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "خطا در دریافت کانفیگ‌ها" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    configIds: (data || []).map((item) => item.config_id),
  });
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const configId =
      typeof body.configId === "string" ? body.configId.trim() : "";

    if (!configId || configId.length > 100) {
      return NextResponse.json(
        { error: "شناسه کانفیگ نامعتبر است" },
        { status: 400 }
      );
    }

    const { data: config, error: configError } = await adminSupabase
      .from("vpn_configs")
      .select("id")
      .eq("id", configId)
      .maybeSingle();

    if (configError || !config) {
      return NextResponse.json(
        { error: "کانفیگ پیدا نشد" },
        { status: 404 }
      );
    }

    const { error } = await adminSupabase
      .from("vpn_user_configs")
      .insert({
        user_id: params.id,
        config_id: String(config.id),
      });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.code === "23505"
              ? "این کانفیگ قبلاً به کاربر اختصاص داده شده"
              : "خطا در اختصاص کانفیگ",
        },
        { status: error.code === "23505" ? 409 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "درخواست نامعتبر است" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const configId =
      typeof body.configId === "string" ? body.configId.trim() : "";

    if (!configId) {
      return NextResponse.json(
        { error: "شناسه کانفیگ لازم است" },
        { status: 400 }
      );
    }

    const { error } = await adminSupabase
      .from("vpn_user_configs")
      .delete()
      .eq("user_id", params.id)
      .eq("config_id", configId);

    if (error) {
      return NextResponse.json(
        { error: "خطا در حذف دسترسی کانفیگ" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "درخواست نامعتبر است" },
      { status: 400 }
    );
  }
}
