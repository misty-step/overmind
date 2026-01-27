"use client";

import { useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@/convex/_generated/api";
import { OnboardingModal } from "./onboarding-modal";

export function OnboardingGate() {
  const onboardingStatus = useQuery(api.settings.getOnboardingStatus);
  const [dismissed, setDismissed] = useState(false);

  const handleClose = useCallback(() => {
    setDismissed(true);
  }, []);

  // Don't render anything while loading or if no user
  if (onboardingStatus === undefined || onboardingStatus === null) return null;

  // Derive open state: show if not completed AND not dismissed this session
  const isOpen = !onboardingStatus.completed && !dismissed;

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      initialStep={onboardingStatus.currentStep}
    />
  );
}
