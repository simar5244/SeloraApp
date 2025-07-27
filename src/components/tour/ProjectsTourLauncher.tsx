'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProjectsTour from './ProjectsTour';
import CreateProjectTour from './CreateProjectTour';
import { areTutorialsEnabledSync, onTutorialSettingChange } from '@/utils/tutorialSettings';

const ProjectsWelcomeScreen = ({ open, onStart, onClose, isClosing }: { open: boolean; onStart: () => void; onClose: () => void; isClosing?: boolean }) => {
  if (!open) return null;

  return (
    <div
      className={`projects-welcome-overlay fixed bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
    >
      <div className={`bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-100 relative transform transition-all duration-500 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Projects
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Let's take a quick tour of the projects page to help you understand how to create, manage, and track your organization's projects and tasks.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Skip Tour
            </Button>
            <Button
              onClick={onStart}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Tour
            </Button>
          </div>
        </div>
      </div>

      {/* Global CSS for welcome screen overlay */}
      <style jsx global>{`
        .projects-welcome-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          background-color: rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>
    </div>
  );
};

export function ProjectsTourLauncher() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
  const [isWelcomeClosing, setIsWelcomeClosing] = useState(false);
  const [tutorialsEnabled, setTutorialsEnabledState] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);

    // Check tutorial settings
    setTutorialsEnabledState(areTutorialsEnabledSync());

    // Listen for tutorial setting changes
    const cleanup = onTutorialSettingChange((enabled) => {
      setTutorialsEnabledState(enabled);
      if (!enabled && isTourOpen) {
        setIsTourOpen(false);
      }
    });

    return cleanup;
  }, [isTourOpen]);

  const startTour = () => {
    // Start fade out animation
    setIsWelcomeClosing(true);

    // Wait for fade out to complete, then start tour
    setTimeout(() => {
      setShowWelcomePrompt(false);
      setIsWelcomeClosing(false);

      // Small delay before showing tour for smooth transition
      setTimeout(() => {
        setIsTourOpen(true);
      }, 100);
    }, 500); // 500ms for fade out animation
  };

  const dismissWelcome = () => {
    // Start fade out animation
    setIsWelcomeClosing(true);

    // Wait for fade out to complete, then close
    setTimeout(() => {
      setShowWelcomePrompt(false);
      setIsWelcomeClosing(false);
    }, 500); // 500ms for fade out animation
  };

  const manualStartTour = () => {
    setShowWelcomePrompt(true);
  };

  const closeTour = () => {
    setIsTourOpen(false);
  };

  // Determine which tour to show based on current path
  const getTourComponent = () => {
    if (pathname?.includes('/create')) {
      return <CreateProjectTour open={true} onClose={closeTour} />;
    } else if (pathname === '/dashboard/projects') {
      return <ProjectsTour open={true} onClose={closeTour} />;
    } else {
      // Don't show any tour on project detail pages
      return null;
    }
  };

  // Only show tour launcher on projects pages and create page, not on individual project detail pages
  if (!isMounted || !tutorialsEnabled || (pathname?.includes('/projects/') && pathname !== '/dashboard/projects' && !pathname?.includes('/create'))) return null;

  return (
    <>
      {showWelcomePrompt && (
        <ProjectsWelcomeScreen
          open={true}
          onStart={startTour}
          onClose={dismissWelcome}
          isClosing={isWelcomeClosing}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={manualStartTour}
          className="group relative h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          style={{
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
          }}
        >
          <HelpCircle className="h-5 w-5 transition-transform duration-200 group-hover:rotate-12" />

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Take Tutorial
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </Button>
      </div>

      {isTourOpen && getTourComponent()}
    </>
  );
}
