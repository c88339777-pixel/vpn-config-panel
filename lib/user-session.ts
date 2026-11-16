import "server-only";
import { NextRequest } from "next/server";
import { adminSupabase } from "./server-supabase";
import { hashToken } from "./user-auth";

export async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get("vpn_user_session")?.value;

  if (!token) return null;

  const { data: session, error: sessionError } = await adminSupabase
    .from("vpn_user_sessions")
    .select("user_id")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError || !session) return null;

  const { data: user, error: userError } = await adminSupabase
    .from("vpn_users")
    .select("id, username, active")
    .eq("id", session.user_id)
    .eq("active", true)
    .maybeSingle();

  if (userError || !user) return null;

  return {
    id: user.id,
    username: user.username,
  };
}
