'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
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
          className="rounded-full w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex items-center justify-center"
          aria-label="Project Help"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      </div>

      {/* Onboarding dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Need help with projects?</DialogTitle>
            <DialogDescription>
              Our guided project creation experience will walk you through creating a project step by step.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-500">
              The guided experience includes:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-500 list-disc pl-5">
              <li>Simple step-by-step project creation</li>
              <li>AI team recommendations</li>
              <li>Best practices for project setup</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleSkipOnboarding}
            >
              Skip for now
            </Button>
            <Button
              onClick={handleStartOnboarding}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start guided setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProjectOnboardingLauncher;
