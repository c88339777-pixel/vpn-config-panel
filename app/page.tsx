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

export default function Home() {
  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [session, setSession] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("VLESS");
  const [config, setConfig] = useState("");

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadConfigs() {
    const { data, error } = await supabase
      .from("vpn_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("خطا در دریافت اطلاعات");
      return;
    }

    setConfigs(data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [session]);

  async function login() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("ورود ناموفق بود");
      return;
    }

    setSession(data.session);
    setMessage("ورود موفق بود");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setMessage("خارج شدی");
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
      previous.map((configItem) =>
        configItem.id === item.id
          ? { ...configItem, active: !item.active }
          : configItem
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

  async function copyConfig(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("⧉ کپی شد");
    } catch {
      setMessage("کپی انجام نشد");
    }
  }

  const activeConfigs = configs.filter((item) => item.active);

  const iconButton = {
    width: "44px",
    height: "42px",
    borderRadius: "12px",
    fontSize: "21px",
    cursor: "pointer",
    border: "1px solid var(--border, #444)",
    background: "var(--background, #222)",
  } as const;

  return (
    <main dir="rtl">
      <div className="container">
        <h1>VPN Hub</h1>
        <p>مدیریت کانفیگ‌ها</p>

        {message && <div className="message">{message}</div>}

        {!session ? (
          <section className="panel">
            <h2>ورود مدیر</h2>

            <input
              type="email"
              placeholder="ایمیل"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="رمز عبور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login} disabled={loading}>
              {loading ? "..." : "ورود"}
            </button>
          </section>
        ) : (
          <section className="panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <h2>⚙ مدیریت</h2>
              <button className="secondary" onClick={logout}>
                خروج ↗
              </button>
            </div>

            <h3>{editingId !== null ? "✎ ویرایش" : "＋ کانفیگ جدید"}</h3>

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
              <option>Subscription</option>
            </select>

            <textarea
              placeholder="متن کانفیگ"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={5}
            />

            <button onClick={saveConfig} disabled={loading}>
              {loading
                ? "..."
                : editingId !== null
                  ? "✓ ذخیره"
                  : "+ افزودن"}
            </button>

            {editingId !== null && (
              <button
                className="secondary"
                onClick={resetForm}
                disabled={loading}
              >
                ✕ انصراف
              </button>
            )}

            <h3>فهرست کانفیگ‌ها</h3>

            {configs.map((item) => (
              <div
                className="config-card"
                key={item.id}
                style={{ marginBottom: "14px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.type}</p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    aria-label={item.active ? "غیرفعال کردن" : "فعال کردن"}
                    title={item.active ? "غیرفعال کردن" : "فعال کردن"}
                    onClick={() => toggleConfig(item)}
                    style={{
                      width: "52px",
                      height: "32px",
                      borderRadius: "20px",
                      border: "none",
                      padding: "3px",
                      background: item.active ? "#34C759" : "#8E8E93",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: item.active ? "flex-start" : "flex-end",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    <span
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        display: "block",
                        boxShadow: "0 1px 3px #0004",
                      }}
                    />
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "9px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    style={iconButton}
                    title="کپی"
                    aria-label="کپی"
                    onClick={() => copyConfig(item.config)}
                  >
                    ⧉
                  </button>

                  <button
                    style={iconButton}
                    title="ویرایش"
                    aria-label="ویرایش"
                    onClick={() => startEdit(item)}
                  >
                    ✎
                  </button>

                  <button
                    style={{
                      ...iconButton,
                      color: "#EF4444",
                    }}
                    title="حذف"
                    aria-label="حذف"
                    onClick={() => deleteConfig(item.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="panel">
          <h2>کانفیگ‌های قابل استفاده</h2>

          {activeConfigs.length === 0 && (
            <p>کانفیگ فعالی وجود ندارد.</p>
          )}

          {activeConfigs.map((item) => (
            <div className="config-card" key={item.id}>
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
                ⧉
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
  
