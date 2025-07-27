'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const IntegrationTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
      title: 'Connect ERP Systems',
      description: 'Use this button to connect new ERP systems like SAP, Oracle, Microsoft Dynamics, QuickBooks, and other enterprise platforms. Configure data synchronization, authentication, and integration settings for seamless data flow.',
      target: () => document.querySelector('[data-tour="connect-erp-button"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Upload History',
      description: 'Track all your data uploads and integration activities. View upload status, timestamps, data sources, and troubleshoot any synchronization issues with your connected systems.',
      target: () => document.querySelector('[data-tour="upload-history-tab"]') as HTMLElement,
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
        rootClassName={`classic-integration-tour ${isVisible ? 'tour-fade-in' : ''}`}
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
          inline: 'nearest',
        }}
        closeIcon={true}
      />
      <style jsx global>{`
        .classic-integration-tour {
          --ant-primary-1: #f3e8ff;
          --ant-primary-color: #8b5cf6;
          --ant-primary-color-hover: #7c3aed;
          --ant-primary-6: #8b5cf6;
          --ant-primary-7: #7c3aed;
        }
        
        .classic-integration-tour .ant-tour {
          max-width: 220px;
          min-width: 200px;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          margin-left: 80px;
        }

        .classic-integration-tour .ant-tour-inner {
          font-size: 14px;
          padding: 12px;
          background: white !important;
          border-radius: 12px;
        }
        
        .classic-integration-tour .ant-tour-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1f2937;
          line-height: 1.3;
        }
        
        .classic-integration-tour .ant-tour-description {
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .classic-integration-tour .ant-tour-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          gap: 10px;
        }
        
        .classic-integration-tour .ant-btn {
          border-radius: 6px;
          font-weight: 600;
          height: 32px;
          padding: 0 12px;
          transition: all 0.2s ease;
          font-size: 12px;
        }
        
        .classic-integration-tour .ant-btn-primary {
          background: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          color: white !important;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        
        .classic-integration-tour .ant-btn-primary:hover {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
        }
        
        .classic-integration-tour .ant-btn-default {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #6b7280 !important;
        }
        
        .classic-integration-tour .ant-btn-default:hover {
          border-color: #8b5cf6 !important;
          color: #8b5cf6 !important;
          background: #f9fafb !important;
        }
        
        .classic-integration-tour .ant-tour-close {
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
        
        .classic-integration-tour .ant-tour-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
        }

        .classic-integration-tour .ant-tour-arrow {
          border-color: white;
        }

        .classic-integration-tour .ant-tour-arrow::before {
          background: white;
          border: 1px solid #e5e7eb;
        }

        /* Ensure the mask covers everything including sidebar */
        .classic-integration-tour .ant-tour-mask {
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
        .classic-integration-tour .ant-tour {
          z-index: 1060 !important;
        }

        /* Make sure highlighted elements are visible above everything */
        .classic-integration-tour [data-tour] {
          position: relative;
          z-index: 1070 !important;
        }

        /* Ensure the mask covers the sidebar specifically */
        .classic-integration-tour.ant-tour-open ~ * .sidebar,
        .classic-integration-tour.ant-tour-open ~ * [class*="sidebar"],
        .classic-integration-tour.ant-tour-open ~ * nav {
          z-index: 1040 !important;
        }

        /* Additional mask overlay to ensure complete coverage */
        .classic-integration-tour.ant-tour-open::before {
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
        .classic-integration-tour.tour-fade-in .ant-tour {
          animation: tourFadeIn 0.5s ease-out forwards;
        }

        .classic-integration-tour.tour-fade-in .ant-tour-mask {
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

export default IntegrationTour;
