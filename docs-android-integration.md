# VPN Hub ↔ Android app integration contract

The selected product behavior is **username/password login** and fully custom branding.
This document records the API contract implemented by the supplied VPN Hub source.

## API host

`https://vpn-config-panel.vercel.app`

## 1. Login

`POST /api/user/login`

JSON body:

```json
{
  "username": "customer_name",
  "password": "customer_password"
}
```

Successful response: JSON `{ "success": true, "username": "..." }` plus an
HTTP-only `vpn_user_session` cookie. The Android HTTP client must retain that cookie
and send it on later requests. Do not store the password or session token in logs.

Possible status codes: `400` missing fields, `401` invalid credentials or disabled
account, `403` subscription not started/expired/out of quota, `500` server error.

## 2. Fetch the signed-in user's assigned configs

`GET /api/user/configs`

Send the session cookie from the login response. Successful response shape:

```json
{
  "username": "customer_name",
  "configs": [
    {
      "id": "uuid",
      "name": "Server 1",
      "type": "VLESS",
      "config": "vless://...",
      "active": true,
      "created_at": "..."
    }
  ],
  "subscription": {
    "plan_start": null,
    "plan_expires_at": "...",
    "total_gb": 100,
    "used_gb": 12.5,
    "remaining_gb": 87.5
  }
}
```

Only active configs assigned to that user are returned. A `401` means login again;
`403` means the subscription is not currently usable.

## 3. Logout

`POST /api/user/logout`

Send the same cookie. The server invalidates the session and clears the cookie.

## Android implementation notes

- Use HTTPS only.
- Use an HTTP cookie jar so the `vpn_user_session` cookie is retained between login
  and config-fetch requests. The cookie is HttpOnly by design; native HTTP clients can
  still manage it without exposing it to JavaScript.
- Parse each returned `config` using the V2rayNG/Xray core's existing URI/config
  parsers. Do not assume every row is VLESS: `type` may identify another supported
  protocol, and unsupported formats should show a clear error.
- Keep credentials and session cookies in Android's protected app storage; never put
  the Supabase service-role key in the APK.
- The current API returns configs but does not implement traffic accounting. `used_gb`
  is a manually maintained field in the current panel; real per-user quota enforcement
  requires server-side/core-side usage reporting and a trusted accounting design.

## Current source limitations that must be addressed before public use

- The original `schema.sql` only created `vpn_configs`, while the API already queries
  `vpn_users`, `vpn_user_sessions`, and `vpn_user_configs`. The revised schema now
  creates all four tables and indexes.
- `SUPABASE_SERVICE_ROLE_KEY` is required by `lib/server-supabase.ts`; it must be set
  as a Vercel server environment variable and must never be shipped in the app.
- `lib/admin-auth.ts` currently checks a fixed Supabase Auth user ID. The RLS policy
  in `supabase/schema.sql` uses the same ID. Replace that UUID in both places with
  the actual admin user's Auth UID if it differs.
- The login route currently has no rate limiter. Add rate limiting / abuse protection
  before exposing accounts publicly.
- The current panel's quota values are administrative metadata, not measured traffic.
