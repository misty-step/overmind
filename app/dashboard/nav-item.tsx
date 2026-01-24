"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

export function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  const className = `flex items-center gap-3 px-3 py-2 rounded-md text-text-dim hover:text-text-light hover:bg-bg-carapace transition-colors ${
    isActive ? "nav-active text-hive" : ""
  }`;

  return (
    <Link
      href={href}
      className={className}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
