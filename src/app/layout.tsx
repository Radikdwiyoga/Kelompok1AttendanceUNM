import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ['100', '300', '400', '700', '900']
});

export const metadata: Metadata = {
  title: "UNM Face Attendance",
  description: "Sistem Presensi Wajah Universitas Nusa Mandiri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={lato.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
