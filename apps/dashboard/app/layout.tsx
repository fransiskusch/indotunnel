import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndoTunnel",
  description: "Expose localhost to the internet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
