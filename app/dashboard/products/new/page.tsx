"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useMutation(api.products.create);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedDomain = domain.trim();

    if (!trimmedName || !trimmedDomain) {
      setError("Name and domain are required.");
      return;
    }

    setIsSaving(true);
    try {
      await createProduct({ name: trimmedName, domain: trimmedDomain });
      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-text-light">
          Add product
        </h1>
        <p className="text-text-dim">Track a new product in Overmind.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            placeholder="Overmind"
          />
        </div>

        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="domain">
            Domain
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            placeholder="overmind.ai"
          />
        </div>

        {error && <p className="text-sm text-spore">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Create product"}
          </button>
          <Link
            href="/dashboard/products"
            className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
