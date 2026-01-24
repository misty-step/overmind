"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const categoryOptions = [
  { value: "saas", label: "SaaS" },
  { value: "dev_tools", label: "Dev tools" },
  { value: "productivity", label: "Productivity" },
  { value: "games", label: "Games" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as Id<"products">;

  const product = useQuery(api.products.get, { id: productId });
  const updateProduct = useMutation(api.products.update);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [vercelProjectId, setVercelProjectId] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!product || isInitialized) return;
    setName(product.name ?? "");
    setDomain(product.domain ?? "");
    setDescription(product.description ?? "");
    setCategory(product.category ?? "");
    setVercelProjectId(product.vercelProjectId ?? "");
    setGithubRepo(product.githubRepo ?? "");
    setIsInitialized(true);
  }, [product, isInitialized]);

  if (product === undefined) {
    return (
      <div className="p-8">
        <div className="text-text-dim">Loading...</div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="p-8">
        <div className="card p-12 text-center">
          <h2 className="text-xl font-display font-semibold text-text-light mb-2">
            Product not found
          </h2>
          <p className="text-text-dim mb-4">
            This product doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard/products"
            className="btn-primary px-4 py-2 text-sm font-medium inline-block"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedDomain = domain.trim();

    if (!trimmedName || !trimmedDomain) {
      setError("Name and domain are required.");
      return;
    }

    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();
    const trimmedVercelProjectId = vercelProjectId.trim();
    const trimmedGithubRepo = githubRepo.trim();

    setIsSaving(true);
    try {
      await updateProduct({
        id: productId,
        name: trimmedName,
        domain: trimmedDomain,
        description: trimmedDescription || undefined,
        category: trimmedCategory || undefined,
        vercelProjectId: trimmedVercelProjectId || undefined,
        githubRepo: trimmedGithubRepo || undefined,
      });
      router.push(`/dashboard/products/${productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-text-light">
          Edit product
        </h1>
        <p className="text-text-dim">Update product details in Overmind.</p>
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

        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow min-h-[96px]"
            placeholder="Short summary of what this product does."
          />
        </div>

        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
          >
            <option value="">Select a category</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="vercelProjectId">
            Vercel Project ID
          </label>
          <input
            id="vercelProjectId"
            name="vercelProjectId"
            type="text"
            value={vercelProjectId}
            onChange={(event) => setVercelProjectId(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            placeholder="prj_123..."
          />
        </div>

        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="githubRepo">
            GitHub Repo
          </label>
          <input
            id="githubRepo"
            name="githubRepo"
            type="text"
            value={githubRepo}
            onChange={(event) => setGithubRepo(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            placeholder="owner/repo"
          />
        </div>

        {error && <p className="text-sm text-spore">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href={`/dashboard/products/${productId}`}
            className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
