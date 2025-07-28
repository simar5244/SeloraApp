'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const DepartmentManagementTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
          '[data-tour="search-employees"]',
          '[data-tour="filter-controls"]',
          '[data-tour="employee-table"]',
          '[data-tour="employee-actions"]'
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
      title: 'Search Employees',
      description: 'Use this search bar to quickly find specific employees in your department by name, email, or other details. This helps you locate team members efficiently.',
      target: () => document.querySelector('[data-tour="search-employees"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Filter Controls',
      description: 'Filter employees by status (approved/pending), feedback ratings, and role types. These filters help you focus on specific groups of employees that need attention.',
      target: () => document.querySelector('[data-tour="filter-controls"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Employee Table',
      description: 'This table displays all employees in your department with their key information including role, feedback status, and approval status. Each row provides a comprehensive overview.',
      target: () => document.querySelector('[data-tour="employee-table"]') as HTMLElement,
      placement: 'top',
    },
    {
      title: 'Employee Actions',
      description: 'Use these action buttons to view detailed employee profiles, edit job information, or manage employee data. Click the eye icon to view details or the edit icon to modify profiles.',
      target: () => document.querySelector('[data-tour="employee-actions"]') as HTMLElement,
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
        rootClassName={`classic-department-tour ${isVisible ? 'tour-fade-in' : ''}`}
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
        .classic-department-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }

        .classic-department-tour .ant-tour {
          max-width: 220px !important;
          min-width: 200px !important;
          border-radius: 12px !important;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e5e7eb !important;
          background: white !important;
          overflow: hidden !important;
        }

        .classic-department-tour .ant-tour-inner {
          font-size: 14px !important;
          padding: 12px !important;
          background: white !important;
          border-radius: 12px !important;
        }

        .classic-department-tour .ant-tour-title {
          font-size: 16px !important;
          font-weight: 700 !important;
          margin-bottom: 6px !important;
          color: #1f2937 !important;
          line-height: 1.3 !important;
        }

        .classic-department-tour .ant-tour-description {
          color: #4b5563 !important;
          line-height: 1.4 !important;
          margin-bottom: 12px !important;
          font-size: 13px !important;
        }

        .classic-department-tour .ant-tour-buttons {
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          margin-top: 12px !important;
          gap: 8px !important;
        }

        .classic-department-tour .ant-btn {
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

        .classic-department-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
        }

        .classic-department-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
        }

        .classic-department-tour .ant-btn-default {
          background: white !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
        }

        .classic-department-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }

        /* REMOVE INDICATORS COMPLETELY */
        .classic-department-tour .ant-tour-indicators {
          display: none !important;
        }

        .classic-department-tour .ant-tour-close {
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

        .classic-department-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-department-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-department-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-department-tour .ant-tour-mask {
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
        .classic-department-tour .ant-tour {
          z-index: 1060 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-department-tour [data-tour] {
          position: relative;
          z-index: 1070 !important;
        }

        /* Ensure the mask covers the sidebar specifically */
        .classic-department-tour.ant-tour-open ~ * .sidebar,
        .classic-department-tour.ant-tour-open ~ * [class*="sidebar"],
        .classic-department-tour.ant-tour-open ~ * nav {
          z-index: 1040 !important;
        }

        /* Additional mask overlay to ensure complete coverage */
        .classic-department-tour.ant-tour-open::before {
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
        .classic-department-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-department-tour.tour-fade-in .ant-tour-mask {
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

export default DepartmentManagementTour;
