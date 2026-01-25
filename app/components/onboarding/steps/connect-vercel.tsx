"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type ConnectVercelStepProps = {
  onNext: () => void;
};

export function ConnectVercelStep({ onNext }: ConnectVercelStepProps) {
  const connections = useQuery(api.connections.list);
  const vercelConnection = connections?.find((c) => c.service === "vercel");
  const isConnected = !!vercelConnection;

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-semibold text-text-light">
          Connect Vercel
        </h2>
        <p className="text-text-dim">
          Connect your Vercel account to track real traffic data from your projects.
        </p>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-3 rounded-lg border border-status-success/30 bg-status-success/10 px-4 py-3">
          <svg
            className="h-5 w-5 text-status-success"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-status-success">
            Vercel connected successfully
          </span>
        </div>
      ) : (
        <a
          href="/api/auth/vercel/authorize"
          className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 76 76" fill="currentColor">
            <path d="M38 0L76 66H0L38 0Z" />
          </svg>
          Connect Vercel
        </a>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onNext}
          className={isConnected ? "btn-primary px-4 py-2 text-sm font-medium text-white" : "btn-secondary px-4 py-2 text-sm font-medium text-text-light"}
        >
          {isConnected ? "Continue" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
