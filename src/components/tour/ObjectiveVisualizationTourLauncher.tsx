'use client';

import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { areTutorialsEnabledSync, onTutorialSettingChange } from '@/utils/tutorialSettings';

const ObjectiveWelcomeScreen = ({ open, onStart, onClose, isClosing }: { open: boolean; onStart: () => void; onClose: () => void; isClosing?: boolean }) => {
  if (!open) return null;

  return (
    <div
      className={`objective-welcome-overlay fixed bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
    >
      <div className={`bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-100 relative transform transition-all duration-500 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200">
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Objective Visualization!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">Take a quick tour to see how goals connect to projects and employees with a clean, uncluttered layout.</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Filter & Search</h3>
              <p className="text-gray-600 text-xs">Quickly narrow by department, status, priority, or search across titles and descriptions.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Interactive Canvas</h3>
              <p className="text-gray-600 text-xs">Zoom and pan the React Flow canvas to explore goal → project → employee relationships.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Detailed Nodes</h3>
              <p className="text-gray-600 text-xs">Open any node for rich details like KPIs, timelines, team, and linked work.</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button onClick={onStart} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Start Tour
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .objective-welcome-overlay { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 9999 !important; background-color: rgba(0,0,0,0.5) !important; }
      `}</style>
    </div>
  );
};

const ObjectiveTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  // Keep a reference to a temporary expanded target element for cleanup
  let expandedTargetEl: HTMLElement | null = null;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setIsVisible(false);
      // Clean up any temporary target when tour closes
      const existing = document.getElementById('objective-tour-expanded-target');
      if (existing) existing.remove();
    }
  }, [open]);

  // Utility: find the best node element (goal → project → employee)
  const findBestNodeElement = (): HTMLElement | null => {
    const goalEl = document.querySelector('[data-tour="objective-goal-node"]') as HTMLElement | null;
    if (goalEl) return (goalEl.closest('.react-flow__node') as HTMLElement) || goalEl;
    const projectEl = document.querySelector('[data-tour="objective-project-node"]') as HTMLElement | null;
    if (projectEl) return (projectEl.closest('.react-flow__node') as HTMLElement) || projectEl;
    const employeeEl = document.querySelector('[data-tour="objective-employee-node"]') as HTMLElement | null;
    if (employeeEl) return (employeeEl.closest('.react-flow__node') as HTMLElement) || employeeEl;
    return null;
  };

  // Build an expanded, invisible target around the node so the mask is slightly wider
  const getExpandedNodeTarget = (): HTMLElement | null => {
    const node = findBestNodeElement();
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const pad = 12; // widen by 12px on all sides

    let el = document.getElementById('objective-tour-expanded-target') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'objective-tour-expanded-target';
      el.style.position = 'fixed';
      el.style.pointerEvents = 'none';
      el.style.background = 'transparent';
      el.style.zIndex = '1070';
      document.body.appendChild(el);
    }

    el.style.left = `${Math.max(0, rect.left - pad)}px`;
    el.style.top = `${Math.max(0, rect.top - pad)}px`;
    el.style.width = `${rect.width + pad * 2}px`;
    el.style.height = `${rect.height + pad * 2}px`;

    expandedTargetEl = el;
    return el;
  };

  const steps: TourProps['steps'] = [
    {
      title: 'Search objectives',
      description: 'Find goals, projects, and employees by keywords.',
      target: () => document.querySelector('[data-tour="objective-search"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Department filter',
      description: 'Limit results to a specific department.',
      target: () => document.querySelector('[data-tour="objective-dept-filter"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Status filter',
      description: 'Show only planning, active, completed, on-hold, or canceled.',
      target: () => document.querySelector('[data-tour="objective-status-filter"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Priority filter',
      description: 'Focus on critical, high, medium, or low priority items.',
      target: () => document.querySelector('[data-tour="objective-priority-filter"]') as HTMLElement,
      placement: 'bottom',
    },
    {
      title: 'Zoom controls',
      description: 'Zoom in/out to navigate large maps.',
      target: () => document.querySelector('[data-tour="objective-zoom-controls"]') as HTMLElement,
      placement: 'left',
    },
    {
      title: 'Visualization canvas',
      description: 'Pan and explore the objective map. Click nodes for details.',
      target: () => document.querySelector('[data-tour="objective-canvas"]') as HTMLElement,
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
        arrow
        rootClassName={`classic-objective-tour ${isVisible ? 'tour-fade-in' : ''}`}
        mask={{ color: 'rgba(0,0,0,0.5)', style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 } }}
        onFinish={onClose}
        scrollIntoViewOptions={{ behavior: 'smooth', block: 'center', inline: 'nearest' }}
        closeIcon={<X className="h-4 w-4 text-gray-500 hover:text-gray-700" />}
      />
      {/* Global close control to match org chart behavior */}
      {open && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-[1100] p-2 rounded-full bg-white border border-gray-200 shadow hover:bg-gray-50"
          aria-label="Close tutorial"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      )}
      <style jsx global>{`
        .classic-objective-tour { --ant-primary-1:#f3e8ff; --ant-primary-color:#8b5cf6; --ant-primary-color-hover:#7c3aed; --ant-primary-6:#8b5cf6; --ant-primary-7:#7c3aed; }
        .classic-objective-tour .ant-tour { max-width: 240px; min-width: 210px; border-radius: 12px; box-shadow: 0 15px 30px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; background: #fff; overflow: hidden; }
        .classic-objective-tour .ant-tour-inner { font-size: 14px; padding: 12px; background: #fff !important; border-radius: 12px; }
        .classic-objective-tour .ant-tour-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; color: #1f2937; line-height: 1.3; }
        .classic-objective-tour .ant-tour-description { color: #4b5563; line-height: 1.4; margin-bottom: 12px; font-size: 13px; }
        .classic-objective-tour .ant-btn { border-radius: 6px; font-weight: 600; height: 32px; padding: 0 12px; transition: all .2s ease; font-size: 12px; }
        .classic-objective-tour .ant-btn-primary { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border: none; color: #fff; box-shadow: 0 2px 4px rgba(139,92,246,.3); }
        .classic-objective-tour .ant-btn-default { background: #f9fafb !important; border: 1px solid #d1d5db !important; color: #6b7280 !important; font-weight: 500 !important; }
        .classic-objective-tour .ant-tour-mask { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 1050 !important; background-color: rgba(0,0,0,0.5) !important; }
        .classic-objective-tour .ant-tour { z-index: 1060 !important; }
        .classic-objective-tour [data-tour] { position: relative; z-index: 1070 !important; }
        .classic-objective-tour.tour-fade-in .ant-tour { animation: tourFadeIn .5s ease-out forwards; }
        .classic-objective-tour.tour-fade-in .ant-tour-mask { animation: maskFadeIn .5s ease-out forwards; }
        @keyframes tourFadeIn { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes maskFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
};

export function ObjectiveVisualizationTourLauncher() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
  const [isWelcomeClosing, setIsWelcomeClosing] = useState(false);
  const [tutorialsEnabled, setTutorialsEnabledState] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    setTutorialsEnabledState(areTutorialsEnabledSync());
    const cleanup = onTutorialSettingChange((enabled) => {
      setTutorialsEnabledState(enabled);
      if (!enabled && isTourOpen) setIsTourOpen(false);
    });
    return cleanup;
  }, [isTourOpen]);

  const startTour = () => {
    setIsWelcomeClosing(true);
    setTimeout(() => {
      setShowWelcomePrompt(false);
      setIsWelcomeClosing(false);
      setTimeout(() => setIsTourOpen(true), 100);
    }, 500);
  };

  const dismissWelcome = () => {
    setIsWelcomeClosing(true);
    setTimeout(() => { setShowWelcomePrompt(false); setIsWelcomeClosing(false); }, 500);
  };

  const manualStartTour = () => setShowWelcomePrompt(true);
  const closeTour = () => setIsTourOpen(false);

  const isObjectiveRoute = pathname?.includes('/dashboard/objective-visualization');
  if (!isMounted || !isObjectiveRoute || !tutorialsEnabled) return null;

  return (
    <>
      {showWelcomePrompt && (
        <ObjectiveWelcomeScreen open={true} onStart={startTour} onClose={dismissWelcome} isClosing={isWelcomeClosing} />
      )}

      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={manualStartTour}
          className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white text-purple-600 border border-purple-200 shadow-lg hover:shadow-xl hover:bg-purple-50 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none overflow-hidden p-0"
          aria-label="Tutorial"
        >
          <div className="relative">
            <Lightbulb className="h-4 w-4 text-purple-600 transition-transform duration-200 group-hover:rotate-12" fill="currentColor" fillOpacity="0.1" />
          </div>
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Need help?
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </Button>
      </div>

      {isTourOpen && (<ObjectiveTour open={true} onClose={closeTour} />)}
    </>
  );
}
