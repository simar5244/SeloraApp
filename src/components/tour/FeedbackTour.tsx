'use client';

import { useEffect, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

const FeedbackTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
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
      title: 'Welcome to Feedback Portal',
      description: 'This is your central hub for sharing ideas, reporting issues, and helping shape the future of our platform. Use this space to voice your thoughts and collaborate with the team.',
      target: () => document.querySelector('[data-tour="feedback-tour-button"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Feedback Statistics',
      description: 'Get a quick overview of feedback metrics. Track the total number of suggestions, average ratings, and how many items are being actively worked on or have been resolved.',
      target: () => document.querySelector('[data-tour="feedback-stats"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Filter & Search',
      description: 'Easily find specific feedback using our powerful search and filter options. Narrow down by category, status, or use keywords to locate particular suggestions or issues.',
      target: () => document.querySelector('[data-tour="feedback-filters"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Feedback Items',
      description: 'Each card represents a piece of feedback. See the title, description, rating, and current status at a glance. Vote on items you support to help prioritize development efforts.',
      target: () => document.querySelector('[data-tour="feedback-items"]') as HTMLElement,
      placement: 'top',
    },
    {
      title: 'Engage & Contribute',
      description: 'Add your voice to the conversation. Vote on existing feedback, leave comments, or submit new suggestions. Your input helps us understand what matters most to our users.',
      target: () => document.querySelector('[data-tour="feedback-actions"]') as HTMLElement,
      placement: 'top',
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
      rootClassName="feedback-tour"
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

export default FeedbackTour;
