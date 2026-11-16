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
  plan_start?: string | null;
  plan_expires_at?: string | null;
  total_gb?: number | null;
  used_gb?: number;
};

type Subscription = {
  plan_start: string | null;
  plan_expires_at: string | null;
  total_gb: number | null;
  used_gb: number;
  remaining_gb: number | null;
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
      {name === "copy" && (
        <>
          <rect x="8" y="8" width="13" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </>
      )}
      {name === "edit" && (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
        </>
      )}
      {name === "trash" && (
        <>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="m19 6-1 14H6L5 6" />
          <path d="M10 11v5M14 11v5" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "x" && <path d="m18 6-12 12M6 6l12 12" />}
      {name === "logout" && (
        <>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </>
      )}
    </svg>
  );
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value?: string | null) {
  if (!value) return "تعیین نشده";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "نامعتبر";
  return date.toLocaleString("fa-IR");
}

function getSubscriptionStatus(user: VpnUser) {
  const now = Date.now();
  const start = user.plan_start ? new Date(user.plan_start).getTime() : null;
  const expiry = user.plan_expires_at
    ? new Date(user.plan_expires_at).getTime()
    : null;
  const total = user.total_gb == null ? null : Number(user.total_gb);
  const used = Number(user.used_gb || 0);

  if (!user.active) return "مسدود";
  if (start !== null && start > now) return "شروع نشده";
  if (expiry !== null && expiry <= now) return "منقضی";
  if (total !== null && used >= total) return "اتمام حجم";
  if (!start && !expiry && total === null) return "بدون اشتراک";
  return "فعال";
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [userConfigs, setUserConfigs] = useState<VpnConfig[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

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

  const [planStart, setPlanStart] = useState("");
  const [planExpiry, setPlanExpiry] = useState("");
  const [totalGb, setTotalGb] = useState("");
  const [usedGb, setUsedGb] = useState("0");
  const [renewDays, setRenewDays] = useState("30");
  const [resetUsage, setResetUsage] = useState(true);

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

    return fetch(url, { ...options, headers });
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

      if (selectedUser) {
        const updated = (result.users || []).find(
          (item: VpnUser) => item.id === selectedUser.id
        );
        if (updated) setSelectedUser(updated);
      }
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
        setSubscription(null);
        setLoggedInUsername("");
        return false;
      }

      setUserMode(true);
      setLoggedInUsername(result.username || "");
      setUserConfigs(result.configs || []);
      setSubscription(result.subscription || null);
      return true;
    } catch {
      setUserMode(false);
      setUserConfigs([]);
      setSubscription(null);
      setLoggedInUsername("");
      return false;
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
    if (!email.trim() || !adminPassword) {
      setMessage("ایمیل و رمز عبور مدیر را وارد کن");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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
      const loaded = await loadUserConfigs();

      if (loaded) {
        setMessage("ورود موفق بود");
      } else {
        setMessage("ورود انجام شد، اما دریافت اطلاعات حساب ممکن نشد");
      }
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
      setSubscription(null);
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

    setPlanStart(toDateInput(user.plan_start));
    setPlanExpiry(toDateInput(user.plan_expires_at));
    setTotalGb(user.total_gb == null ? "" : String(user.total_gb));
    setUsedGb(String(user.used_gb || 0));

    try {
      const response = await adminFetch(
        `/api/admin/users/${user.id}/configs`
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "خطا در دریافت دسترسی‌ها");
        return;
      }

      setAssignedConfigIds(
        (result.configIds || []).map((id: string | number) => String(id))
      );
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

  async function saveSubscription() {
    if (!selectedUser) return;

    const total = totalGb.trim() === "" ? null : Number(totalGb);
    const used = Number(usedGb);

    if (total !== null && (!Number.isFinite(total) || total < 0)) {
      setMessage("حجم کل باید عدد صفر یا بیشتر باشد");
      return;
    }

    if (!Number.isFinite(used) || used < 0) {
      setMessage("حجم مصرف‌شده نامعتبر است");
      return;
    }

    const startIso = planStart
      ? new Date(planStart).toISOString()
      : null;
    const expiryIso = planExpiry
      ? new Date(planExpiry).toISOString()
      : null;

    if (startIso && expiryIso && new Date(expiryIso) <= new Date(startIso)) {
      setMessage("تاریخ انقضا باید بعد از تاریخ شروع باشد");
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedUser.id,
          plan_start: startIso,
          plan_expires_at: expiryIso,
          total_gb: total,
          used_gb: used,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "ذخیره اشتراک انجام نشد");
      } else {
        setMessage("اطلاعات اشتراک ذخیره شد");
        await loadUsers();
      }
    } catch {
      setMessage("خطا در ذخیره اشتراک");
    }

    setLoading(false);
  }

  async function renewSubscription() {
    if (!selectedUser) return;

    const days = Number(renewDays);

    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setMessage("مدت تمدید باید بین ۱ تا ۳۶۵۰ روز باشد");
      return;
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const used = resetUsage ? 0 : Number(usedGb);

    if (!Number.isFinite(used) || used < 0) {
      setMessage("حجم مصرف‌شده نامعتبر است");
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedUser.id,
          plan_start: now.toISOString(),
          plan_expires_at: expiry.toISOString(),
          used_gb: used,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "تمدید اشتراک انجام نشد");
      } else {
        setPlanStart(toDateInput(now.toISOString()));
        setPlanExpiry(toDateInput(expiry.toISOString()));
        setUsedGb(String(used));
        setMessage(`اشتراک برای ${days} روز تمدید شد`);
        await loadUsers();
      }
    } catch {
      setMessage("خطا در تمدید اشتراک");
    }

    setLoading(false);
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

        <section className="panel">
          <h2>مدیریت کانفیگ‌ها</h2>

          <form onSubmit={saveConfig}>
            <input
              placeholder="نام کانفیگ"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
            />
            <input
              placeholder="نوع کانفیگ"
              value={configType}
              onChange={(e) => setConfigType(e.target.value)}
            />
            <textarea
              placeholder="متن کانفیگ"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
            />
            <button type="submit">
              {editingConfig ? "ذخیره تغییرات" : "افزودن کانفیگ"}
            </button>
            {editingConfig && (
              <button type="button" onClick={cancelEditConfig}>
                انصراف
              </button>
            )}
          </form>
                    {configs.map((config) => (
            <div className="config-item" key={config.id}>
              <div>
                <strong>{config.name}</strong>
                <p>{config.type}</p>
                <p>
                  وضعیت: {config.active ? "فعال" : "غیرفعال"}
                </p>
              </div>

              <div className="actions">
                <button
                  type="button"
                  onClick={() => editConfig(config)}
                >
                  ویرایش
                </button>

                <button
                  type="button"
                  onClick={() => toggleConfig(config)}
                >
                  {config.active ? "غیرفعال کردن" : "فعال کردن"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteConfig(config)}
                >
                  حذف
                </button>
              </div>

              <textarea readOnly value={config.config} />

              <h4>اختصاص به کاربر</h4>

              {users.map((user) => {
                const assigned = assignedConfigs[user.id]?.includes(
                  config.id
                );

                return (
                  <div className="assignment-row" key={user.id}>
                    <span>{user.username}</span>

                    <button
                      type="button"
                      onClick={() =>
                        toggleAssignment(
                          user.id,
                          config.id,
                          !!assigned
                        )
                      }
                    >
                      {assigned ? "حذف دسترسی" : "اختصاص کانفیگ"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
                <button type="button" onClick={adminLogout}>
          خروج مدیر
        </button>
      </>
    )}
  </div>
</main>
);
}
