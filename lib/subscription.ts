import "server-only";
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { adminSupabase } from "./server-supabase";

/** Subscription links look like  https://<site>/api/sub/<token> */
export const SUB_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

export const SUB_PROFILE_TITLE = process.env.SUB_PROFILE_TITLE || "Xylen VPN";

export function generateSubToken() {
  // 24 random bytes -> 32 URL-safe characters
  return randomBytes(24).toString("base64url");
}

export function getSiteOrigin(request: NextRequest) {
  const configured = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  return configured || request.nextUrl.origin;
}

export function buildSubscriptionUrl(request: NextRequest, token: string) {
  return `${getSiteOrigin(request)}/api/sub/${token}`;
}

/** Returns the user's subscription token, creating one the first time. */
export async function ensureSubToken(userId: string) {
  const { data, error } = await adminSupabase
    .from("vpn_users")
    .select("sub_token")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (data?.sub_token) return data.sub_token as string;

  // Only fill it in if it is still empty (safe if two requests race).
  await adminSupabase
    .from("vpn_users")
    .update({ sub_token: generateSubToken() })
    .eq("id", userId)
    .is("sub_token", null);

  const { data: again, error: againError } = await adminSupabase
    .from("vpn_users")
    .select("sub_token")
    .eq("id", userId)
    .single();

  if (againError || !again?.sub_token) {
    throw againError || new Error("sub_token_not_created");
  }

  return again.sub_token as string;
}

/** Replaces the token; the old link stops working immediately. */
export async function regenerateSubToken(userId: string) {
  const token = generateSubToken();

  const { error } = await adminSupabase
    .from("vpn_users")
    .update({ sub_token: token })
    .eq("id", userId);

  if (error) throw error;
  return token;
}
