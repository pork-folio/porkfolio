"use client";

import * as React from "react";
import {
  IconHistory,
  IconWallet,
  IconScale,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRebalancingStore } from "@/store/rebalancing";

export function AppSidebar({
  variant,
}: {
  variant: "inset" | "sidebar" | "floating";
}) {
  const operations = useRebalancingStore((state) => state.operations);

  const navItems = [
    {
      title: "Portfolio",
      url: "/portfolio",
      icon: IconWallet,
    },
    {
      title: "Rebalancing",
      url: "/rebalancing",
      icon: IconScale,
      badge: operations.length > 0 ? operations.length : undefined,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: IconHistory,
    },
  ];

  return (
    <Sidebar variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1"
            >
              <Link href="/" className="flex items-center gap-1">
                <img
                  src="/logo.svg"
                  alt="Porkfolio Logo"
                  width={28}
                  height={28}
                  className="dark:invert"
                  style={{ filter: 'var(--filter-pork)' }}
                />
                <span className="text-base text-xl font-semibold">
                  <span className="text-color-pork">Pork</span>folio
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <IconSettings className="h-4 w-4" />
                Settings
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
