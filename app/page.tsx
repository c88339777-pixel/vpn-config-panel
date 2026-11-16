"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type VpnConfig = {
  id: string | number;
  name: string;
  type: string;
  config: string;
  active: boolean;
  created_at?: string;
};

type VpnUser = {
  id: string;
  username: string;
  active: boolean;
  created_at?: string;
};

function Icon({
  name,
  size = 19,
}: {
  name: "copy" | "edit" | "trash" | "plus" | "check" | "x" | "logout";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { display: "block", flexShrink: 0 },
  };

  return (
    <svg {...common}>
      {name === "copy" && <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>}

      {name === "edit" && <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
      </>}

      {name === "trash" && <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </>}

      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "x" && <path d="m18 6-12 12M6 6l12 12" />}

      {name === "logout" && <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>}
    </svg>
  );
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [userConfigs, setUserConfigs] = useState<VpnConfig[]>([]);

  const [email, setEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [username, setUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("VLESS");
  const [config, setConfig] = useState("");

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [selectedUser, setSelectedUser] = useState<VpnUser | null>(null);
  const [assignedConfigIds, setAssignedConfigIds] = useState<string[]>([]);
  const [passwordChanges, setPasswordChanges] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userMode, setUserMode] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");

  const activeConfigs = configs.filter((item) => item.active);
  const inactiveConfigs = configs.filter((item) => !item.active);
  const activeUsers = users.filter((item) => item.active);

  const iconButton = {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    padding: 0,
    borderRadius: "11px",
    cursor: "pointer",
    border: "1px solid var(--border, #444)",
    background: "var(--background, #222)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    flexShrink: 0,
  } as const;

  const primaryButton = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  } as const;

  async function adminFetch(url: string, options: RequestInit = {}) {
    if (!session?.access_token) {
      throw new Error("نشست مدیر معتبر نیست");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }

  async function loadConfigs() {
    const { data, error } = await supabase
      .from("vpn_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("خطا در دریافت کانفیگ‌ها: " + error.message);
      return;
    }

    setConfigs(data || []);
  }

  async function loadUsers() {
    try {
      const response = await adminFetch("/api/admin/users");

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "خطا در دریافت کاربران");
        return;
      }

      setUsers(result.users || []);
    } catch {
      setMessage("ارتباط با سرور برقرار نشد");
    }
  }

  async function loadUserConfigs() {
    try {
      const response = await fetch("/api/user/configs");
      const result = await response.json();

      if (!response.ok) {
        setUserMode(false);
        setUserConfigs([]);
        return;
      }

      setUserMode(true);
      setLoggedInUsername(result.username || "");
      setUserConfigs(result.configs || []);
    } catch {
      setUserMode(false);
      setUserConfigs([]);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (mounted) {
          setSession(currentSession);
          setAuthReady(true);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (session) {
      setUserMode(false);
      loadConfigs();
      loadUsers();
    } else {
      setConfigs([]);
      setUsers([]);
      loadUserConfigs();
    }
  }, [authReady, session]);

  async function adminLogin() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: adminPassword,
    });

    setLoading(false);

    if (error) {
      setMessage("ورود مدیر ناموفق بود");
      return;
    }

    setSession(data.session);
    setMessage("ورود مدیر موفق بود");
  }

  async function userLogin() {
    if (!username.trim() || !userPassword) {
      setMessage("نام کاربری و رمز عبور را وارد کن");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: userPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "ورود ناموفق بود");
        setLoading(false);
        return;
      }

      setUserPassword("");
      await loadUserConfigs();
      setMessage("ورود موفق بود");
    } catch {
      setMessage("خطا در ارتباط با سرور");
    }

    setLoading(false);
  }

  async function logout() {
    if (session) {
      await supabase.auth.signOut();
      setSession(null);
    } else {
      await fetch("/api/user/logout", { method: "POST" });
      setUserMode(false);
      setUserConfigs([]);
      setLoggedInUsername("");
    }

    setMessage("از حساب خارج شدی");
  }

  function resetForm() {
    setName("");
    setType("VLESS");
    setConfig("");
    setEditingId(null);
  }

  function startEdit(item: VpnConfig) {
    setName(item.name);
    setType(item.type);
    setConfig(item.config);
    setEditingId(item.id);
    setMessage("در حال ویرایش: " + item.name);
  }

  async function saveConfig() {
    if (!name.trim() || !config.trim()) {
      setMessage("نام و متن کانفیگ را وارد کن");
      return;
    }

    setLoading(true);

    if (editingId !== null) {
      const { error } = await supabase
        .from("vpn_configs")
        .update({
          name: name.trim(),
          type,
          config: config.trim(),
        })
        .eq("id", editingId);

      if (error) {
        setLoading(false);
        setMessage("خطا در ویرایش: " + error.message);
        return;
      }

      setMessage("تغییرات ذخیره شد");
    } else {
      const { error } = await supabase.from("vpn_configs").insert({
        name: name.trim(),
        type,
        config: config.trim(),
        active: true,
      });

      if (error) {
        setLoading(false);
        setMessage("خطا در افزودن: " + error.message);
        return;
      }

      setMessage("کانفیگ اضافه شد");
    }

    resetForm();
    await loadConfigs();
    setLoading(false);
  }

  async function toggleConfig(item: VpnConfig) {
    const { error } = await supabase
      .from("vpn_configs")
      .update({ active: !item.active })
      .eq("id", item.id);

    if (error) {
      setMessage("خطا در تغییر وضعیت: " + error.message);
      return;
    }

    setConfigs((previous) =>
      previous.map((current) =>
        current.id === item.id
          ? { ...current, active: !item.active }
          : current
      )
    );
  }

  async function deleteConfig(id: string | number) {
    if (!window.confirm("این کانفیگ حذف شود؟")) return;

    const { error } = await supabase
      .from("vpn_configs")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("خطا در حذف: " + error.message);
      return;
    }

    if (editingId === id) resetForm();

    setMessage("کانفیگ حذف شد");
    await loadConfigs();
  }

  async function createUser() {
    if (!newUsername.trim() || !newUserPassword) {
      setMessage("نام کاربری و رمز عبور کاربر را وارد کن");
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newUserPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "ساخت کاربر انجام نشد");
      } else {
        setMessage("کاربر ساخته شد");
        setNewUsername("");
        setNewUserPassword("");
        await loadUsers();
      }
    } catch {
      setMessage("خطا در ساخت کاربر");
    }

    setLoading(false);
  }

  async function toggleUser(user: VpnUser) {
    try {
      const response = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: user.id,
          active: !user.active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "تغییر وضعیت کاربر انجام نشد");
        return;
      }

      setMessage(user.active ? "کاربر مسدود شد" : "کاربر فعال شد");
      await loadUsers();
    } catch {
      setMessage("خطا در تغییر وضعیت کاربر");
    }
  }

  async function changeUserPassword(user: VpnUser) {
    const newPassword = passwordChanges[user.id] || "";

    if (newPassword.length < 8) {
      setMessage("رمز جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }

    try {
      const response = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: user.id,
          password: newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "تغییر رمز انجام نشد");
        return;
      }

      setPasswordChanges((previous) => ({
        ...previous,
        [user.id]: "",
      }));

      setMessage("رمز عبور تغییر کرد");
    } catch {
      setMessage("خطا در تغییر رمز عبور");
    }
  }

  async function deleteUser(user: VpnUser) {
    if (!window.confirm(`کاربر ${user.username} حذف شود؟`)) return;

    try {
      const response = await adminFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ id: user.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "حذف کاربر انجام نشد");
        return;
      }

      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setAssignedConfigIds([]);
      }

      setMessage("کاربر حذف شد");
      await loadUsers();
    } catch {
      setMessage("خطا در حذف کاربر");
    }
  }

  async function openAssignments(user: VpnUser) {
    setSelectedUser(user);
    setAssignedConfigIds([]);

    try {
      const response = await adminFetch(
        `/api/admin/users/${user.id}/configs`
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "خطا در دریافت دسترسی‌ها");
        return;
      }

      setAssignedConfigIds(result.configIds || []);
    } catch {
      setMessage("خطا در دریافت کانفیگ‌های کاربر");
    }
  }

  async function toggleAssignment(configId: string | number) {
    if (!selectedUser) return;

    const id = String(configId);
    const alreadyAssigned = assignedConfigIds.includes(id);

    try {
      const response = await adminFetch(
        `/api/admin/users/${selectedUser.id}/configs`,
        {
          method: alreadyAssigned ? "DELETE" : "POST",
          body: JSON.stringify({ configId: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "تغییر دسترسی انجام نشد");
        return;
      }

      setAssignedConfigIds((previous) =>
        alreadyAssigned
          ? previous.filter((item) => item !== id)
          : [...previous, id]
      );

      setMessage(
        alreadyAssigned
          ? "دسترسی کانفیگ برداشته شد"
          : "کانفیگ به کاربر اختصاص داده شد"
      );
    } catch {
      setMessage("خطا در تغییر دسترسی کانفیگ");
    }
  }

  async function copyConfig(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("کانفیگ کپی شد");
    } catch {
      setMessage("کپی انجام نشد");
    }
  }

  if (!authReady) {
    return (
      <main dir="rtl">
        <div className="container">
          <h1>VPN Hub</h1>
          <p>در حال بررسی ورود...</p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl">
      <div className="container">
        <h1>VPN Hub</h1>
        <p>مدیریت کانفیگ‌ها و کاربران</p>

        {message && <div className="message">{message}</div>}

        {!session && !userMode && (
          <>
            <section className="panel">
              <h2>ورود کاربر</h2>

              <input
                placeholder="نام کاربری"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <input
                type="password"
                placeholder="رمز عبور"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
              />

              <button onClick={userLogin} disabled={loading}>
                {loading ? "..." : "ورود به حساب"}
              </button>
            </section>

            <section className="panel">
              <h2>ورود مدیر</h2>

              <input
                type="email"
                placeholder="ایمیل مدیر"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="رمز عبور مدیر"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />

              <button onClick={adminLogin} disabled={loading}>
                {loading ? "..." : "ورود مدیر"}
              </button>
            </section>
          </>
        )}

        {userMode && !session && (
          <section className="panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div>
                <h2>حساب کاربری</h2>
                <p>خوش آمدی، {loggedInUsername}</p>
              </div>

              <button
                className="secondary"
                onClick={logout}
                style={primaryButton}
              >
                <Icon name="logout" size={17} />
                خروج
              </button>
            </div>

            <h3>کانفیگ‌های اختصاصی من</h3>

            {userConfigs.length === 0 && (
              <p>هنوز کانفیگی به حساب تو اختصاص داده نشده است.</p>
            )}

            {userConfigs.map((item) => (
              <div
                className="config-card"
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.type}</p>
                </div>

                <button
                  style={iconButton}
                  title="کپی"
                  aria-label="کپی کانفیگ"
                  onClick={() => copyConfig(item.config)}
                >
                  <Icon name="copy" />
                </button>
              </div>
            ))}
          </section>
        )}

        {session && (
          <>
            <section className="panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <h2>مدیریت مدیر</h2>

                <button
                  className="secondary"
                  onClick={logout}
                  style={primaryButton}
                >
                  <Icon name="logout" size={17} />
                  خروج
                </button>
              </div>

              <h3>آمار پنل</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  ["کل کانفیگ‌ها", configs.length],
                  ["کانفیگ‌های فعال", activeConfigs.length],
                  ["کانفیگ‌های غیرفعال", inactiveConfigs.length],
                  ["کل کاربران", users.length],
                  ["کاربران فعال", activeUsers.length],
                ].map(([label, value]) => (
                  <div
                    className="config-card"
                    key={String(label)}
                    style={{ textAlign: "center" }}
                  >
                    <strong style={{ fontSize: "24px" }}>{value}</strong>
                    <p>{label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>مدیریت کانفیگ‌ها</h2>

              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name={editingId !== null ? "edit" : "plus"} />
                {editingId !== null ? "ویرایش کانفیگ" : "کانفیگ جدید"}
              </h3>

              <input
                placeholder="نام کانفیگ"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>VLESS</option>
                <option>VMess</option>
                <option>Trojan</option>
                <option>Shadowsocks</option>
                <option>WireGuard</option>
            
