'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabled, onTutorialSettingChange } from '@/utils/tutorialSettings';

const EvaluationMetricsTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      title: 'Performance Metrics Dashboard',
      description: 'Welcome to the Evaluation Metrics dashboard! This is where you can analyze employee performance based on feedback data, ratings, and peer evaluations.',
      target: () => document.querySelector('[data-tour="metrics-dashboard"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Search for Employees',
      description: 'Start by searching for specific employees by name or email. This will show their detailed performance metrics, feedback history, and evaluation data.',
      target: () => document.querySelector('[data-tour="employee-search"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Sort and Filter Options',
      description: 'Use these controls to sort employees by highest or lowest ratings, and filter the results to find specific performance insights.',
      target: () => document.querySelector('[data-tour="sort-filter"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Employee Rankings',
      description: 'Once you have feedback data, this area will display ranked lists of employees based on their performance ratings and evaluation scores.',
      target: () => document.querySelector('[data-tour="employee-rankings"]') as HTMLElement,
      placement: 'left',
    },
  ];

  if (!mounted) return null;

  return (
    <>
      <Tour
        open={open}
        onClose={onClose}
        steps={steps}
        type="primary"
        arrow={true}
        rootClassName="classic-evaluation-metrics-tour"
        mask={{
          color: 'rgba(0, 0, 0, 0.3)',
        }}
        onFinish={onClose}
        scrollIntoViewOptions={{
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        }}
        onStepChange={(current) => {
          setTimeout(() => {
            const targetElement = document.querySelector(`[data-tour="${steps[current]?.target?.()?.getAttribute('data-tour')}"]`);
            if (targetElement) {
              const rect = targetElement.getBoundingClientRect();
              const viewportHeight = window.innerHeight;

              if (rect.top > viewportHeight * 0.8) {
                window.scrollBy({
                  top: -viewportHeight * 0.3,
                  behavior: 'smooth'
                });
              }
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
        .classic-evaluation-metrics-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }

        .classic-evaluation-metrics-tour .ant-tour {
          max-width: 260px;
          min-width: 240px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          margin-left: 80px;
        }

        .classic-evaluation-metrics-tour .ant-tour-inner {
          font-size: 14px;
          padding: 16px;
          background: white !important;
          border-radius: 12px;
        }

        .classic-evaluation-metrics-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }

        .classic-evaluation-metrics-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .classic-evaluation-metrics-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }

        .classic-evaluation-metrics-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 36px;
          padding: 0 16px;
          transition: all 0.2s ease;
          font-size: 13px;
        }

        .classic-evaluation-metrics-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }

        .classic-evaluation-metrics-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }

        .classic-evaluation-metrics-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }

        .classic-evaluation-metrics-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }

        .classic-evaluation-metrics-tour .ant-tour-close {
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

        .classic-evaluation-metrics-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-evaluation-metrics-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-evaluation-metrics-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .classic-evaluation-metrics-tour.ant-tour-open body > *:not(.ant-tour):not(.ant-tour-mask) {
          filter: blur(3px);
          transition: filter 0.3s ease;
        }

        .classic-evaluation-metrics-tour [data-tour] {
          filter: none !important;
          position: relative;
          z-index: 1000;
        }

        .classic-evaluation-metrics-tour.ant-tour-open [data-tour]:not([data-tour-active]) {
          filter: blur(3px);
        }

        .classic-evaluation-metrics-tour.ant-tour-open [data-tour-active] {
          filter: none !important;
          z-index: 1001 !important;
        }
      `}</style>
    </>
  );
};

export function EvaluationMetricsTourLauncher() {
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

    const hasTakenTour = localStorage.getItem('hasTakenEvaluationMetricsTour');

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
    localStorage.setItem('hasTakenEvaluationMetricsTour', 'true');
  };

  const dismissWelcome = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem('hasTakenEvaluationMetricsTour', 'true');
  };

  // Only show on evaluation metrics page
  if (!isMounted || !pathname?.includes('/dashboard/evaluation-metrics') || !tutorialsEnabled) return null;

  return (
    <>
      {/* Welcome Prompt */}
      {showWelcomePrompt && (
        <EvaluationMetricsTour open={true} onClose={dismissWelcome} />
      )}

      {/* Tour Button */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={startTour}
          className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {isTourOpen && (
        <EvaluationMetricsTour open={true} onClose={() => setIsTourOpen(false)} />
      )}
    </>
  );
}
