import fs from "fs";
import path from "path";
import ProductDoc, { DocLang } from "./product-doc";

function loadProduct(): string {
  return fs.readFileSync(path.join(process.cwd(), "docs", "PRODUCT.md"), "utf8");
}

function splitProduct(md: string): { zh: string; en: string } {
  const marker = "\n## 5. What it is";
  const idx = md.indexOf(marker);
  if (idx < 0) {
    return { zh: md, en: md };
  }
  const zh = `${md.slice(0, idx).trim()}\n`;
  const enBody = md
    .slice(idx + 1)
    .replace(/^## ([5-8])\./gm, (_, n: string) => `## ${Number(n) - 4}.`);
  return { zh, en: enBody };
}

export default function GuidePage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const { zh, en } = splitProduct(loadProduct());
  const lang: DocLang = searchParams?.lang === "en" ? "en" : "zh";
  return <ProductDoc zh={zh} en={en} lang={lang} />;
}
