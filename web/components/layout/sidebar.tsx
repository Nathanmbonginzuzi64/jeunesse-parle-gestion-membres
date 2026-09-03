"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth";
import { useJpUnread } from "@/lib/hooks/use-jp-unread";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, type NavItem } from "./navigation";

function itemActive(pathname: string, search: string, item: NavItem) {
  const [path, query] = item.href.split("?");
  if (query) {
    return pathname === path && (search.includes(query) || search === `?${query}`);
  }
  if (item.exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({
  item,
  onClose,
  nested = false,
  badge,
}: {
  item: NavItem;
  onClose: () => void;
  nested?: boolean;
  badge?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const active = itemActive(pathname, search, item);
  const Icon = item.icon;
  const [open, setOpen] = useState(
    Boolean(item.children?.some((child) => itemActive(pathname, search, child)) || active),
  );

  if (item.children?.length) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            active ? "bg-white/12 font-medium text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-white/10 pl-2">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} onClose={onClose} nested />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          nested && "py-1.5 text-[13px]",
          active
            ? "bg-white/15 font-medium text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        {!nested && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        {nested && <span className="h-1 w-1 rounded-full bg-current opacity-50" />}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge && badge > 0 ? (
          <span className="rounded-full bg-gold-400 px-1.5 py-0.5 text-[10px] font-semibold text-brand-950">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, can } = useAuth();
  const { count: jpUnread } = useJpUnread();

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.requiresMember && !user?.member_id) return false;
      if (!item.permissions) return true;
      return can(item.permissions);
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col bg-brand-950 transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" onClick={onClose}>
            <BrandMark inverted subtitle="RDC 🇨🇩" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href + item.label}
                    item={item}
                    onClose={onClose}
                    badge={item.href === "/jp-message" ? jpUnread : undefined}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="truncate text-xs font-medium text-white">{user?.name}</p>
          <p className="truncate text-[11px] text-white/50">
            {user?.role?.name}
            {user?.scope?.province ? ` · ${user.scope.province}` : ""}
          </p>
        </div>
      </aside>
    </>
  );
}
