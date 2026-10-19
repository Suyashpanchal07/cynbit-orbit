import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cynbit ORBIT | Synthetic Operations Intelligence",
  description: "A synthetic operations intelligence proof of concept.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
