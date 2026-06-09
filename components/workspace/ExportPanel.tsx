"use client";

import { useState } from "react";
import type { ExportResult } from "@/packages/shared/types";

export function ExportPanel({
  projectId,
  exports
}: {
  projectId: string;
  exports: ExportResult | null;
}) {
  const [copied, setCopied] = useState("");

  const copy = async (label: string, content: string | undefined) => {
    if (!content) {
      setCopied("暂无可复制内容");
      return;
    }

    await navigator.clipboard.writeText(content);
    setCopied(`${label} 已复制`);
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">导出</h2>
      <p className="mt-1 text-sm text-neutral-600">
        可复制导出内容，也可通过 API 获取最新项目导出。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => copy("Markdown", exports?.markdown)}
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800"
        >
          复制 Markdown
        </button>
        <button
          type="button"
          onClick={() => copy("JSON", exports?.json)}
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          复制 JSON
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <a
          href={`/api/projects/${projectId}/export?format=markdown`}
          className="text-teal-700 hover:text-teal-900"
        >
          打开 Markdown API
        </a>
        <a
          href={`/api/projects/${projectId}/export?format=json`}
          className="text-teal-700 hover:text-teal-900"
        >
          打开 JSON API
        </a>
      </div>
      {copied ? <p className="mt-3 text-sm text-teal-700">{copied}</p> : null}
      {exports?.mermaid ? (
        <pre className="mt-4 overflow-x-auto rounded-md bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
          {exports.mermaid}
        </pre>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">暂无 Mermaid 页面流转图。</p>
      )}
    </section>
  );
}
