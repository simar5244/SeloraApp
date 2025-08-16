'use client';

import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabledSync, onTutorialSettingChange } from '@/utils/tutorialSettings';
import { createPortal } from 'react-dom';

const YourReportsWelcomeScreen = ({ open, onStart, onClose, isClosing }: { open: boolean; onStart: () => void; onClose: () => void; isClosing?: boolean }) => {
  if (!open) return null;

  const content = (
    <div
      className={`yourreports-welcome-overlay fixed bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        inset: 0,
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Reports!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Let's take a quick tour to help you view, manage, and analyze your generated reports
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Report Library</h3>
              <p className="text-gray-600 text-xs">Access and organize all your generated reports in one place</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Download & Share</h3>
              <p className="text-gray-600 text-xs">Download reports in multiple formats and share with stakeholders</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Status Tracking</h3>
              <p className="text-gray-600 text-xs">Monitor report generation status and completion progress</p>
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
        .yourreports-welcome-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          inset: 0 !important;
          z-index: 99999 !important;
          background-color: rgba(0, 0, 0, 0.5) !important;
          pointer-events: all !important;
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
};

const YourReportsTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const steps: TourProps['steps'] = [
    {
      title: 'Search & Sort Controls',
      description: 'Use the search bar to find specific reports by title or topic. Sort your reports by date, title, or status to organize your report library efficiently.',
      target: () => document.querySelector('[data-tour="search-sort-controls"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Schedule & Visualize Tags',
      description: 'Look for special tags on your reports. "Scheduled" indicates automated recurring reports, while "Visualize" shows reports with charts and graphs. These tags help you quickly identify report types.',
      target: () => document.querySelector('[data-tour="report-tags"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Cancel Scheduled Reports',
      description: 'For scheduled reports, use the cancel button to stop automatic generation. This prevents future reports from being created while preserving existing ones.',
      target: () => document.querySelector('[data-tour="cancel-scheduled"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Open Report Actions',
      description: 'Click on any report to open it for viewing. Once opened, you can edit content directly, export to PDF/Word documents with preserved formatting, and access version control to see previous iterations, compare versions, and restore content.',
      target: () => document.querySelector('[data-tour="report-actions"]') as HTMLElement,
      placement: 'left',
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
        zIndex={2000}
        rootClassName={`classic-your-reports-tour ${isVisible ? 'tour-fade-in' : ''}`}
        mask={{
          color: 'rgba(0, 0, 0, 0.5)',
          style: {
            position: 'fixed',
            inset: 0,
          }
        }}
        onFinish={onClose}
        scrollIntoViewOptions={{
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        }}
        onChange={(current) => {
          // Custom scrolling logic to keep cards center-aligned
          setTimeout(() => {
            const targetProp = steps[current]?.target as unknown;
            let targetElement: HTMLElement | null = null;
            if (typeof targetProp === 'function') {
              try {
                targetElement = (targetProp as () => HTMLElement)();
              } catch {
                targetElement = null;
              }
            } else {
              targetElement = (targetProp as HTMLElement) ?? null;
            }

            if (targetElement) {
              const rect = targetElement.getBoundingClientRect();
              const viewportHeight = window.innerHeight;

              // If element is in bottom 20% of screen, scroll up more
              if (rect.top > viewportHeight * 0.8) {
                window.scrollBy({
                  top: -viewportHeight * 0.3,
                  behavior: 'smooth'
                });
              }
              // If element is in top 20% of screen, scroll down a bit
              else if (rect.top < viewportHeight * 0.2) {
                window.scrollBy({
                  top: viewportHeight * 0.2,
                  behavior: 'smooth'
                });
              }
            }
          }, 100);
        }}
        closeIcon={true}
      />
      <style jsx global>{`
        .classic-your-reports-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }
        
        .classic-your-reports-tour .ant-tour {
          max-width: 260px;
          min-width: 240px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          margin-left: 80px;
        }
        
        .classic-your-reports-tour .ant-tour-inner {
          font-size: 14px;
          padding: 16px;
          background: white !important;
          border-radius: 12px;
        }
        
        .classic-your-reports-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }
        
        .classic-your-reports-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .classic-your-reports-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-your-reports-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 36px;
          padding: 0 16px;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        
        .classic-your-reports-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        
        .classic-your-reports-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }
        
        .classic-your-reports-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }
        
        .classic-your-reports-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }
        
        .classic-your-reports-tour .ant-tour-close {
          color: #6b7280 !important;
          font-size: 14px !important;
          width: 20px !important;
          height: 20px !important;
          border-radius: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          position: absolute !important;
          top: 12px !important;
          right: 12px !important;
          z-index: 10 !important;
        }
        
        .classic-your-reports-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-your-reports-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-your-reports-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-your-reports-tour .ant-tour-mask {
          position: fixed !important;
          inset: 0 !important;
          z-index: 2000 !important;
          background-color: rgba(0, 0, 0, 0.5) !important;
        }

        /* Ensure tour content is above the mask and sidebar */
        .classic-your-reports-tour .ant-tour {
          z-index: 2010 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-your-reports-tour [data-tour] {
          position: relative;
          z-index: 2020 !important;
        }

        /* Tour fade-in animation */
        .classic-your-reports-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-your-reports-tour.tour-fade-in .ant-tour-mask {
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

export function YourReportsTourLauncher() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
  const [isWelcomeClosing, setIsWelcomeClosing] = useState(false);
  const [tutorialsEnabled, setTutorialsEnabledState] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    setTutorialsEnabledState(areTutorialsEnabledSync());
    const cleanup = onTutorialSettingChange((enabled) => {
      setTutorialsEnabledState(enabled);
      if (!enabled && isTourOpen) {
        setIsTourOpen(false);
      }
    });
    return cleanup;
  }, [isTourOpen]);

  const startTour = () => {
    setIsWelcomeClosing(true);
    setTimeout(() => {
      setShowWelcomePrompt(false);
      setIsWelcomeClosing(false);
      setTimeout(() => {
        setIsTourOpen(true);
      }, 100);
    }, 500);
  };

  const dismissWelcome = () => {
    setIsWelcomeClosing(true);
    setTimeout(() => {
      setShowWelcomePrompt(false);
      setIsWelcomeClosing(false);
    }, 500);
  };

  const manualStartTour = () => {
    setShowWelcomePrompt(true);
  };

  const closeTour = () => {
    setIsTourOpen(false);
  };

  // Only show on your reports page
  if (!isMounted || !pathname?.includes('/dashboard/your-reports') || !tutorialsEnabled) return null;

  return (
    <>
      {showWelcomePrompt && (
        <YourReportsWelcomeScreen
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
        <YourReportsTour open={true} onClose={closeTour} />
      )}
    </>
  );
}
