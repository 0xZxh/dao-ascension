import fs from "fs";
import path from "path";
import type { InternalStore } from "./engine";

const DATA_DIR = path.join(process.cwd(), ".data", "stores");

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function saveStoreToDisk(accountId: string, store: InternalStore) {
  if (typeof window !== "undefined") return;
  try {
    ensureDirExists();
    const filePath = path.join(DATA_DIR, `${accountId.replace(/[^a-zA-Z0-9_.-]/g, "_")}.json`);
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error(`Failed to save store for ${accountId}:`, err);
  }
}

export function loadStoreFromDisk(accountId: string): InternalStore | null {
  if (typeof window !== "undefined") return null;
  try {
    ensureDirExists();
    const filePath = path.join(DATA_DIR, `${accountId.replace(/[^a-zA-Z0-9_.-]/g, "_")}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content) as InternalStore;
    }
  } catch (err) {
    console.error(`Failed to load store for ${accountId}:`, err);
  }
  return null;
}

export function deleteStoreFromDisk(accountId: string) {
  if (typeof window !== "undefined") return;
  try {
    const filePath = path.join(DATA_DIR, `${accountId.replace(/[^a-zA-Z0-9_.-]/g, "_")}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete store for ${accountId}:`, err);
  }
}
