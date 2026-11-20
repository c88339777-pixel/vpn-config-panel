# VPN Hub

Next.js + Supabase control panel for managing VPN configs and customer access.
The Android client is a separate app and connects to this panel through the API
contract in `docs-android-integration.md`.

## 1. Supabase setup

1. Create a Supabase project.
2. Run the complete `supabase/schema.sql` in SQL Editor.
3. In Authentication > Users, create the administrator account. Keep public sign-up
   disabled.
4. Copy the project's URL, anon/publishable key, and service-role/secret key.
5. Find the administrator's Auth UID. The current value is hard-coded in
   `lib/admin-auth.ts` and repeated in the `vpn_configs` RLS policy in
   `supabase/schema.sql`. If it differs, replace it in both locations before deploy.

## 2. Vercel environment variables

Set these for Production (and Preview only if you intentionally use Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (**server-only secret**)

Never add the service-role key to a `NEXT_PUBLIC_` variable, the Android app,
GitHub source, or a client-side file. Redeploy after changing environment variables.

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Android app integration

The intended native flow is username/password login via `POST /api/user/login`,
then fetch assigned configs via `GET /api/user/configs`, retaining the session cookie.
See `docs-android-integration.md` for request/response details.

## Security and current limitations

- Customer passwords are hashed with scrypt; session tokens are random and only their
  SHA-256 hashes are stored in the database.
- RLS is enabled. Browser-side config management is restricted to the configured
  Supabase administrator UID. Customer/session tables are accessed only server-side
  using the service-role key after API authentication.
- Add rate limiting to login before public production use.
- `used_gb` is currently an admin-maintained value, not live measured traffic. Real
  quota enforcement needs trusted usage accounting.
- Only add VPN configurations you are authorized to distribute. Supported protocol
  parsing depends on the Android core integration; WireGuard and Xray/V2Ray formats
  are not interchangeable.

## 5. Subscription link for iPhone and third-party apps

Each customer gets a private subscription link (`/api/sub/<token>`) on their user page,
with one-tap "add to app" buttons (Streisand, V2Box, sing-box, Hiddify, Happ) and a QR code.

1. Run the new block at the end of `supabase/schema.sql` once (adds `vpn_users.sub_token`).
2. Run `npm install` (adds the `qrcode` package) and redeploy.
3. Optional environment variables:
   - `SITE_URL` - public address used when building links (default: the request's own origin).
   - `SUB_PROFILE_TITLE` - profile name shown in apps (default: `Xylen VPN`).

The endpoint returns the user's active, assigned URI-style configs (`vless://`, `vmess://`,
`trojan://`, `ss://`, ...) as a base64 list, plus `Subscription-Userinfo` (used/total data and
expiry). It answers 403 when the plan has not started, has expired or is out of quota, and 404
for unknown links or disabled accounts. Raw WireGuard / JSON blocks are skipped.
Users can create a new link from their page; the old one stops working immediately.
Add rate limiting for `/api/sub/*` before heavy public use.
