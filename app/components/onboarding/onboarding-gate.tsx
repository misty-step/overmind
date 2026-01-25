"use client";

import { useQuery } from "convex/react";
import { useState, useEffect } from "react";

import { api } from "@/convex/_generated/api";
import { OnboardingModal } from "./onboarding-modal";

export function OnboardingGate() {
  const onboardingStatus = useQuery(api.settings.getOnboardingStatus);
  const [showModal, setShowModal] = useState(false);

  // Show modal when status loads and onboarding is not completed
  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.completed) {
      setShowModal(true);
    }
  }, [onboardingStatus]);

  const handleClose = () => {
    setShowModal(false);
  };

  // Don't render anything while loading
  if (onboardingStatus === undefined) return null;

  return <OnboardingModal isOpen={showModal} onClose={handleClose} />;
}
