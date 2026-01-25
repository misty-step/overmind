"use client";

import { useState } from "react";
import { useAction } from "convex/react";

import { api } from "@/convex/_generated/api";

type FirstRefreshStepProps = {
  onNext: () => void;
};

export function FirstRefreshStep({ onNext }: FirstRefreshStepProps) {
  const refreshAll = useAction(api.actions.refreshAll.refreshAll);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await refreshAll({});
      setHasRefreshed(true);
    } catch {
      setError("Refresh failed. Try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-semibold text-text-light">
          Fetch your first metrics
        </h2>
        <p className="text-text-dim">
          Let&apos;s run a health check on your products.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <svg
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v6h6M20 20v-6h-6M5.5 9A7 7 0 0 1 18 7.5M18.5 15A7 7 0 0 1 6 16.5"
            />
          </svg>
          {isRefreshing ? "Refreshing..." : "Refresh All"}
        </button>
      </div>
      {error ? <p className="text-sm text-text-dim">{error}</p> : null}
      {hasRefreshed ? (
        <div className="space-y-3">
          <p className="text-text-dim">
            Done! Your products are now being monitored.
          </p>
          <button
            type="button"
            onClick={onNext}
            className="btn-primary px-4 py-2 text-sm font-medium text-white"
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
