"use client";

import * as React from "react";
import { IconHistory, IconWallet, IconScale } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
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
                <Image
                  src="/logo.svg"
                  alt="Porkfolio Logo"
                  width={28}
                  height={28}
                  className="dark:invert"
                />
                <span className="text-base text-xl font-semibold">
                  Porkfolio
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
    </Sidebar>
  );
}
