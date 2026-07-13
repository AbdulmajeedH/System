"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "./nav-icons";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar item with active-route highlighting. */
export function SideNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  const Icon = NAV_ICONS[icon];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-primary-soft text-primary-hover"
          : "text-foreground/80 hover:bg-background hover:text-foreground"
      }`}
    >
      {active ? (
        <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-primary" aria-hidden />
      ) : null}
      {Icon ? <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} /> : null}
      {label}
    </Link>
  );
}

/** Mobile bottom-bar item. */
export function BottomNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  const Icon = NAV_ICONS[icon];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors duration-150 ${
        active ? "text-primary" : "text-muted hover:text-foreground"
      }`}
    >
      {Icon ? <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} /> : null}
      <span className="truncate max-w-16">{label}</span>
    </Link>
  );
}
