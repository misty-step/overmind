"use client";

type CompleteStepProps = {
  onClose: () => void;
};

export function CompleteStep({ onClose }: CompleteStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-semibold text-text-light">
          🎉 You&apos;re all set!
        </h2>
        <p className="text-text-dim">
          Your dashboard will update as traffic flows in.
        </p>
        <p className="text-text-dim">Check back in a few hours for real data.</p>
      </div>
      <div>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
