"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Pencil,
  Trash2,
  UserPlus,
  UserRound,
  ShieldCheck,
  Settings,
  LogOut,
  Server,
  Users,
  KeyRound,
  Power,
  CalendarDays,
  HardDrive,
  X,
  Plus,
  Check,
  Search,
  ExternalLink,
} from "lucide-react";
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

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userConfigs, setUserConfigs] = useState<VpnConfig[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [email, setEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [username, setUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [loggedInUsername, setLoggedInUsername] = useState("");

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

  const activeConfigs = configs.filter((item) => item.active);
  const inactiveConfigs = configs.filter((item) => !item.active);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.username
      .toLocaleLowerCase("fa")
      .includes(userSearch.trim().toLocaleLowerCase("fa"));
    const status = getSubscriptionStatus(user.plan_expires_at);
    const matchesFilter =
      userFilter === "all" ||
      (userFilter === "account-active" && user.active) ||
      (userFilter === "account-inactive" && !user.active) ||
      (userFilter === "subscription-active" && status.className === "subscription-active") ||
      (userFilter === "subscription-warning" && status.className === "subscription-warning") ||
      (userFilter === "subscription-expired" && status.className === "subscription-expired");
    return matchesSearch && matchesFilter;
  });

  async function adminFetch(url: string, options: RequestInit = {}) {
    if (!session?.access_token) {
      throw new Error("نشست مدیر معتبر نیست. دوباره وارد شوید.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || "خطا در ارتباط با سرور");
    }

    return data;
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

    setConfigs((data || []) as VpnConfig[]);
  }

  async function loadUsers() {
    try {
      const data = await adminFetch("/api/admin/users");
      setUsers(data.users || []);
    } catch (error: any) {
      setMessage(error.message || "خطا در دریافت کاربران");
    }
  }

  async function loadUserConfigs() {
    try {
      const response = await fetch("/api/user/configs", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setUserMode(false);
        setUserConfigs([]);
        setSubscription(null);
        return;
      }

      setUserMode(true);
      setLoggedInUsername(data.username || "");
      setUserConfigs(data.configs || []);
      setSubscription(data.subscription || null);
    } catch {
      setUserMode(false);
      setUserConfigs([]);
      setSubscription(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session);

      if (!data.session) {
        await loadUserConfigs();
      }

      if (mounted) {
        setAuthReady(true);
      }
    }

    initialize();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
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
  }, [session, authReady]);

  async function adminLogin() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: adminPassword,
      });

      if (error) throw error;

      setSession(data.session);
      setAdminPassword("");
      setMessage("ورود مدیر موفق بود");
    } catch (error: any) {
      setMessage(error.message || "ورود مدیر ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  async function userLogin() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: userPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "ورود ناموفق بود");
      }

      setUserPassword("");
      await loadUserConfigs();
      setMessage("ورود کاربر موفق بود");
    } catch (error: any) {
      setMessage(error.message || "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);

    try {
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

      setMessage("با موفقیت خارج شدید");
    } catch {
      setMessage("خطا هنگام خروج");
    } finally {
      setLoading(false);
    }
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveConfig() {
    if (!name.trim() || !config.trim()) {
      setMessage("نام و متن کانفیگ را وارد کنید");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let result;

      if (editingId !== null) {
        result = await supabase
          .from("vpn_configs")
          .update({ name, type, config })
          .eq("id", editingId);
      } else {
        result = await supabase
          .from("vpn_configs")
          .insert([{ name, type, config, active: true }]);
      }

      if (result.error) throw result.error;

      resetForm();
      await loadConfigs();
      setMessage("کانفیگ با موفقیت ذخیره شد");
    } catch (error: any) {
      setMessage(error.message || "خطا در ذخیره کانفیگ");
    } finally {
      setLoading(false);
    }
  }

  async function toggleConfig(item: VpnConfig) {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("vpn_configs")
        .update({ active: !item.active })
        .eq("id", item.id);

      if (error) throw error;

      await loadConfigs();
      setMessage("وضعیت کانفیگ تغییر کرد");
    } catch (error: any) {
      setMessage(error.message || "خطا در تغییر وضعیت کانفیگ");
    } finally {
      setLoading(false);
    }
  }

  async function deleteConfig(id: string | number) {
    if (!window.confirm("از حذف این کانفیگ مطمئن هستید؟")) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("vpn_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (editingId === id) resetForm();

      await loadConfigs();
      setMessage("کانفیگ حذف شد");
    } catch (error: any) {
      setMessage(error.message || "خطا در حذف کانفیگ");
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    if (!newUsername.trim() || !newUserPassword.trim()) {
      setMessage("نام کاربری و رمز عبور را وارد کنید");
      return;
    }

    setLoading(true);

    try {
      await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername,
          password: newUserPassword,
        }),
      });

      setNewUsername("");
      setNewUserPassword("");
      await loadUsers();
      setMessage("کاربر ساخته شد");
    } catch (error: any) {
      setMessage(error.message || "خطا در ساخت کاربر");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(user: VpnUser) {
    setLoading(true);

    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: user.id,
          active: !user.active,
        }),
      });

      await loadUsers();
      setMessage("وضعیت کاربر تغییر کرد");
    } catch (error: any) {
      setMessage(error.message || "خطا در تغییر وضعیت کاربر");
    } finally {
      setLoading(false);
    }
  }

  async function changeUserPassword(user: VpnUser) {
    const password = passwordChanges[user.id];

    if (!password || password.length < 6) {
      setMessage("رمز جدید باید حداقل ۶ کاراکتر باشد");
      return;
    }

    setLoading(true);

    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: user.id,
          password,
        }),
      });

      setPasswordChanges((previous) => ({
        ...previous,
        [user.id]: "",
      }));

      setMessage("رمز عبور تغییر کرد");
    } catch (error: any) {
      setMessage(error.message || "خطا در تغییر رمز عبور");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: VpnUser) {
    if (!window.confirm(`کاربر ${user.username} حذف شود؟`)) return;

    setLoading(true);

    try {
      await adminFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ id: user.id }),
      });

      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setAssignedConfigIds([]);
      }

      await loadUsers();
      setMessage("کاربر حذف شد");
    } catch (error: any) {
      setMessage(error.message || "خطا در حذف کاربر");
    } finally {
      setLoading(false);
    }
  }

  function toDateInput(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatDate(value?: string | null) {
    if (!value) return "ثبت نشده";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "نامشخص";

    return date.toLocaleDateString("fa-IR");
  }

  function getSubscriptionStatus(value?: string | null) {
    if (!value) {
      return {
        label: "تاریخ انقضا ثبت نشده",
        detail: "برای تعیین وضعیت، تاریخ پایان اشتراک را ثبت کنید",
        className: "subscription-unknown",
      };
    }

    const expiry = new Date(value);
    if (Number.isNaN(expiry.getTime())) {
      return {
        label: "تاریخ نامعتبر",
        detail: "تاریخ پایان اشتراک قابل تشخیص نیست",
        className: "subscription-unknown",
      };
    }

    const remainingMs = expiry.getTime() - Date.now();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    if (remainingMs <= 0) {
      return {
        label: "اشتراک منقضی‌شده",
        detail: "زمان اشتراک این کاربر به پایان رسیده است",
        className: "subscription-expired",
      };
    }

    if (remainingDays <= 7) {
      return {
        label: "نزدیک انقضا",
        detail: `${remainingDays} روز تا پایان اشتراک`,
        className: "subscription-warning",
      };
    }

    return {
      label: "اشتراک فعال",
      detail: `${remainingDays} روز باقی‌مانده`,
      className: "subscription-active",
    };
  }

  async function openAssignments(user: VpnUser) {
    setSelectedUser(user);
    setPlanStart(toDateInput(user.plan_start));
    setPlanExpiry(toDateInput(user.plan_expires_at));
    setTotalGb(user.total_gb == null ? "" : String(user.total_gb));
    setUsedGb(String(user.used_gb ?? 0));
    setAssignedConfigIds([]);

    setLoading(true);

    try {
      const data = await adminFetch(`/api/admin/users/${user.id}/configs`);

      const ids =
        data.configIds ||
        data.config_ids ||
        (data.configs || []).map((item: any) =>
          String(item.config_id ?? item.id)
        );

      setAssignedConfigIds(ids.map((id: any) => String(id)));
    } catch (error: any) {
      setMessage(error.message || "خطا در دریافت کانفیگ‌های کاربر");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAssignment(configId: string | number) {
    if (!selectedUser) return;

    const id = String(configId);
    const alreadyAssigned = assignedConfigIds.includes(id);

    setLoading(true);

    try {
      await adminFetch(`/api/admin/users/${selectedUser.id}/configs`, {
        method: alreadyAssigned ? "DELETE" : "POST",
        body: JSON.stringify({ config_id: id }),
      });

      setAssignedConfigIds((previous) =>
        alreadyAssigned
          ? previous.filter((item) => item !== id)
          : [...previous, id]
      );

      setMessage(
        alreadyAssigned
          ? "کانفیگ از کاربر گرفته شد"
          : "کانفیگ به کاربر اختصاص داده شد"
      );
    } catch (error: any) {
      setMessage(error.message || "خطا در تغییر دسترسی کانفیگ");
    } finally {
      setLoading(false);
    }
  }

  async function saveSubscription() {
    if (!selectedUser) return;

    const total = totalGb.trim() === "" ? null : Number(totalGb);
    const used = Number(usedGb);

    if (total !== null && (!Number.isFinite(total) || total < 0)) {
      setMessage("حجم کل باید عددی معتبر و صفر یا بیشتر باشد");
      return;
    }

    if (!Number.isFinite(used) || used < 0) {
      setMessage("حجم مصرف‌شده معتبر نیست");
      return;
    }

    setLoading(true);

    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedUser.id,
          plan_start: planStart
            ? new Date(`${planStart}T00:00:00`).toISOString()
            : null,
          plan_expires_at: planExpiry
            ? new Date(`${planExpiry}T23:59:59`).toISOString()
            : null,
          total_gb: total,
          used_gb: used,
        }),
      });

      await loadUsers();
      setMessage("اشتراک ذخیره شد");
    } catch (error: any) {
      setMessage(error.message || "خطا در ذخیره اشتراک");
    } finally {
      setLoading(false);
    }
  }

  async function renewSubscription() {
    if (!selectedUser) return;

    const days = Number(renewDays);

    if (!Number.isInteger(days) || days < 1) {
      setMessage("تعداد روز تمدید باید حداقل یک روز باشد");
      return;
    }

    const currentExpiry = selectedUser.plan_expires_at
      ? new Date(selectedUser.plan_expires_at)
      : new Date();

    const now = new Date();
    const startDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(startDate);
    newExpiry.setDate(newExpiry.getDate() + days);

    setLoading(true);

    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedUser.id,
          plan_start: selectedUser.plan_start || now.toISOString(),
          plan_expires_at: newExpiry.toISOString(),
          ...(resetUsage ? { used_gb: 0 } : {}),
        }),
      });

      setPlanStart(toDateInput(selectedUser.plan_start || now.toISOString()));
      setPlanExpiry(toDateInput(newExpiry.toISOString()));

      if (resetUsage) setUsedGb("0");

      await loadUsers();
      setMessage("اشتراک تمدید شد");
    } catch (error: any) {
      setMessage(error.message || "خطا در تمدید اشتراک");
    } finally {
      setLoading(false);
    }
  }

  async function shareConfig(value: string, configName: string) {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: configName,
          text: value,
        });
        setMessage("کانفیگ برای اشتراک‌گذاری ارسال شد");
      } else {
        await copyConfig(value);
        setMessage("اشتراک‌گذاری در این مرورگر پشتیبانی نمی‌شود؛ کانفیگ کپی شد");
      }
    } catch (error: any) {
      // بستن منوی اشتراک‌گذاری توسط کاربر خطا محسوب نمی‌شود.
      if (error?.name !== "AbortError") {
        setMessage("ارسال کانفیگ انجام نشد؛ از دکمه کپی استفاده کن");
      }
    }
  }

  async function copyConfig(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("کانفیگ کپی شد");
    } catch {
      setMessage("کپی انجام نشد؛ متن را دستی انتخاب کنید");
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
        <p>پنل مدیریت و ارائه کانفیگ VPN</p>

        {message && (
          <div className="panel">
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              title="بستن پیام"
              aria-label="بستن پیام"
              className="secondary"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {!session && !userMode && (
          <>
            <section className="panel">
              <h2><ShieldCheck size={20} /> ورود مدیر</h2>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  adminLogin();
                }}
              >
                <input
                  type="email"
                  placeholder="ایمیل مدیر"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="رمز عبور مدیر"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  required
                />

                <button type="submit" disabled={loading} title="ورود مدیر">
                  <ShieldCheck size={18} />
                  ورود مدیر
                </button>
              </form>
            </section>

            <section className="panel">
              <h2><UserRound size={20} /> ورود کاربر</h2>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  userLogin();
                }}
              >
                <input
                  type="text"
                  placeholder="نام کاربری"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="رمز عبور"
                  value={userPassword}
                  onChange={(event) => setUserPassword(event.target.value)}
                  required
                />

                <button type="submit" disabled={loading} title="ورود کاربر">
                  <UserRound size={18} />
                  ورود کاربر
                </button>
              </form>
            </section>
          </>
        )}

        {userMode && !session && (
          <section className="panel">
            <h2><UserRound size={20} /> سلام {loggedInUsername}</h2>
            <h3><CalendarDays size={18} /> وضعیت اشتراک</h3>

            {subscription ? (
              <>
                <p>شروع اشتراک: {formatDate(subscription.plan_start)}</p>
                <p>پایان اشتراک: {formatDate(subscription.plan_expires_at)}</p>
                <p>
                  حجم کل:{" "}
                  {subscription.total_gb == null
                    ? "نامحدود"
                    : `${subscription.total_gb} گیگابایت`}
                </p>
                <p>حجم مصرف‌شده: {subscription.used_gb} گیگابایت</p>
                <p>
                  حجم باقی‌مانده:{" "}
                  {subscription.remaining_gb == null
                    ? "نامحدود"
                    : `${subscription.remaining_gb} گیگابایت`}
                </p>
              </>
            ) : (
              <p>اطلاعات اشتراک در دسترس نیست.</p>
            )}

            <h3><Server size={18} /> کانفیگ‌های من</h3>

            {userConfigs.length === 0 ? (
              <p>هنوز کانفیگی برای شما ثبت نشده است.</p>
            ) : (
              userConfigs.map((item) => (
                <div className="panel" key={item.id}>
                  <h3>{item.name}</h3>
                  <p>نوع: {item.type}</p>
                  <textarea readOnly value={item.config} rows={4} />
                  <button
                    type="button"
                    className="connect-config-button"
                    onClick={() => shareConfig(item.config, item.name)}
                    title="ارسال کانفیگ به یکی از برنامه‌های نصب‌شده"
                  >
                    <ExternalLink size={18} />
                    ارسال به برنامه VPN
                  </button>
                  <button
                    type="button"
                    onClick={() => copyConfig(item.config)}
                    title="کپی کانفیگ"
                    aria-label="کپی کانفیگ"
                  >
                    <Copy size={18} />
                    کپی کانفیگ
                  </button>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={logout}
              disabled={loading}
              title="خروج از حساب"
            >
              <LogOut size={18} />
              خروج از حساب
            </button>
          </section>
        )}

        {session && (
          <>
            <section className="panel">
              <h2><Server size={20} /> مدیریت کانفیگ‌ها</h2>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveConfig();
                }}
              >
                <input
                  type="text"
                  placeholder="نام کانفیگ"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />

                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="VLESS">VLESS</option>
                  <option value="VMESS">VMESS</option>
                  <option value="Trojan">Trojan</option>
                  <option value="Shadowsocks">Shadowsocks</option>
                  <option value="WireGuard">WireGuard</option>
                  <option value="Other">سایر</option>
                </select>

                <textarea
                  placeholder="متن کامل کانفیگ"
                  value={config}
                  onChange={(event) => setConfig(event.target.value)}
                  rows={5}
                  required
                />

                <button type="submit" disabled={loading}>
                  {editingId !== null ? (
                    <>
                      <Check size={18} />
                      ذخیره تغییرات
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      افزودن کانفیگ
                    </>
                  )}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="secondary"
                  >
                    <X size={18} />
                    انصراف از ویرایش
                  </button>
                )}
              </form>

              <h3>کانفیگ‌های فعال ({activeConfigs.length})</h3>

              {activeConfigs.map((item) => (
                <div className="panel" key={item.id}>
                  <h3>{item.name}</h3>
                  <p>نوع: {item.type}</p>
                  <textarea readOnly value={item.config} rows={3} />

                  <button
                    type="button"
                    onClick={() => copyConfig(item.config)}
                    title="کپی کانفیگ"
                    aria-label="کپی کانفیگ"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    title="ویرایش کانفیگ"
                    aria-label="ویرایش کانفیگ"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleConfig(item)}
                    title="غیرفعال کردن کانفیگ"
                  >
                    <Power size={18} />
                    غیرفعال کردن
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConfig(item.id)}
                    className="danger"
                    title="حذف کانفیگ"
                    aria-label="حذف کانفیگ"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <h3>کانفیگ‌های غیرفعال ({inactiveConfigs.length})</h3>

              {inactiveConfigs.map((item) => (
                <div className="panel" key={item.id}>
                  <h3>{item.name}</h3>
                  <p>نوع: {item.type}</p>

                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    title="ویرایش کانفیگ"
                    aria-label="ویرایش کانفیگ"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleConfig(item)}
                    title="فعال کردن کانفیگ"
                  >
                    <Power size={18} />
                    فعال کردن
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConfig(item.id)}
                    className="danger"
                    title="حذف کانفیگ"
                    aria-label="حذف کانفیگ"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </section>

            <section className="panel">
              <h2><Users size={20} /> مدیریت کاربران</h2>

              <div className="stats-overview" aria-label="آمار کلی پنل">
                <div className="stats-grid">
                  <div className="stats-card">
                    <span className="stats-icon"><Users size={19} /></span>
                    <span className="stats-label">کل کاربران</span>
                    <strong className="stats-value">{users.length}</strong>
                  </div>
                  <div className="stats-card">
                    <span className="stats-icon"><UserRound size={19} /></span>
                    <span className="stats-label">حساب‌های فعال</span>
                    <strong className="stats-value">{users.filter((user) => user.active).length}</strong>
                  </div>
                  <div className="stats-card">
                    <span className="stats-icon"><Server size={19} /></span>
                    <span className="stats-label">کل کانفیگ‌ها</span>
                    <strong className="stats-value">{configs.length}</strong>
                  </div>
                  <div className="stats-card">
                    <span className="stats-icon"><CalendarDays size={19} /></span>
                    <span className="stats-label">اشتراک‌های فعال</span>
                    <strong className="stats-value">
                      {users.filter((user) => {
                        const status = getSubscriptionStatus(user.plan_expires_at);
                        return status.className === "subscription-active" ||
                          status.className === "subscription-warning";
                      }).length}
                    </strong>
                  </div>
                  <div className="stats-card">
                    <span className="stats-icon"><Power size={19} /></span>
                    <span className="stats-label">اشتراک‌های منقضی</span>
                    <strong className="stats-value">
                      {users.filter((user) =>
                        getSubscriptionStatus(user.plan_expires_at).className === "subscription-expired"
                      ).length}
                    </strong>
                  </div>
                </div>
                <p className="stats-note">آمار به‌روز شده بر اساس اطلاعات فعلی پنل</p>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createUser();
                }}
              >
                <input
                  type="text"
                  placeholder="نام کاربری جدید"
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="رمز عبور جدید"
                  value={newUserPassword}
                  onChange={(event) => setNewUserPassword(event.target.value)}
                  required
                />

                <button type="submit" disabled={loading}>
                  <UserPlus size={18} />
                  ساخت کاربر
                </button>
              </form>

              <h3>فهرست کاربران ({filteredUsers.length} از {users.length})</h3>

              <div className="user-tools">
                <div className="user-search">
                  <Search size={18} />
                  <input
                    type="search"
                    placeholder="جست‌وجوی نام کاربری..."
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    aria-label="جست‌وجوی کاربران"
                  />
                </div>

                <select
                  value={userFilter}
                  onChange={(event) => setUserFilter(event.target.value)}
                  aria-label="فیلتر وضعیت کاربران"
                >
                  <option value="all">همه کاربران</option>
                  <option value="account-active">حساب‌های فعال</option>
                  <option value="account-inactive">حساب‌های غیرفعال</option>
                  <option value="subscription-active">اشتراک فعال</option>
                  <option value="subscription-warning">نزدیک انقضا</option>
                  <option value="subscription-expired">اشتراک منقضی‌شده</option>
                </select>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="message">کاربری با این جست‌وجو یا فیلتر پیدا نشد.</p>
              ) : filteredUsers.map((user) => {
                const subscriptionStatus = getSubscriptionStatus(user.plan_expires_at);

                return (
                  <div className="panel user-card" key={user.id}>
                    <div className="user-card-header">
                      <div>
                        <h3 className="user-card-name">
                          <UserRound size={19} />
                          {user.username}
                        </h3>
                        <span className={`status-badge ${user.active ? "account-active" : "account-inactive"}`}>
                          {user.active ? "حساب فعال" : "حساب غیرفعال"}
                        </span>
                      </div>

                      <span className={`status-badge subscription-badge ${subscriptionStatus.className}`}>
                        {subscriptionStatus.label}
                      </span>
                    </div>

                    <div className="user-subscription-info">
                      <div className="user-info-row">
                        <span>شروع اشتراک</span>
                        <strong>{formatDate(user.plan_start)}</strong>
                      </div>
                      <div className="user-info-row">
                        <span>پایان اشتراک</span>
                        <strong>{formatDate(user.plan_expires_at)}</strong>
                      </div>
                      <p className={`subscription-detail ${subscriptionStatus.className}`}>
                        {subscriptionStatus.detail}
                      </p>
                    </div>

                    <div className="user-card-actions">
                      <button
                        type="button"
                        onClick={() => openAssignments(user)}
                        title="مدیریت اشتراک و کانفیگ‌ها"
                      >
                        <Settings size={18} />
                        مدیریت اشتراک و کانفیگ‌ها
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleUser(user)}
                        title={user.active ? "غیرفعال کردن کاربر" : "فعال کردن کاربر"}
                      >
                        <Power size={18} />
                        {user.active ? "غیرفعال کردن" : "فعال کردن"}
                      </button>

                      <input
                        type="password"
                        placeholder="رمز عبور جدید"
                        value={passwordChanges[user.id] || ""}
                        onChange={(event) =>
                          setPasswordChanges((previous) => ({
                            ...previous,
                            [user.id]: event.target.value,
                          }))
                        }
                      />

                      <button
                        type="button"
                        onClick={() => changeUserPassword(user)}
                      >
                        <KeyRound size={18} />
                        تغییر رمز
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        className="danger"
                      >
                        <Trash2 size={18} />
                        حذف کاربر
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {selectedUser && (
              <section className="panel">
                <h2>
                  <Settings size={20} /> مدیریت کاربر: {selectedUser.username}
                </h2>

                <h3><CalendarDays size={18} /> تنظیم اشتراک</h3>

                <label>تاریخ شروع اشتراک</label>
                <input
                  type="date"
                  value={planStart}
                  onChange={(event) => setPlanStart(event.target.value)}
                />

                <label>تاریخ پایان اشتراک</label>
                <input
                  type="date"
                  value={planExpiry}
                  onChange={(event) => setPlanExpiry(event.target.value)}
                />

                <label><HardDrive size={16} /> حجم کل به گیگابایت (خالی = نامحدود)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="مثلاً 100"
                  value={totalGb}
                  onChange={(event) => setTotalGb(event.target.value)}
                />

                <label>حجم مصرف‌شده به گیگابایت</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={usedGb}
                  onChange={(event) => setUsedGb(event.target.value)}
                />

                <button
                  type="button"
                  onClick={saveSubscription}
                  disabled={loading}
                >
                  <Check size={18} />
                  ذخیره اشتراک
                </button>

                <h3>تمدید اشتراک</h3>

                <label>تعداد روز تمدید</label>
                <input
                  type="number"
                  min="1"
                  value={renewDays}
                  onChange={(event) => setRenewDays(event.target.value)}
                />

                <label>
                  <input
                    type="checkbox"
                    checked={resetUsage}
                    onChange={(event) => setResetUsage(event.target.checked)}
                  />
                  صفر کردن حجم مصرف‌شده
                </label>

                <button
                  type="button"
                  onClick={renewSubscription}
                  disabled={loading}
                >
                  <CalendarDays size={18} />
                  تمدید اشتراک
                </button>

                <h3><Server size={18} /> اختصاص کانفیگ به کاربر</h3>

                {configs.length === 0 ? (
                  <p>هنوز کانفیگی ثبت نشده است.</p>
                ) : (
                  configs.map((item) => {
                    const assigned = assignedConfigIds.includes(String(item.id));

                    return (
                      <div className="panel" key={item.id}>
                        <p>{item.name} ({item.type})</p>
                        <p>
                          وضعیت کانفیگ: {item.active ? "فعال" : "غیرفعال"}
                        </p>

                        <button
                          type="button"
                          onClick={() => toggleAssignment(item.id)}
                          disabled={loading}
                          title={assigned ? "حذف دسترسی کاربر" : "اختصاص به کاربر"}
                        >
                          {assigned ? (
                            <>
                              <X size={18} />
                              حذف دسترسی کاربر
                            </>
                          ) : (
                            <>
                              <Check size={18} />
                              اختصاص به کاربر
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setAssignedConfigIds([]);
                  }}
                  className="secondary"
                >
                  <X size={18} />
                  بستن مدیریت کاربر
                </button>
              </section>
            )}

            <section className="panel">
              <button
                type="button"
                onClick={logout}
                disabled={loading}
                title="خروج مدیر"
              >
                <LogOut size={18} />
                خروج مدیر
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
