import "./style.css";

export const metadata = {
  title: "پنل مدیریت کانفیگ VPN",
  description: "مدیریت و دریافت کانفیگ‌های VPN",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
