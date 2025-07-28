'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const CreateGoalTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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

  // Wait for elements to be available
  useEffect(() => {
    if (isVisible) {
      const checkElements = () => {
        const elements = [
          '[data-tour="basic-goal-fields"]',
          '[data-tour="employee-assignment"]',
          '[data-tour="kpi-section"]',
          '[data-tour="project-linking"]'
        ];
        
        return elements.some(selector => document.querySelector(selector));
      };

      if (!checkElements()) {
        const timer = setTimeout(checkElements, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible]);

  const steps: TourProps['steps'] = [
    {
      title: 'Basic Information',
      description: 'Start by entering the essential goal information including title, description, department, priority level, and timeline. These fields form the foundation of your organizational objective.',
      target: () => document.querySelector('[data-tour="basic-goal-fields"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Key Performance Indicators',
      description: 'Define measurable KPIs to track goal progress. Set target values, current values, and units of measurement. KPIs help quantify success and provide clear metrics for goal achievement.',
      target: () => document.querySelector('[data-tour="kpi-section"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Projects',
      description: 'Connect related projects to this goal to establish clear relationships between strategic objectives and tactical execution. This helps maintain alignment between high-level goals and day-to-day project work.',
      target: () => document.querySelector('[data-tour="project-linking"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Employees',
      description: 'Assign team members who will be responsible for achieving this goal. Search for employees by name or email, or add external collaborators manually. You can specify roles and responsibilities for each team member.',
      target: () => document.querySelector('[data-tour="employee-assignment"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Viewers',
      description: 'Add viewers who can see this goal but are not directly responsible for its completion. This helps with transparency and keeps stakeholders informed about goal progress.',
      target: () => document.querySelector('[data-tour="viewer-assignment"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Visibility Settings',
      description: 'Control who can see this goal within your organization. You can make it visible to all company members or restrict it to assigned employees, viewers, and management only.',
      target: () => document.querySelector('[data-tour="visibility-settings"]') as HTMLElement,
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
        rootClassName={`classic-create-goal-tour ${isVisible ? 'tour-fade-in' : ''}`}
        mask={{
          color: 'rgba(0, 0, 0, 0.3)',
        }}
        onFinish={onClose}
        scrollIntoViewOptions={{
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        }}
        closeIcon={true}
      />
      <style jsx global>{`
        .classic-create-goal-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }

        .classic-create-goal-tour .ant-tour {
          max-width: 220px !important;
          min-width: 200px !important;
          border-radius: 12px !important;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e5e7eb !important;
          background: white !important;
          overflow: hidden !important;
        }

        .classic-create-goal-tour .ant-tour-inner {
          font-size: 14px !important;
          padding: 12px !important;
          background: white !important;
          border-radius: 12px !important;
        }

        .classic-create-goal-tour .ant-tour-title {
          font-size: 16px !important;
          font-weight: 700 !important;
          margin-bottom: 6px !important;
          color: #1f2937 !important;
          line-height: 1.3 !important;
        }

        .classic-create-goal-tour .ant-tour-description {
          color: #4b5563 !important;
          line-height: 1.4 !important;
          margin-bottom: 12px !important;
          font-size: 13px !important;
        }

        .classic-create-goal-tour .ant-tour-buttons {
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          margin-top: 12px !important;
          gap: 8px !important;
        }

        .classic-create-goal-tour .ant-btn {
          border-radius: 6px !important;
          font-weight: 500 !important;
          font-size: 12px !important;
          height: 28px !important;
          padding: 0 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          border: 1px solid !important;
        }

        .classic-create-goal-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
        }

        .classic-create-goal-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
        }

        .classic-create-goal-tour .ant-btn-default {
          background: white !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
        }

        .classic-create-goal-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }

        /* REMOVE INDICATORS COMPLETELY */
        .classic-create-goal-tour .ant-tour-indicators {
          display: none !important;
        }

        .classic-create-goal-tour .ant-tour-close {
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

        .classic-create-goal-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-create-goal-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-create-goal-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-create-goal-tour .ant-tour-mask {
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
        .classic-create-goal-tour .ant-tour {
          z-index: 1060 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-create-goal-tour [data-tour] {
          position: relative;
          z-index: 1070 !important;
        }

        /* Ensure the mask covers the sidebar specifically */
        .classic-create-goal-tour.ant-tour-open ~ * .sidebar,
        .classic-create-goal-tour.ant-tour-open ~ * [class*="sidebar"],
        .classic-create-goal-tour.ant-tour-open ~ * nav {
          z-index: 1040 !important;
        }

        /* Additional mask overlay to ensure complete coverage */
        .classic-create-goal-tour.ant-tour-open::before {
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
        .classic-create-goal-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-create-goal-tour.tour-fade-in .ant-tour-mask {
          animation: maskFadeIn 0.5s ease-out forwards;
        }

        @keyframes tourFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
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

export default CreateGoalTour;
