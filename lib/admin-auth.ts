import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const ADMIN_UID = "88d549d1-2a8c-4604-bd14-6afa6a0b335f";

const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function isAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice(7);

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return false;
  }

  return data.user.id === ADMIN_UID;
}
