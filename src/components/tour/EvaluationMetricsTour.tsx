'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export const EvaluationMetricsTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
      title: 'Evaluation Metrics Overview',
      description: 'Welcome to the Evaluation Metrics dashboard. This section provides comprehensive insights into employee performance, feedback, and evaluation data to help you make informed decisions.',
      target: () => document.querySelector('[data-tour="metrics-overview"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Performance Rankings',
      description: 'View and sort employees based on their performance metrics. Use the sort options to identify top performers and those who may need additional support.',
      target: () => document.querySelector('[data-tour="performance-rankings"]') as HTMLElement,
      placement: 'right',
    },
    {
      title: 'Detailed Feedback',
      description: 'Access detailed feedback for each employee, including ratings across different categories and comments from evaluators.',
      target: () => document.querySelector('[data-tour="detailed-feedback"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Analytics & Insights',
      description: 'Explore visual analytics that highlight trends, patterns, and key insights from the evaluation data.',
      target: () => document.querySelector('[data-tour="analytics-insights"]') as HTMLElement,
      placement: 'top',
    },
    {
      title: 'Action Items',
      description: 'Quickly identify and manage action items based on evaluation results to support employee development.',
      target: () => document.querySelector('[data-tour="action-items"]') as HTMLElement,
      placement: 'bottom',
    },
  ];

  if (!mounted) return null;

  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      type="primary"
      arrow={true}
      rootClassName="evaluation-metrics-tour"
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
  );
};

export default EvaluationMetricsTour;
