'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabled, onTutorialSettingChange } from '@/utils/tutorialSettings';

const SuccessionPlanningTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
      title: 'Succession Planning Overview',
      description: 'Welcome to the Succession Planning dashboard! This AI-powered tool helps you identify employees at risk of leaving and find their potential successors.',
      target: () => document.querySelector('[data-tour="succession-overview"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Search for Employees',
      description: 'Start by searching for specific employees by name, title, or department. This will show their attrition risk and help you find potential successors.',
      target: () => document.querySelector('[data-tour="employee-search"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'At-Risk Employees',
      description: 'View employees who are at high risk of leaving your organization. The AI analyzes various factors to predict attrition risk.',
      target: () => document.querySelector('[data-tour="at-risk-employees"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Refresh Data',
      description: 'Use this button to refresh the attrition analysis and get the latest risk assessments for your employees.',
      target: () => document.querySelector('[data-tour="refresh-data"]') as HTMLElement,
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
        rootClassName="classic-succession-planning-tour"
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
        .classic-succession-planning-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }
        
        .classic-succession-planning-tour .ant-tour {
          max-width: 260px;
          min-width: 240px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          margin-left: 80px;
        }
        
        .classic-succession-planning-tour .ant-tour-inner {
          font-size: 14px;
          padding: 16px;
          background: white !important;
          border-radius: 12px;
        }
        
        .classic-succession-planning-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }
        
        .classic-succession-planning-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .classic-succession-planning-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-succession-planning-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 36px;
          padding: 0 16px;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        
        .classic-succession-planning-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        
        .classic-succession-planning-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }
        
        .classic-succession-planning-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }
        
        .classic-succession-planning-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }
        
        .classic-succession-planning-tour .ant-tour-close {
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
        
        .classic-succession-planning-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-succession-planning-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-succession-planning-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .classic-succession-planning-tour.ant-tour-open body > *:not(.ant-tour):not(.ant-tour-mask) {
          filter: blur(3px);
          transition: filter 0.3s ease;
        }

        .classic-succession-planning-tour [data-tour] {
          filter: none !important;
          position: relative;
          z-index: 1000;
        }

        .classic-succession-planning-tour.ant-tour-open [data-tour]:not([data-tour-active]) {
          filter: blur(3px);
        }

        .classic-succession-planning-tour.ant-tour-open [data-tour-active] {
          filter: none !important;
          z-index: 1001 !important;
        }
      `}</style>
    </>
  );
};

export function SuccessionPlanningTourLauncher() {
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

    const hasTakenTour = localStorage.getItem('hasTakenSuccessionPlanningTour');

    if (!hasTakenTour) {
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
    localStorage.setItem('hasTakenSuccessionPlanningTour', 'true');
  };

  const dismissWelcome = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem('hasTakenSuccessionPlanningTour', 'true');
  };

  if (!isMounted || !pathname?.includes('/dashboard/succession-planning') || !tutorialsEnabled) return null;

  return (
    <>
      {showWelcomePrompt && (
        <SuccessionPlanningTour open={true} onClose={dismissWelcome} />
      )}

      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={startTour}
          className="group relative h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          style={{
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
          }}
        >
          <HelpCircle className="h-5 w-5 transition-transform duration-200 group-hover:rotate-12" />
          
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Take Tutorial
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </Button>
      </div>

      {isTourOpen && (
        <SuccessionPlanningTour open={true} onClose={() => setIsTourOpen(false)} />
      )}
    </>
  );
}
