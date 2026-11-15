"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Config = {
  id: string;
  name: string;
  type: string;
  config: string;
  active: boolean;
  created_at: string;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("VLESS");
  const [config, setConfig] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadConfigs() {
    const { data, error } = await supabase
      .from("vpn_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("خطا در دریافت کانفیگ‌ها");
      return;
    }

    setConfigs(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
      await loadConfigs();
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(!!session);
        loadConfigs();
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function login() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("ایمیل یا رمز عبور اشتباه است");
      return;
    }

    setLoggedIn(true);
    await loadConfigs();
    setMessage("ورود موفق بود");
  }

  async function logout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    await loadConfigs();
    setMessage("خارج شدید");
  }

  async function addConfig() {
    if (!name.trim() || !config.trim()) {
      setMessage("نام و متن کانفیگ را وارد کنید");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("vpn_configs").insert([
      {
        name: name.trim(),
        type,
        config: config.trim(),
        active: true,
      },
    ]);

    setLoading(false);

    if (error) {
      setMessage("خطا در افزودن کانفیگ");
      return;
    }

    setName("");
    setConfig("");
    setMessage("کانفیگ اضافه شد");
    await loadConfigs();
  }

  async function toggleConfig(item: Config) {
    const { error } = await supabase
      .from("vpn_configs")
      .update({ active: !item.active })
      .eq("id", item.id);

    if (error) {
      setMessage("تغییر وضعیت انجام نشد");
      return;
    }

    setMessage(item.active ? "کانفیگ غیرفعال شد" : "کانفیگ فعال شد");
    await loadConfigs();
  }

  async function deleteConfig(id: string) {
    if (!confirm("این کانفیگ حذف شود؟")) return;

    const { error } = await supabase
      .from("vpn_configs")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("حذف انجام نشد");
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
      setMessage("کپی انجام نشد؛ متن را دستی کپی کنید");
    }
  }

  const activeConfigs = configs.filter((item) => item.active);

  return (
    <main dir="rtl">
      <div className="container">
        <h1>پنل مدیریت کانفیگ VPN</h1>
        <p>مدیریت و اشتراک‌گذاری کانفیگ‌ها</p>

        {message && <p>{message}</p>}

        {!loggedIn ? (
          <section>
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
          <section>
            <h2>مدیریت کانفیگ‌ها</h2>

            <button onClick={logout}>خروج</button>

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

            <h3>فهرست همه کانفیگ‌ها</h3>

            {configs.length === 0 && <p>هنوز کانفیگی ثبت نشده است.</p>}

            {configs.map((item) => (
              <div
                key={item.id}
                className="config-card"
                style={{
                  border: "1px solid #555",
                  borderRadius: "10px",
                  padding: "15px",
                  margin: "12px 0",
                }}
              >
                <h3>{item.name}</h3>
                <p>نوع: {item.type}</p>
                <p>
                  وضعیت: {item.active ? "فعال" : "غیرفعال"}
                </p>

                <button onClick={() => toggleConfig(item)}>
                  {item.active ? "غیرفعال کردن" : "فعال کردن"}
                </button>

                <button onClick={() => deleteConfig(item.id)}>
                  حذف
                </button>
              </div>
            ))}
          </section>
        )}

        <hr />

        <section>
          <h2>کانفیگ‌های فعال</h2>

          {activeConfigs.length === 0 && (
            <p>فعلاً کانفیگ فعالی وجود ندارد.</p>
          )}

          {activeConfigs.map((item) => (
            <div
              key={item.id}
              className="config-card"
              style={{
                border: "1px solid #555",
                borderRadius: "10px",
                padding: "15px",
                margin: "12px 0",
              }}
            >
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
