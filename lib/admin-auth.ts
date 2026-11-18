import "server-only";
import { NextRequest } from "next/server";
import { getCurrentUser } from "./user-session";

const ADMIN_USER_ID = "88d549d1-2a8c-4604-bd14-6afa6a0b335f";

export async function isAdmin(request: NextRequest) {
  const user = await getCurrentUser(request);

  if (!user) {
    return false;
  }

  return user.id === ADMIN_USER_ID;
}
