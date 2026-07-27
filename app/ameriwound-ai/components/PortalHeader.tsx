"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PortalHeaderProps {
  title?: string;
  onLogout: () => void;
  adminHref?: string;
  dashboardHref?: string;
  demoHref?: string;
}

export function PortalHeader({
  title = "AmeriWound AI",
  onLogout,
  adminHref = "/ameriwound-ai/admin/",
  dashboardHref,
  demoHref = "/ameriwound-ai/demo/",
}: PortalHeaderProps) {
  const pathname = usePathname();
  const onDemo = pathname?.startsWith("/ameriwound-ai/demo");

  return (
    <header className="portal-header">
      <div className="portal-brand">
        <img
          src="/assets/wp-content/uploads/2024/11/site-logo350x100.svg"
          alt="AmeriWound"
        />
        <span>{title}</span>
      </div>
      <nav className="portal-nav">
        {dashboardHref && (
          <Link href={dashboardHref}>Dashboard</Link>
        )}
        {demoHref && !onDemo && (
          <Link href={demoHref}>Transcribe</Link>
        )}
        {adminHref && (
          <Link href={adminHref}>Admin</Link>
        )}
        <button type="button" onClick={onLogout} className="portal-btn portal-btn-ghost">
          Sign Out
        </button>
      </nav>
    </header>
  );
}
