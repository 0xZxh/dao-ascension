"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { JadeGlassPanel, StarlightCloudCanvas } from "@/components/JadeUiOrnaments";

export type DocLang = "zh" | "en";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractToc(md: string): Array<{ text: string; slug: string }> {
  return md
    .split("\n")
    .filter((l) => /^## \d+\./.test(l))
    .map((l) => {
      const text = l.replace(/^## /, "").trim();
      return { text, slug: slugify(text) };
    });
}

function childrenToText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return childrenToText((children as React.ReactElement).props.children);
  }
  return "";
}

const TAG_STYLES: Array<[RegExp, string]> = [
  [/【确定】/g, "tag-confirmed"],
  [/【待讨论】/g, "tag-discuss"],
  [/【待确认】/g, "tag-pending"],
];

function highlightTags(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    const parts = node.split(/(【确定】|【待讨论】|【待确认】)/g);
    if (parts.length === 1) return node;
    return parts.map((p, i) => {
      const hit = TAG_STYLES.find(([re]) => p.match(re));
      if (!hit) return p;
      const cls =
        hit[1] === "tag-confirmed"
          ? "bg-[#E2F1EC] text-[#235B4F] border-[#9CC5BD]"
          : hit[1] === "tag-discuss"
          ? "bg-[#F6EFE1] text-[#7A5923] border-[#D7BE8A]"
          : "bg-[#F6E8EA] text-[#8A3B48] border-[#DDB1B8]";
      return (
        <span
          key={i}
          className={`inline-block px-1.5 mx-0.5 rounded border text-[0.78em] font-semibold align-baseline ${cls}`}
        >
          {p}
        </span>
      );
    });
  }
  if (Array.isArray(node)) return node.map((n, i) => <React.Fragment key={i}>{highlightTags(n)}</React.Fragment>);
  return node;
}

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl sm:text-3xl font-bold text-[#1F3532] tracking-wide mb-5">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const text = childrenToText(children);
    return (
      <h2
        id={slugify(text)}
        className="scroll-mt-6 text-xl font-bold text-[#1F3532] mt-12 mb-4 pb-2 border-b border-[#C8AA72]/50"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 className="text-base font-bold text-[#2E5C53] mt-7 mb-3">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-7 text-[#2F4744] my-3">{highlightTags(children)}</p>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-7 text-[#2F4744]">{highlightTags(children)}</li>
  ),
  ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-[#1F3532]">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-[#C8AA72] bg-white/60 px-4 py-1 rounded-r-lg">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-[#C8AA72]/40" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-[#C8AA72]/45 bg-white/70">
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#EEF5F2]">{children}</thead>,
  th: ({ children, style }) => (
    <th
      style={style}
      className="px-3 py-2 text-left font-semibold text-[#2E5C53] border-b border-[#C8AA72]/40 whitespace-nowrap"
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="px-3 py-2 align-top text-[#2F4744] border-b border-[#C8AA72]/20">
      {highlightTags(children)}
    </td>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className) || String(children).includes("\n");
    if (isBlock) {
      return (
        <code className="block whitespace-pre text-[12px] leading-6 text-[#E6F4F0]">{children}</code>
      );
    }
    return (
      <code className="px-1 py-0.5 rounded bg-[#EAF1EF] text-[#2E5C53] text-[0.85em] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 p-4 rounded-xl bg-[#1E2D2B] overflow-x-auto font-mono">{children}</pre>
  ),
};

const COPY = {
  zh: {
    back: "← 返回游戏",
    title: "仙途寻道 · 产品介绍",
    language: "语言",
    toc: "目录",
  },
  en: {
    back: "← Back to the game",
    title: "DaoAscension · Product",
    language: "Language",
    toc: "Contents",
  },
} as const;

const LANG_OPTIONS: Array<{ id: DocLang; label: string }> = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
];

function guideHref(next: DocLang): string {
  return next === "en" ? "/guide?lang=en" : "/guide";
}

function LanguageSelect({ lang, label }: { lang: DocLang; label: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const current = LANG_OPTIONS.find((item) => item.id === lang) ?? LANG_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: DocLang) {
    setOpen(false);
    if (next !== lang) router.replace(guideHref(next));
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="xianxia-btn-celadon inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
      >
        {current.label}
        <span aria-hidden className={`text-[10px] leading-none ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-40 mt-1 min-w-[7.5rem] overflow-hidden border border-[#C8AA72]/70 bg-white/95 shadow-lg"
        >
          {LANG_OPTIONS.map((item) => {
            const selected = item.id === lang;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(item.id)}
                  className={`block w-full px-3 py-1.5 text-left text-xs font-semibold ${
                    selected ? "bg-[#E2F1EC] text-[#214841]" : "text-[#2F4744] hover:bg-[#F3F9F7]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function ProductDoc({
  zh,
  en,
  lang,
}: {
  zh: string;
  en: string;
  lang: DocLang;
}) {
  const md = lang === "en" ? en : zh;
  const toc = extractToc(md);
  const copy = COPY[lang];

  return (
    <div className="min-h-screen relative flex flex-col items-center pb-16 px-3 sm:px-6">
      <StarlightCloudCanvas />

      <header className="w-full max-w-6xl mt-5 z-30">
        <JadeGlassPanel className="w-full px-5 py-3">
          <div className="flex w-full items-center gap-3">
            <Link
              href="/"
              className="xianxia-btn-celadon shrink-0 px-3.5 py-1.5 text-xs font-semibold"
            >
              {copy.back}
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <img src="/logo.png" alt="" className="h-7 w-7 shrink-0" />
              <span className="min-w-0 truncate text-center text-sm font-bold tracking-wider text-[#253D39]">
                {copy.title}
              </span>
            </div>
            <LanguageSelect lang={lang} label={copy.language} />
          </div>
        </JadeGlassPanel>
      </header>

      <div className="w-full max-w-6xl mt-5 z-20 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-3">
          <JadeGlassPanel className="p-4 lg:sticky lg:top-5">
            <div className="text-xs font-bold text-[#7A5923] mb-2 tracking-wider">{copy.toc}</div>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.slug}
                  href={`#${item.slug}`}
                  className="block text-[13px] text-[#2F4744] hover:text-[#1F3532] hover:bg-white/70 rounded-lg px-2 py-1"
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </JadeGlassPanel>
        </aside>

        <main className="lg:col-span-9">
          <JadeGlassPanel className="p-5 sm:p-9">
            <article>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {md}
              </ReactMarkdown>
            </article>
          </JadeGlassPanel>
        </main>
      </div>
    </div>
  );
}
