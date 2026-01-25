"use client";

type WelcomeStepProps = {
  onNext: () => void;
};

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-display font-semibold text-text-light">
        👋 Welcome to Overmind
      </h2>
      <p className="text-text-dim">
        Let&apos;s set up your portfolio command center. This takes about 3 minutes.
      </p>
      <div>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
