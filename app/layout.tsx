import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Technic Showroom — Interactive Assembly",
  description: "Khám phá, trải từng mảnh và xem hướng dẫn lắp ráp các mẫu xe LEGO Technic trực tiếp trong không gian 3D.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
