'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const DashboardTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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

  // Handle background click to close
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
      title: 'Dashboard Overview',
      description: 'Welcome to your organizational command center. This dashboard provides a comprehensive view of your company\'s key metrics, employee insights, and operational data. From here, you can monitor performance, identify trends, and make informed decisions about your workforce and projects.',
      target: () => document.querySelector('[data-tour="welcome-section"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Key Performance Metrics',
      description: 'These summary cards display your organization\'s vital statistics. The total employee count reflects your current workforce size, while active projects shows ongoing initiatives. These metrics are updated in real-time and serve as quick indicators of your organizational scale and activity level.',
      target: () => document.querySelector('[data-tour="stats-overview"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Workforce Analytics',
      description: 'This comprehensive section analyzes your employee utilization patterns and performance metrics. You can identify overworked employees (those exceeding 50 hours per week), underutilized staff (working less than 30 hours), performance ratings, and employees at risk of leaving. Each employee entry is clickable for detailed profiles and actionable insights.',
      target: () => document.querySelector('[data-tour="organization-insights"]') as HTMLElement,
      placement: 'right',
    },
    {
      title: 'Project Management Hub',
      description: 'Monitor your most critical and resource-intensive projects from this centralized view. High-priority projects require immediate attention, while high-budget projects need careful resource management. Click on any project to access detailed timelines, team assignments, and progress tracking.',
      target: () => document.querySelector('[data-tour="project-insights"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Reporting Center',
      description: 'Access your organization\'s reporting infrastructure here. View recently generated reports for immediate insights, and manage your scheduled automated reports for regular stakeholder updates. This system ensures consistent communication and data-driven decision making across your organization.',
      target: () => document.querySelector('[data-tour="report-insights"]') as HTMLElement,
      placement: 'right',
    },
    {
      title: 'AI-Enhanced Tools',
      description: 'Explore our suite of artificial intelligence-powered features designed to optimize your organizational management. These tools include 3D organizational visualization, intelligent succession planning, AI-driven project allocation, smart employee search, and automated report generation. Each feature leverages machine learning to provide actionable insights.',
      target: () => document.querySelector('[data-tour="ai-features"]') as HTMLElement,
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
        rootClassName={`classic-dashboard-tour ${isVisible ? 'tour-fade-in' : ''}`}
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
        }}
        closeIcon={true}
      />
      <style jsx global>{`
        .classic-dashboard-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }

        .classic-dashboard-tour .ant-tour {
          max-width: 220px;
          min-width: 200px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
        }

        .classic-dashboard-tour .ant-tour-inner {
          font-size: 14px;
          padding: 12px;
          background: white !important;
          border-radius: 12px;
        }

        .classic-dashboard-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }

        .classic-dashboard-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .classic-dashboard-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }

        .classic-dashboard-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 32px;
          padding: 0 12px;
          transition: all 0.2s ease;
          font-size: 12px;
        }

        .classic-dashboard-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .classic-dashboard-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }

        .classic-dashboard-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }

        .classic-dashboard-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }

        .classic-dashboard-tour .ant-tour-close {
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

        .classic-dashboard-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-dashboard-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-dashboard-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-dashboard-tour .ant-tour-mask {
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
        .classic-dashboard-tour .ant-tour {
          z-index: 1060 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-dashboard-tour [data-tour] {
          position: relative;
          z-index: 1070 !important;
        }

        /* Ensure the mask covers the sidebar specifically */
        .classic-dashboard-tour.ant-tour-open ~ * .sidebar,
        .classic-dashboard-tour.ant-tour-open ~ * [class*="sidebar"],
        .classic-dashboard-tour.ant-tour-open ~ * nav {
          z-index: 1040 !important;
        }

        /* Additional mask overlay to ensure complete coverage */
        .classic-dashboard-tour.ant-tour-open::before {
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
        .classic-dashboard-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-dashboard-tour.tour-fade-in .ant-tour-mask {
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

export default DashboardTour;
