import type { Metadata } from "next";
import "./globals.css";
import { NearWalletProvider } from "@/components/NearWalletProvider";

export const metadata: Metadata = {
  title: "仙途寻道·问鼎天榜 (DaoAscension) | NEAR On-Chain Xianxia RPG",
  description:
    "Built for NEAR Hackathon 2026: NFTs as Accounts (NEP-171 + Sub-Accounts), Spiritual Herb Farming (+HP), Immortal Artifact Forging (+ATK), Secret Realm Combat, and Sect Treasury Weekly Leaderboards settled cross-chain via NEAR Intents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <NearWalletProvider>
          {children}
        </NearWalletProvider>
      </body>
    </html>
  );
}
