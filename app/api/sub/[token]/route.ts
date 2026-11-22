import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/server-supabase";
import { SUB_PROFILE_TITLE, SUB_TOKEN_PATTERN } from "@/lib/subscription";
import { getFreeLinks } from "@/lib/free-servers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GB = 1024 * 1024 * 1024;

// Only URI-style configs (vless://, vmess://, trojan://, ss://, hysteria2://, ...)
// can be placed in a standard subscription. Raw WireGuard/JSON blocks are skipped.
const URI_CONFIG = /^[a-z][a-z0-9+.-]*:\/\/\S+$/i;

function plain(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!SUB_TOKEN_PATTERN.test(token)) return plain("Not found", 404);

    const { data: user, error } = await adminSupabase
      .from("vpn_users")
      .select(
        "id, active, plan_start, plan_expires_at, total_gb, used_gb"
      )
      .eq("sub_token", token)
      .maybeSingle();

    // Same answer for "no such link" and "disabled account".
    if (error || !user || !user.active) return plain("Not found", 404);

    const now = Date.now();
    const startsAt = user.plan_start ? new Date(user.plan_start).getTime() : null;
    const expiresAt = user.plan_expires_at
      ? new Date(user.plan_expires_at).getTime()
      : null;
    const totalGb = user.total_gb === null ? null : Number(user.total_gb);
    const usedGb = Number(user.used_gb || 0);

    if (startsAt !== null && startsAt > now) {
      return plain("Subscription has not started yet", 403);
    }
    if (expiresAt !== null && expiresAt <= now) {
      return plain("Subscription expired", 403);
    }
    if (totalGb !== null && usedGb >= totalGb) {
      return plain("Data quota finished", 403);
    }

    const { data: assignments, error: assignmentError } = await adminSupabase
      .from("vpn_user_configs")
      .select("config_id")
      .eq("user_id", user.id);

    if (assignmentError) return plain("Server error", 500);

    const configIds = (assignments || []).map((item) => item.config_id);
    const lines: string[] = [];

    if (configIds.length > 0) {
      const { data: configs, error: configError } = await adminSupabase
        .from("vpn_configs")
        .select("config, created_at")
        .in("id", configIds)
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (configError) return plain("Server error", 500);

      for (const item of configs || []) {
        for (const raw of String(item.config || "").split(/\r?\n/)) {
          const line = raw.trim();
          if (URI_CONFIG.test(line) && !lines.includes(line)) lines.push(line);
        }
      }
    }

    // The same free public servers the Android app collects, listed after the user's own configs.
    try {
      for (const link of await getFreeLinks()) {
        if (!lines.includes(link)) lines.push(link);
      }
    } catch (freeError) {
      console.error("Free servers could not be added:", freeError);
    }

    const body = Buffer.from(lines.join("\n"), "utf8").toString("base64");

    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
      "Profile-Update-Interval": "6",
      "Profile-Title": `base64:${Buffer.from(SUB_PROFILE_TITLE, "utf8").toString("base64")}`,
      // total=0 / expire=0 mean "unlimited" for most clients.
      "Subscription-Userinfo": [
        "upload=0",
        `download=${Math.round(usedGb * GB)}`,
        `total=${totalGb === null ? 0 : Math.round(totalGb * GB)}`,
        `expire=${expiresAt === null ? 0 : Math.floor(expiresAt / 1000)}`,
      ].join("; "),
    };

    return new NextResponse(body, { status: 200, headers });
  } catch (error) {
    console.error("Subscription endpoint error:", error);
    return plain("Server error", 500);
  }
}
