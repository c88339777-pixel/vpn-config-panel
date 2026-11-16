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

    const { data: account, error: accountError } =
      await adminSupabase
        .from("vpn_users")
        .select("plan_start, plan_expires_at, total_gb, used_gb")
        .eq("id", user.id)
        .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "خطا در دریافت اطلاعات اشتراک" },
        { status: 500 }
      );
    }

    const now = Date.now();

    const startsAt = account.plan_start
      ? new Date(account.plan_start).getTime()
      : null;

    const expiresAt = account.plan_expires_at
      ? new Date(account.plan_expires_at).getTime()
      : null;

    const totalGb =
      account.total_gb === null ? null : Number(account.total_gb);

    const usedGb = Number(account.used_gb || 0);

    if (startsAt !== null && startsAt > now) {
      return NextResponse.json(
        { error: "اشتراک شما هنوز شروع نشده است" },
        { status: 403 }
      );
    }

    const expired = expiresAt !== null && expiresAt <= now;
    const volumeFinished =
      totalGb !== null && usedGb >= totalGb;

    if (expired || volumeFinished) {
      await adminSupabase
        .from("vpn_user_sessions")
        .delete()
        .eq("user_id", user.id);

      return NextResponse.json(
        {
          error: expired
            ? "اشتراک شما منقضی شده است"
            : "حجم اشتراک شما به پایان رسیده است",
        },
        { status: 403 }
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

    let configs: any[] = [];

    if (configIds.length > 0) {
      const { data, error: configError } =
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

      configs = data || [];
    }

    return NextResponse.json({
      username: user.username,
      configs,
      subscription: {
        plan_start: account.plan_start,
        plan_expires_at: account.plan_expires_at,
        total_gb: totalGb,
        used_gb: usedGb,
        remaining_gb:
          totalGb === null
            ? null
            : Math.max(0, totalGb - usedGb),
      },
    });
  } catch (error) {
    console.error("User configs error:", error);

    return NextResponse.json(
      { error: "خطای داخلی سرور" },
      { status: 500 }
    );
  }
}
