"use client";

import React from "react";
import { NearProvider } from "near-connect-hooks";

export function NearWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <NearProvider config={{ network: "testnet" }}>
      {children}
    </NearProvider>
  );
}
