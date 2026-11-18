import "server-only";
import { NextRequest } from "next/server";
import { adminSupabase } from "./server-supabase";

// Supabase Auth UID of the administrator account.
// Must match the UID used in the vpn_configs RLS policy in supabase/schema.sql.
const ADMIN_USER_ID = "88d549d1-2a8c-4604-bd14-6afa6a0b335f";

/**
 * The admin signs in through Supabase Auth in the browser, and the frontend
 * sends the Supabase access token as "Authorization: Bearer <token>".
 * We verify that token with Supabase and compare the user's ID to ADMIN_USER_ID.
 */
export async function isAdmin(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return false;
  }

  const token = match[1].trim();

  if (!token) {
    return false;
  }

  const { data, error } = await adminSupabase.auth.getUser(token);

  if (error || !data?.user) {
    return false;
  }

  return data.user.id === ADMIN_USER_ID;
}
