"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type VPNConfig = {
  id: string;
  name: string;
  type: string;
  config: string;
  active: boolean;
};

export default function Home() {
  const [configs, setConfigs] = useState<VPNConfig[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("VLESS");
  const [config, setConfig] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("");

  async function loadConfigs() {
    const { data } = await supabase
      .from("vpn_configs")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    setConfigs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadConfigs();

    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setLoggedIn(!!session)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setMessage(error ? error.message : "وارد شدی");
  }

  async function logout() {
    await supabase.auth.signOut();
    setMessage("خارج شدی");
  }

  async function addConfig() {
    if (!name.trim() || !config.trim()) {
      setMessage("نام و متن کانفیگ رو وارد کن");
      return;
    }

    const { error } = await supabase.from("vpn_configs").insert({
      name,
      type,
      config,
      active: true,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setName("");
      setConfig("");
      setMessage("کانفیگ اضافه شد");
      loadConfigs();
    }
  }

  async function deleteConfig(id: string) {
    const { error } = await supabase
      .from("vpn_configs")
      .delete()
      .eq("id", id);

    setMessage(error ? error.message : "حذف شد");
    loadConfigs();
  }

  async function copyConfig(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("کانفیگ کپی شد؛ حالا داخل برنامه VPN واردش کن");
    } catch {
      setMessage("کپی خودکار انجام نشد");
    }
  }

  return (
    <main className="container">
      <header>
        <h1>پنل کانفیگ VPN</h1>
        <p>کانفیگ موردنظرت رو انتخاب و کپی کن</p>
      </header>

      <section className="panel">
        <h2>کانفیگ‌های موجود</h2>

        {loading ? (
          <p>در حال بارگذاری...</p>
        ) : configs.length === 0 ? (
          <p>فعلاً کانفیگی ثبت نشده.</p>
        ) : (
          configs.map((item) => (
            <article className="config" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.type}</span>
              </div>
              <button onClick={() => copyConfig(item.config)}>
                کپی کانفیگ
              </button>
            </article>
          ))
        )}
      </section>

      <section className="panel">
        <h2>مدیریت پنل</h2>

        {!loggedIn ? (
          <>
            <input
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
            <button onClick={login}>ورود مدیر</button>
          </>
        ) : (
          <>
            <button className="secondary" onClick={logout}>
              خروج
            </button>

            <h3>افزودن کانفیگ جدید</h3>

            <input
              placeholder="نام کانفیگ"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>VLESS</option>
              <option>VMess</option>
              <option>Trojan</option>
              <option>Shadowsocks</option>
              <option>WireGuard</option>
              <option>Subscription</option>
            </select>

            <textarea
              placeholder="متن کانفیگ یا لینک اشتراک"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={5}
            />

            <button onClick={addConfig}>ثبت کانفیگ</button>

            <h3>حذف کانفیگ‌ها</h3>
            {configs.map((item) => (
              <article className="config" key={item.id}>
                <strong>{item.name}</strong>
                <button
                  className="danger"
                  onClick={() => deleteConfig(item.id)}
                >
                  حذف
                </button>
              </article>
            ))}
          </>
        )}

        {message && <p className="message">{message}</p>}
      </section>

      <footer>اتصال VPN از طریق برنامه VPN گوشی انجام می‌شود.</footer>
    </main>
  );
            }
