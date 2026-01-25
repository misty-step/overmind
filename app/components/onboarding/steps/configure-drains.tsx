"use client";

type ConfigureDrainsStepProps = {
  onNext: () => void;
};

export function ConfigureDrainsStep({ onNext }: ConfigureDrainsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-semibold text-text-light">
          Configure Vercel Drains
        </h2>
        <p className="text-text-dim">
          To get real traffic data, set up Vercel Drains.
        </p>
      </div>
      <div className="rounded-lg border border-border-subtle bg-bg-carapace px-4 py-3 text-sm text-text-light font-mono">
        ./scripts/create-unified-drain.sh
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onNext}
          className="btn-primary px-4 py-2 text-sm font-medium text-white"
        >
          I&apos;ve done this
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
