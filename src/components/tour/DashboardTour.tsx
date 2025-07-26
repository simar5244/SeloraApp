'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const DashboardTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [mounted, setMounted] = useState(false);

  // Wait for DOM to be ready
  useEffect(() => {
    setMounted(true);
  }, []);

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
        open={open}
        onClose={onClose}
        steps={steps}
        type="primary"
        arrow={true}
        rootClassName="classic-dashboard-tour"
        mask={{
          color: 'rgba(0, 0, 0, 0.3)',
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
          max-width: 260px;
          min-width: 240px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
        }

        .classic-dashboard-tour .ant-tour-inner {
          font-size: 14px;
          padding: 16px;
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
          height: 36px;
          padding: 0 16px;
          transition: all 0.2s ease;
          font-size: 13px;
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

        /* Blur everything in the background */
        .classic-dashboard-tour.ant-tour-open body > *:not(.ant-tour):not(.ant-tour-mask) {
          filter: blur(3px);
          transition: filter 0.3s ease;
        }

        /* Keep the focused element completely sharp */
        .classic-dashboard-tour [data-tour] {
          filter: none !important;
          position: relative;
          z-index: 1000;
        }

        /* When tour is active, blur all main content except focused element */
        .classic-dashboard-tour.ant-tour-open [data-tour]:not([data-tour-active]) {
          filter: blur(3px);
        }

        .classic-dashboard-tour.ant-tour-open [data-tour-active] {
          filter: none !important;
          z-index: 1001 !important;
        }
      `}</style>
    </>
  );
};

export default DashboardTour;
