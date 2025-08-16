'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProjectOnboardingLauncher() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  useEffect(() => {
    // Check if the user has seen the project onboarding
    const hasSeenProjectOnboarding = localStorage.getItem('hasSeenProjectOnboarding');
    if (!hasSeenProjectOnboarding) {
      setHasSeenOnboarding(false);
      // Show the dialog after a short delay
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStartOnboarding = () => {
    // Mark that the user has seen the onboarding
    localStorage.setItem('hasSeenProjectOnboarding', 'true');
    setShowDialog(false);
    // Navigate to the project onboarding page
    router.push('/dashboard/projects/onboarding');
  };

  const handleSkipOnboarding = () => {
    // Mark that the user has seen the onboarding
    localStorage.setItem('hasSeenProjectOnboarding', 'true');
    setShowDialog(false);
  };

  const handleOpenOnboarding = () => {
    setShowDialog(true);
  };

  return (
    <>
      {/* Fixed help button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={handleOpenOnboarding}
          className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white text-purple-600 border border-purple-200 shadow-lg hover:shadow-xl hover:bg-purple-50 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none overflow-hidden p-0"
          aria-label="Project Help"
        >
          <div className="relative">
            <Lightbulb className="h-4 w-4 text-purple-600 transition-transform duration-200 group-hover:rotate-12" fill="currentColor" fillOpacity="0.1" />
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Need help?
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </Button>
      </div>

      
    </>
  );
}

export default ProjectOnboardingLauncher;
