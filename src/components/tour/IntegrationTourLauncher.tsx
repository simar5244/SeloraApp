'use client';

import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import IntegrationTour from './IntegrationTour';
import { areTutorialsEnabledSync, onTutorialSettingChange } from '@/utils/tutorialSettings';

const IntegrationWelcomeScreen = ({ open, onStart, onClose, isClosing }: { open: boolean; onStart: () => void; onClose: () => void; isClosing?: boolean }) => {
  if (!open) return null;

  return (
    <div
      className={`integration-welcome-overlay fixed bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
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

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Integrations!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Let's take a quick tour to help you connect and manage your organization's external systems
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">ERP Connections</h3>
              <p className="text-gray-600 text-xs">Connect and sync data from external ERP systems</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Data Management</h3>
              <p className="text-gray-600 text-xs">Import and manage employee and organizational data</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">System Integration</h3>
              <p className="text-gray-600 text-xs">Seamlessly integrate with your existing workflows</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={onStart}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Tour
          </Button>
        </div>
      </div>

      {/* Global CSS for welcome screen overlay */}
      <style jsx global>{`
        .integration-welcome-overlay {
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

export function IntegrationTourLauncher() {
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

  if (!isMounted || !tutorialsEnabled || (!pathname?.includes('/dashboard/integration') && !pathname?.includes('/dashboard/employees'))) return null;

  return (
    <>
      {showWelcomePrompt && (
        <IntegrationWelcomeScreen
          open={true}
          onStart={startTour}
          onClose={dismissWelcome}
          isClosing={isWelcomeClosing}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={manualStartTour}
          className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white text-purple-600 border border-purple-200 shadow-lg hover:shadow-xl hover:bg-purple-50 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none overflow-hidden p-0"
          aria-label="Tutorial"
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

      {isTourOpen && (
        <IntegrationTour open={true} onClose={closeTour} />
      )}
    </>
  );
}
