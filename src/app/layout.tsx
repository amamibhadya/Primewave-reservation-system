import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resource Reservation System",
  description: "Organise shared resources and coordinate reservations without conflicts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              Reserve<span>Hub</span>
            </Link>
            <nav className="nav">
              <Link href="/">Dashboard</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/reservations">Reservations</Link>
              <Link href="/availability">Find availability</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
