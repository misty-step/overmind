"use client";

import Link from "next/link";
import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

type Message = { tone: "success" | "error"; text: string };

export default function ImportPage() {
  const runImport = useAction(api.actions.import.requestImportFromYaml);
  const [yaml, setYaml] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    const trimmed = yaml.trim();
    if (!trimmed) {
      setMessage({ tone: "error", text: "Paste YAML to import." });
      return;
    }

    setIsImporting(true);
    setMessage(null);

    try {
      const result = await runImport({ yaml: trimmed });
      const count = result?.imported ?? 0;
      setMessage({
        tone: "success",
        text:
          count === 0
            ? "No new products to import."
            : `Imported ${count} product${count === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-text-light">
          Import products
        </h1>
        <p className="text-text-dim">
          Paste YAML from your product config to bulk import.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label htmlFor="yaml" className="block text-sm text-text-dim mb-2">
            YAML payload
          </label>
          <p className="text-sm text-text-dim mb-3">
            Expect a top-level <span className="text-text-light">products</span> key with a list of entries.
          </p>
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-hive">Show example</summary>
            <pre className="mt-3 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs text-text-mid whitespace-pre-wrap">
{`products:
  - name: Example
    domain: example.com
    description: ...
    category: ...
    vercel_project_id: ...
    stripe_product_id: ...
    github_repo: ...`}
            </pre>
          </details>
          <textarea
            id="yaml"
            name="yaml"
            value={yaml}
            onChange={(event) => setYaml(event.target.value)}
            rows={14}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 font-mono text-sm focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            placeholder={`products:
  - name: Example
    domain: example.com
    description: ...
    category: ...
    vercel_project_id: ...
    stripe_product_id: ...
    github_repo: ...`}
          />
        </div>

        {message && (
          <p className={`text-sm ${message.tone === "success" ? "text-spawn" : "text-spore"}`}>
            {message.text}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleImport}
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import products"}
          </button>
          <Link
            href="/dashboard/products"
            className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
          >
            Back to products
          </Link>
        </div>
      </div>
    </div>
  );
}
