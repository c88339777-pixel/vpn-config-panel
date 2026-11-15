"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type VpnConfig = {
  id: number;
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      setMessage("ورود ناموفق بود: " + error.message);
      return;
    }

    setSession(data.session);
    setMessage("ورود موفق بود");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setMessage("از حساب خارج شدی");
  }

  async function addConfig() {
    if (!name.trim() || !config.trim()) {
      setMessage("نام و متن کانفیگ را وارد کن");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("vpn_configs").insert({
      name: name.trim(),
      type,
      config: config.trim(),
      active: true,
    });

    setLoading(false);

    if (error) {
      setMessage("خطا در افزودن: " + error.message);
      return;
    }

    setName("");
    setConfig("");
    setMessage("کانفیگ اضافه شد");
    await loadConfigs();
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

    setMessage(item.active ? "کانفیگ غیرفعال شد" : "کانفیگ فعال شد");
    await loadConfigs();
  }

  async function deleteConfig(id: number) {
    if (!window.confirm("این کانفیگ حذف شود؟")) return;

    const { error } = await supabase
      .from("vpn_configs")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("خطا در حذف: " + error.message);
      return;
    }

    setMessage("کانفیگ حذف شد");
    await loadConfigs();
  }

  async function copyConfig(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("کانفیگ کپی شد");
    } catch {
      setMessage("کپی انجام نشد؛ دسترسی مرورگر را بررسی کن");
    }
  }

  const activeConfigs = configs.filter((item) => item.active);

  return (
    <main dir="rtl">
      <div className="container">
        <h1>پنل مدیریت VPN</h1>
        <p>مدیریت و دریافت کانفیگ‌های VPN</p>

        {message && <div className="message">{message}</div>}

        {!session ? (
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
              placeholder="رمز عبور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login} disabled={loading}>
              ورود
            </button>
          </section>
        ) : (
          <section className="panel">
            <h2>مدیریت کانفیگ‌ها</h2>

            <button onClick={logout} className="secondary">
              خروج از مدیریت
            </button>

            <h3>افزودن کانفیگ جدید</h3>

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

            <button onClick={addConfig} disabled={loading}>
              افزودن کانفیگ
            </button>

            <h3>همه کانفیگ‌ها</h3>

            {configs.length === 0 && (
              <p>هنوز کانفیگی ثبت نشده است.</p>
            )}

            {configs.map((item) => (
              <div className="config-card" key={item.id}>
                <h3>{item.name}</h3>
                <p>نوع: {item.type}</p>
                <p>
                  وضعیت: {item.active ? "فعال" : "غیرفعال"}
                </p>

                <button
                  onClick={() => toggleConfig(item)}
                  disabled={loading}
                >
                  {item.active ? "غیرفعال کردن" : "فعال کردن"}
                </button>

                <button
                  className="danger"
                  onClick={() => deleteConfig(item.id)}
                  disabled={loading}
                >
                  حذف
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="panel">
          <h2>کانفیگ‌های فعال</h2>

          {activeConfigs.length === 0 && (
            <p>در حال حاضر کانفیگ فعالی وجود ندارد.</p>
          )}

          {activeConfigs.map((item) => (
            <div className="config-card" key={item.id}>
              <h3>{item.name}</h3>
              <p>نوع: {item.type}</p>

              <button onClick={() => copyConfig(item.config)}>
                کپی کانفیگ
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
