import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/user-session";
import { isAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json(
      { authenticated: false, isAdmin: false },
      { status: 401 }
    );
  }

  const admin = await isAdmin(request);

  return NextResponse.json({
    authenticated: true,
    isAdmin: admin,
    username: user.username,
  });
}
