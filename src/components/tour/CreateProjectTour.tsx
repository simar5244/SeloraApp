'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const CreateProjectTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Wait for DOM to be ready
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

  // Handle background click and escape key to close
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
      title: 'Basic Project Fields',
      description: 'Start by entering the essential project information including project name, department, description, budget, and timeline. These fields form the foundation of your project setup.',
      target: () => document.querySelector('[data-tour="basic-fields"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Linked Projects',
      description: 'Connect related projects to establish dependencies and track cross-project relationships. This helps maintain visibility into how projects influence each other.',
      target: () => document.querySelector('[data-tour="linked-projects"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Permission Controls',
      description: 'Configure project visibility settings to control who can view and access this project within your organization.',
      target: () => document.querySelector('[data-tour="permission-controls"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Team Members',
      description: 'Add team members who will actively work on this project. Define their roles, tasks, hours, and tools they will use.',
      target: () => document.querySelector('[data-tour="members-section"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Project Viewers',
      description: 'Add viewers who need to monitor project progress but are not actively working on it. These are typically stakeholders or managers.',
      target: () => document.querySelector('[data-tour="viewers-section"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'AI Recommendations',
      description: 'Get intelligent suggestions for team composition and project setup based on historical data and organizational patterns.',
      target: () => document.querySelector('[data-tour="ai-recommendations"]') as HTMLElement,
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
        rootClassName={`classic-create-project-tour ${isVisible ? 'tour-fade-in' : ''}`}
        mask={{
          color: 'rgba(0, 0, 0, 0.3)',
        }}
        onFinish={onClose}
        scrollIntoViewOptions={{
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        }}
        onStepChange={(current) => {
          // Custom scrolling logic to keep cards center-aligned
          setTimeout(() => {
            const targetElement = document.querySelector(`[data-tour="${steps[current]?.target?.()?.getAttribute('data-tour')}"]`);
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
        .classic-create-project-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }
        
        .classic-create-project-tour .ant-tour {
          max-width: 220px;
          min-width: 200px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
        }

        .classic-create-project-tour .ant-tour-inner {
          font-size: 14px;
          padding: 12px;
          background: white !important;
          border-radius: 12px;
        }
        
        .classic-create-project-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }
        
        .classic-create-project-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .classic-create-project-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-create-project-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 32px;
          padding: 0 12px;
          transition: all 0.2s ease;
          font-size: 12px;
        }
        
        .classic-create-project-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        
        .classic-create-project-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }
        
        .classic-create-project-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }
        
        .classic-create-project-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }
        
        .classic-create-project-tour .ant-tour-close {
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
        
        .classic-create-project-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-create-project-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-create-project-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-create-project-tour .ant-tour-mask {
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
        .classic-create-project-tour .ant-tour {
          z-index: 1060 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-create-project-tour [data-tour] {
          position: relative;
          z-index: 1070 !important;
        }

        /* Ensure the mask covers the sidebar specifically */
        .classic-create-project-tour.ant-tour-open ~ * .sidebar,
        .classic-create-project-tour.ant-tour-open ~ * [class*="sidebar"],
        .classic-create-project-tour.ant-tour-open ~ * nav {
          z-index: 1040 !important;
        }

        /* Additional mask overlay to ensure complete coverage */
        .classic-create-project-tour.ant-tour-open::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1049;
          pointer-events: none;
        }

        /* Tour fade-in animation */
        .classic-create-project-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-create-project-tour.tour-fade-in .ant-tour-mask {
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

export default CreateProjectTour;
