'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabled, onTutorialSettingChange } from '@/utils/tutorialSettings';

const UserManagementTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
      title: 'User Management Overview',
      description: 'Manage all user accounts, roles, and permissions from this central hub. Add new users, modify existing accounts, and control access levels across your organization.',
      target: () => document.querySelector('[data-tour="user-management-header"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Manage Users',
      description: 'View and manage all existing users in your organization. Search, filter, edit user details, assign roles, and control user permissions from this tab.',
      target: () => document.querySelector('[data-tour="manage-users-tab"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Manage Signups',
      description: 'Review and approve new user registration requests. When users sign up for your organization, their requests appear here for admin approval before they can access the system.',
      target: () => document.querySelector('[data-tour="manage-signups-tab"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'User List & Search',
      description: 'Browse all users in your organization with search and filter capabilities. View user status, roles, last login times, and quickly locate specific team members.',
      target: () => document.querySelector('[data-tour="user-list"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Role Management',
      description: 'Assign and modify user roles including Admin, Manager, Employee, and custom roles. Each role has specific permissions for accessing features and data.',
      target: () => document.querySelector('[data-tour="role-management"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'User Actions',
      description: 'Perform actions on user accounts including editing profiles, resetting passwords, deactivating accounts, and managing individual permissions.',
      target: () => document.querySelector('[data-tour="user-actions"]') as HTMLElement,
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
        rootClassName="classic-user-management-tour"
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
        .classic-user-management-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }
        
        .classic-user-management-tour .ant-tour {
          max-width: 260px;
          min-width: 240px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          margin-left: 80px;
        }
        
        .classic-user-management-tour .ant-tour-inner {
          font-size: 14px;
          padding: 16px;
          background: white !important;
          border-radius: 12px;
        }
        
        .classic-user-management-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }
        
        .classic-user-management-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .classic-user-management-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-user-management-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 36px;
          padding: 0 16px;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        
        .classic-user-management-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        
        .classic-user-management-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }
        
        .classic-user-management-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }
        
        .classic-user-management-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }
        
        .classic-user-management-tour .ant-tour-close {
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
        
        .classic-user-management-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-user-management-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-user-management-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .classic-user-management-tour.ant-tour-open body > *:not(.ant-tour):not(.ant-tour-mask) {
          filter: blur(3px);
          transition: filter 0.3s ease;
        }

        .classic-user-management-tour [data-tour] {
          filter: none !important;
          position: relative;
          z-index: 1000;
        }

        .classic-user-management-tour.ant-tour-open [data-tour]:not([data-tour-active]) {
          filter: blur(3px);
        }

        .classic-user-management-tour.ant-tour-open [data-tour-active] {
          filter: none !important;
          z-index: 1001 !important;
        }
      `}</style>
    </>
  );
};

export function UserManagementTourLauncher() {
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

    const hasTakenTour = localStorage.getItem('hasTakenUserManagementTour');

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
    localStorage.setItem('hasTakenUserManagementTour', 'true');
  };

  const dismissWelcome = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem('hasTakenUserManagementTour', 'true');
  };

  if (!isMounted || !pathname?.includes('/dashboard/user-management') || !tutorialsEnabled) return null;

  return (
    <>
      {showWelcomePrompt && (
        <UserManagementTour open={true} onClose={dismissWelcome} />
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
        <UserManagementTour open={true} onClose={() => setIsTourOpen(false)} />
      )}
    </>
  );
}
