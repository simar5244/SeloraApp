'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabledSync, onTutorialSettingChange } from '@/utils/tutorialSettings';

const GalaxyViewWelcomeScreen = ({ open, onStart, onClose, isClosing }: { open: boolean; onStart: () => void; onClose: () => void; isClosing?: boolean }) => {
  if (!open) return null;

  return (
    <div 
      className={`galaxyview-welcome-overlay fixed bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
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
            Welcome to Galaxy View
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Let's take a quick tour of the galaxy view to help you understand how to explore your organization's network, connections, and collaborative relationships in an immersive 3D space.
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
        .galaxyview-welcome-overlay {
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

const GalaxyViewTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay before showing tour for fade-in effect
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const steps: TourProps['steps'] = [
    {
      title: 'Galaxy View',
      description: 'Welcome to the immersive galaxy view of your organization. Here you can explore connections, relationships, and collaboration patterns in a 3D network visualization.',
      target: () => document.querySelector('[data-tour="galaxy-container"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Search Galaxy',
      description: 'Search for specific employees by name, email, or role to quickly locate them in the 3D organizational galaxy.',
      target: () => document.querySelector('[data-tour="galaxy-search"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Department Filters',
      description: 'Use department filters to focus on specific areas of your organization and see how different departments connect in the galaxy.',
      target: () => document.querySelector('[data-tour="galaxy-filters"]') as HTMLElement,
      placement: 'bottom',
    },
  ];

  if (!mounted) return null;

  return (
    <>
      <Tour 
        open={open && isVisible} 
        onClose={onClose} 
        steps={steps}
        type="primary"
        arrow={true}
        rootClassName={`classic-galaxyview-tour ${isVisible ? 'tour-fade-in' : ''}`}
        mask={{
          color: 'rgba(0, 0, 0, 0.5)',
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }
        }}
        onFinish={onClose}
        scrollIntoViewOptions={{
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        }}
        closeIcon={true}
      />
      <style jsx global>{`
        .classic-galaxyview-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }

        .classic-galaxyview-tour .ant-tour {
          max-width: 220px;
          min-width: 200px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
        }
        
        .classic-galaxyview-tour .ant-tour-inner {
          font-size: 14px;
          padding: 12px;
          background: white !important;
          border-radius: 12px;
        }

        .classic-galaxyview-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }

        .classic-galaxyview-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .classic-galaxyview-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-galaxyview-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 32px;
          padding: 0 12px;
          transition: all 0.2s ease;
          font-size: 12px;
        }

        .classic-galaxyview-tour .ant-btn-primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border: none;
          color: white;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
        }

        .classic-galaxyview-tour .ant-btn-primary:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(139, 92, 246, 0.4);
        }

        .classic-galaxyview-tour .ant-btn-default {
          background: #f9fafb !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
          font-weight: 500 !important;
        }

        .classic-galaxyview-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }

        .classic-galaxyview-tour .ant-tour-close {
          color: #6b7280 !important;
          font-size: 14px !important;
          width: 20px !important;
          height: 20px !important;
          border-radius: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: absolute !important;
          top: 12px !important;
          right: 12px !important;
          z-index: 10 !important;
        }

        .classic-galaxyview-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-galaxyview-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-galaxyview-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-galaxyview-tour .ant-tour-mask {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 1050 !important;
          background-color: rgba(0, 0, 0, 0.5) !important;
        }

        /* Ensure tour content is above the mask and sidebar */
        .classic-galaxyview-tour .ant-tour {
          z-index: 1060 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-galaxyview-tour [data-tour] {
          position: relative;
          z-index: 1070 !important;
        }

        /* Tour fade-in animation */
        .classic-galaxyview-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-galaxyview-tour.tour-fade-in .ant-tour-mask {
          animation: maskFadeIn 0.5s ease-out forwards;
        }

        @keyframes tourFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes maskFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export function GalaxyViewTourLauncher() {
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

  // Only show on galaxy view page
  if (!isMounted || !pathname?.includes('/dashboard/galaxy-view') || !tutorialsEnabled) return null;

  return (
    <>
      {showWelcomePrompt && (
        <GalaxyViewWelcomeScreen 
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

      {isTourOpen && (
        <GalaxyViewTour open={true} onClose={closeTour} />
      )}
    </>
  );
}
