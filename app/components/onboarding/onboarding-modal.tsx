"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { WelcomeStep } from "@/app/components/onboarding/steps/welcome";
import { AddProductStep } from "@/app/components/onboarding/steps/add-product";
import { ConfigureDrainsStep } from "@/app/components/onboarding/steps/configure-drains";
import { FirstRefreshStep } from "@/app/components/onboarding/steps/first-refresh";
import { CompleteStep } from "@/app/components/onboarding/steps/complete";

const TOTAL_STEPS = 5;

type OnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const skipOnboarding = useMutation(api.settings.skipOnboarding);
  const advanceOnboardingStep = useMutation(api.settings.advanceOnboardingStep);
  const [step, setStep] = useState(0);

  const handleSkip = useCallback(async () => {
    try {
      await skipOnboarding({});
    } finally {
      setStep(0);
      onClose();
    }
  }, [onClose, skipOnboarding]);

  const handleNext = useCallback(async () => {
    const nextStep = Math.min(step + 1, TOTAL_STEPS - 1);
    try {
      await advanceOnboardingStep({ step: nextStep });
      setStep(nextStep);
    } catch (error) {
      console.error("Failed to advance onboarding step:", error);
    }
  }, [advanceOnboardingStep, step]);

  const handleComplete = useCallback(async () => {
    try {
      await advanceOnboardingStep({ step: TOTAL_STEPS });
      setStep(0);
      onClose();
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  }, [advanceOnboardingStep, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSkip, isOpen]);

  let stepContent = <WelcomeStep onNext={handleNext} />;
  if (step === 1) stepContent = <AddProductStep onNext={handleNext} />;
  if (step === 2) stepContent = <ConfigureDrainsStep onNext={handleNext} />;
  if (step === 3) stepContent = <FirstRefreshStep onNext={handleNext} />;
  if (step === 4) stepContent = <CompleteStep onClose={handleComplete} />;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-bg-creep/80 backdrop-blur-sm" />
      <div
        className="relative card w-full max-w-xl p-6 md:p-8 text-text-light"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => void handleSkip()}
          aria-label="Close onboarding"
          className="absolute right-4 top-4 rounded-full border border-border-subtle bg-bg-carapace p-2 text-text-dim transition hover:text-text-light"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>

        <div className="flex min-h-[320px] flex-col justify-between gap-8">
          {stepContent}

          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <span
                key={index}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  index === step
                    ? "bg-hive shadow-[0_0_10px_rgba(168,85,247,0.45)]"
                    : "bg-border-subtle"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
