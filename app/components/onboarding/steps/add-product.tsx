"use client";

import Link from "next/link";

type AddProductStepProps = {
  onNext: () => void;
};

export function AddProductStep({ onNext }: AddProductStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-semibold text-text-light">
          Add your first product
        </h2>
        <p className="text-text-dim">
          Track a site by adding it manually or importing from YAML.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/products/new"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
        >
          Add Product
        </Link>
        <Link
          href="/dashboard/import"
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-light"
        >
          Import YAML
        </Link>
      </div>
      <div>
        <button
          type="button"
          onClick={onNext}
          className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
