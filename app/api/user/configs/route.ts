import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "../../../../lib/server-supabase";
import { getCurrentUser } from "../../../../lib/user-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "لطفاً دوباره وارد حساب خود شوید" },
        { status: 401 }
      );
    }

    const { data: assignments, error: assignmentError } =
      await adminSupabase
        .from("vpn_user_configs")
        .select("config_id")
        .eq("user_id", user.id);

    if (assignmentError) {
      return NextResponse.json(
        { error: "خطا در دریافت کانفیگ‌های اختصاصی" },
        { status: 500 }
      );
    }

    const configIds = (assignments || []).map(
      (item) => item.config_id
    );

    if (configIds.length === 0) {
      return NextResponse.json({
        username: user.username,
        configs: [],
      });
    }

    const { data: configs, error: configError } =
      await adminSupabase
        .from("vpn_configs")
        .select("*")
        .in("id", configIds)
        .eq("active", true);

    if (configError) {
      return NextResponse.json(
        { error: "خطا در دریافت اطلاعات کانفیگ‌ها" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      username: user.username,
      configs: configs || [],
    });
  } catch {
    return NextResponse.json(
      { error: "خطای داخلی سرور" },
      { status: 500 }
    );
  }
}
