'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProjectsTour from './ProjectsTour';
import CreateProjectTour from './CreateProjectTour';
import { areTutorialsEnabled, onTutorialSettingChange } from '@/utils/tutorialSettings';

export function ProjectsTourLauncher() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
  const [tutorialsEnabled, setTutorialsEnabledState] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);

    // Check tutorial settings
    setTutorialsEnabledState(areTutorialsEnabled());

    // Listen for tutorial setting changes
    const cleanup = onTutorialSettingChange((enabled) => {
      setTutorialsEnabledState(enabled);
      if (!enabled && isTourOpen) {
        setIsTourOpen(false);
      }
    });

    const hasTakenTour = localStorage.getItem('hasTakenProjectsTour');

    if (!hasTakenTour) {
      // Show welcome prompt first
      const timer = setTimeout(() => {
        setShowWelcomePrompt(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }

    return cleanup;
  }, [isTourOpen]);

  const startTour = () => {
    setShowWelcomePrompt(false);
    setIsTourOpen(true);
    localStorage.setItem('hasTakenProjectsTour', 'true');
  };

  const dismissWelcome = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem('hasTakenProjectsTour', 'true');
  };

  // Determine which tour to show based on current path
  const getTourComponent = () => {
    if (pathname?.includes('/create')) {
      return <CreateProjectTour open={isTourOpen} onClose={() => setIsTourOpen(false)} />;
    } else if (pathname === '/dashboard/projects') {
      return <ProjectsTour open={isTourOpen} onClose={() => setIsTourOpen(false)} />;
    } else {
      // Don't show any tour on project detail pages
      return null;
    }
  };

  // Only show tour launcher on projects pages and create page, not on individual project detail pages
  if (!isMounted || !tutorialsEnabled || (pathname?.includes('/projects/') && pathname !== '/dashboard/projects' && !pathname?.includes('/create'))) return null;

  return (
    <>
      {/* Welcome Prompt */}
      {showWelcomePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-100">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Projects
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Would you like a quick tour to discover how to manage projects, create new ones, and edit existing projects effectively?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={startTour}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Tour
                </Button>
                <Button
                  onClick={dismissWelcome}
                  variant="outline"
                  className="flex-1 border-2 border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-600 font-semibold py-3 rounded-xl transition-all duration-200"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tour Button */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={() => setIsTourOpen(true)}
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

      {getTourComponent()}
    </>
  );
}
