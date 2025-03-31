"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

export function DynamicWallet() {
  return (
    <div className="flex items-center gap-2">
      <DynamicWidget />
    </div>
  );
}
