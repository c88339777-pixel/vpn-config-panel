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

function Icon({
  name,
  size = 19,
}: {
  name: "copy" | "edit" | "trash" | "plus" | "check" | "x" | "logout" | "settings";
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

      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.9.1 1.7 1.7 0 0 0-.9 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9-.1l-.2.1-1.7-2.9.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-.9h-.2v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.1-1.9l-.1-.2 2.9-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 .9-1.5v-.2h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.1l.2-.1 1.7 2.9-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5.9h.2v3.4h-.2a1.7 1.7 0 0 0-1.5.9Z" transform="translate(-1 -1) scale(1.08)" />
        </>
      )}
    </svg>
  );
}

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
      setMessage("کانفیگ کپی شد");
    } catch {
      setMessage("کپی انجام نشد");
    }
  }

  const activeConfigs = configs.filter((item) => item.active);

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
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="settings" />
                مدیریت
              </h2>

              <button
                className="secondary"
                onClick={logout}
                style={primaryButton}
              >
                <Icon name="logout" size={17} />
                خروج
              </button>
            </div>

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
              <option>Subscription</option>
            </select>

            <textarea
              placeholder="متن کانفیگ"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={5}
            />

            <button
              onClick={saveConfig}
              disabled={loading}
              style={primaryButton}
            >
              {loading ? (
                "..."
              ) : editingId !== null ? (
                <>
                  <Icon name="check" size={18} />
                  ذخیره تغییرات
                </>
              ) : (
                <>
                  <Icon name="plus" size={18} />
                  افزودن کانفیگ
                </>
              )}
            </button>

            {editingId !== null && (
              <button
                className="secondary"
                onClick={resetForm}
                disabled={loading}
                style={primaryButton}
              >
                <Icon name="x" size={17} />
                انصراف
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
                      width: "42px",
                      height: "24px",
                      borderRadius: "999px",
                      border: "none",
                      padding: "3px",
                      background: item.active ? "#20B65A" : "#777777",
                      position: "relative",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 0.2s ease",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "3px",
                        right: item.active ? "3px" : "21px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        boxShadow: "0 1px 3px #0004",
                        transition: "right 0.2s ease",
                      }}
                    />
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    style={iconButton}
                    title="کپی"
                    aria-label="کپی"
                    onClick={() => copyConfig(item.config)}
                  >
                    <Icon name="copy" />
                  </button>

                  <button
                    style={iconButton}
                    title="ویرایش"
                    aria-label="ویرایش"
                    onClick={() => startEdit(item)}
                  >
                    <Icon name="edit" />
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
                    <Icon name="trash" />
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
            <div
              className="config-card"
              key={item.id}
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
      </div>
    </main>
  );
              }
