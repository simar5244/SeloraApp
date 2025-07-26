'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabled, onTutorialSettingChange } from '@/utils/tutorialSettings';

const ProfileTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
      title: 'Profile Header',
      description: 'Your profile header displays your name, job title, and department. This information is visible to other users in your organization.',
      target: () => document.querySelector('[data-tour="profile-information"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Basic Info Tab',
      description: 'The Basic Info tab contains your personal information, contact details, and profile settings. You can edit your name, email, and other basic details here.',
      target: () => document.querySelector('[data-tour="basic-info-tab"]') as HTMLElement,
      placement: 'left',
      beforeShowPromise: () => {
        // Switch to basic-info tab
        const basicInfoTab = document.querySelector('[value="basic-info"]') as HTMLElement;
        if (basicInfoTab) {
          basicInfoTab.click();
        }
        return Promise.resolve();
      },
    },
    {
      title: 'Job Profile Tab',
      description: 'The Job Profile tab contains your professional information including skills, experience, and job-related details.',
      target: () => document.querySelector('[data-tour="job-profile-tab"]') as HTMLElement,
      placement: 'left',
      beforeShowPromise: () => {
        // Switch to job-profile tab
        const jobProfileTab = document.querySelector('[value="job-profile"]') as HTMLElement;
        if (jobProfileTab) {
          jobProfileTab.click();
        }
        return Promise.resolve();
      },
    },
    {
      title: 'Security Tab',
      description: 'The Security tab allows you to manage your password, two-factor authentication, and other security settings for your account.',
      target: () => document.querySelector('[data-tour="security-tab"]') as HTMLElement,
      placement: 'left',
      beforeShowPromise: () => {
        // Switch to security tab
        const securityTab = document.querySelector('[value="security"]') as HTMLElement;
        if (securityTab) {
          securityTab.click();
        }
        return Promise.resolve();
      },
    },
    {
      title: 'Settings Tab',
      description: 'The Settings tab contains application preferences including the ability to enable or disable tutorials across all pages.',
      target: () => document.querySelector('[data-tour="settings-tab"]') as HTMLElement,
      placement: 'left',
      beforeShowPromise: () => {
        // Switch to settings tab
        const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
        if (settingsTab) {
          settingsTab.click();
        }
        return Promise.resolve();
      },
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
        rootClassName="classic-profile-tour"
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
        .classic-profile-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }
        
        .classic-profile-tour .ant-tour {
          max-width: 260px;
          min-width: 240px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          margin-left: 80px;
        }
        
        .classic-profile-tour .ant-tour-inner {
          font-size: 14px;
          padding: 16px;
          background: white !important;
          border-radius: 12px;
        }
        
        .classic-profile-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }
        
        .classic-profile-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .classic-profile-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-profile-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 36px;
          padding: 0 16px;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        
        .classic-profile-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        
        .classic-profile-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }
        
        .classic-profile-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }
        
        .classic-profile-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }
        
        .classic-profile-tour .ant-tour-close {
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
        
        .classic-profile-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-profile-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-profile-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .classic-profile-tour.ant-tour-open body > *:not(.ant-tour):not(.ant-tour-mask) {
          filter: blur(3px);
          transition: filter 0.3s ease;
        }

        .classic-profile-tour [data-tour] {
          filter: none !important;
          position: relative;
          z-index: 1000;
        }

        .classic-profile-tour.ant-tour-open [data-tour]:not([data-tour-active]) {
          filter: blur(3px);
        }

        .classic-profile-tour.ant-tour-open [data-tour-active] {
          filter: none !important;
          z-index: 1001 !important;
        }
      `}</style>
    </>
  );
};

export function ProfileTourLauncher() {
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

    const hasTakenTour = localStorage.getItem('hasTakenProfileTour');

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
    localStorage.setItem('hasTakenProfileTour', 'true');
  };

  const dismissWelcome = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem('hasTakenProfileTour', 'true');
  };

  if (!isMounted || !pathname?.includes('/dashboard/profile') || !tutorialsEnabled) return null;

  return (
    <>
      {showWelcomePrompt && (
        <ProfileTour open={true} onClose={dismissWelcome} />
      )}

      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={startTour}
          className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {isTourOpen && (
        <ProfileTour open={true} onClose={() => setIsTourOpen(false)} />
      )}
    </>
  );
}
