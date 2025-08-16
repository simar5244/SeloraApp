/**
 * Utility functions for managing checklist completion state
 */

const CHECKLIST_COMPLETED_KEY = 'checklistAllStepsCompleted';

/**
 * Check if all checklist steps have been completed
 */
export const areAllStepsCompletedSync = (): boolean => {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(CHECKLIST_COMPLETED_KEY);
  if (raw === null) return false; // default: not completed
  try { return JSON.parse(raw); } catch { return false; }
};

/**
 * Set checklist completion state
 */
export const setAllStepsCompletedSync = (completed: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHECKLIST_COMPLETED_KEY, JSON.stringify(completed));
  // broadcast change to other tabs/components
  window.dispatchEvent(new StorageEvent('storage', { 
    key: CHECKLIST_COMPLETED_KEY, 
    newValue: JSON.stringify(completed) 
  }));
};

/**
 * Subscribe to checklist completion state changes
 */
export const onChecklistCompletionChange = (callback: (completed: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === CHECKLIST_COMPLETED_KEY && e.newValue !== null) {
      try {
        callback(JSON.parse(e.newValue));
      } catch { callback(false); }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
