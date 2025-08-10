/**
 * Utility functions for managing tutorial settings across the application
 */

/**
 * Check if tutorials are enabled (from database)
 * @returns Promise<boolean> - true if tutorials are enabled, false otherwise
 */
export const areTutorialsEnabled = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return true; // Default to enabled on server-side
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return true; // Default to enabled if not authenticated
    }

    const response = await fetch('/api/user/tutorial-preferences', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return true; // Default to enabled on error
    }

    const data = await response.json();
    return data.tutorialPreferences?.enabled ?? true;
  } catch (error) {
    console.error('Error fetching tutorial preferences:', error);
    return true; // Default to enabled on error
  }
};

/**
 * Checklist visibility settings (decoupled from tutorials)
 */

/** Sync getter for checklist visibility */
export const areChecklistEnabledSync = (): boolean => {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem('checklistEnabled');
  if (raw === null) return true; // default: enabled
  try { return JSON.parse(raw); } catch { return true; }
};

/** Sync setter for checklist visibility */
export const setChecklistEnabledSync = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('checklistEnabled', JSON.stringify(enabled));
  // broadcast change to other tabs/components
  window.dispatchEvent(new StorageEvent('storage', { key: 'checklistEnabled', newValue: JSON.stringify(enabled) }));
};

/** Subscribe to checklist visibility changes */
export const onChecklistSettingChange = (callback: (enabled: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === 'checklistEnabled' && e.newValue !== null) {
      try {
        callback(JSON.parse(e.newValue));
      } catch { callback(true); }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};

/**
 * Set tutorial enabled/disabled state (to database)
 * @param enabled - boolean indicating if tutorials should be enabled
 */
export const setTutorialsEnabled = async (enabled: boolean): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    await fetch('/api/user/tutorial-preferences', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    });
  } catch (error) {
    console.error('Error updating tutorial preferences:', error);
  }
};

/**
 * Check if tutorials are enabled (synchronous fallback using localStorage)
 * @returns boolean - true if tutorials are enabled, false otherwise
 */
export const areTutorialsEnabledSync = (): boolean => {
  if (typeof window === 'undefined') {
    return true; // Default to enabled on server-side
  }

  const setting = localStorage.getItem('tutorialsEnabled');
  if (setting === null) {
    return true; // Default to enabled if not set
  }

  try {
    return JSON.parse(setting);
  } catch {
    return true; // Default to enabled if parsing fails
  }
};

/**
 * Set tutorial enabled/disabled state (synchronous fallback using localStorage)
 * @param enabled - boolean indicating if tutorials should be enabled
 */
export const setTutorialsEnabledSync = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('tutorialsEnabled', JSON.stringify(enabled));

  // Also update database in background
  setTutorialsEnabled(enabled).catch(console.error);
};

/**
 * Listen for tutorial setting changes across tabs/windows
 * @param callback - function to call when setting changes
 * @returns cleanup function
 */
export const onTutorialSettingChange = (callback: (enabled: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'tutorialsEnabled' && e.newValue !== null) {
      try {
        const enabled = JSON.parse(e.newValue);
        callback(enabled);
      } catch {
        callback(true);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

/**
 * Tutorial tracking system for first-time visits after account creation
 */

interface FirstTimeVisitData {
  accountCreatedAt: string; // ISO timestamp of when account was created
  firstVisits: Record<string, string>; // page -> ISO timestamp of first visit
  tutorialsCompleted: Record<string, string>; // tutorial -> ISO timestamp of completion
}

/**
 * Initialize first-time visit tracking when user creates account
 * @param accountCreatedAt - ISO timestamp of when account was created
 */
export const initializeFirstTimeVisitTracking = (accountCreatedAt: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const data: FirstTimeVisitData = {
    accountCreatedAt,
    firstVisits: {},
    tutorialsCompleted: {}
  };

  localStorage.setItem('firstTimeVisitData', JSON.stringify(data));
};

/**
 * Get first-time visit tracking data
 * @returns FirstTimeVisitData or null if not initialized
 */
export const getFirstTimeVisitData = (): FirstTimeVisitData | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const data = localStorage.getItem('firstTimeVisitData');
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * Record first visit to a page
 * @param pageName - name of the page being visited
 * @returns boolean - true if this is the first visit, false otherwise
 */
export const recordFirstVisit = (pageName: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const data = getFirstTimeVisitData();
  if (!data) {
    return false; // No tracking data means user didn't create account recently
  }

  // Check if this is the first visit to this page
  if (data.firstVisits[pageName]) {
    return false; // Already visited
  }

  // Record the first visit
  data.firstVisits[pageName] = new Date().toISOString();
  localStorage.setItem('firstTimeVisitData', JSON.stringify(data));

  return true; // This is the first visit
};

/**
 * Check if user should see tutorial for a page
 * @param pageName - name of the page
 * @returns boolean - true if tutorial should be shown
 */
export const shouldShowTutorial = (pageName: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const data = getFirstTimeVisitData();
  if (!data) {
    return false; // No tracking data
  }

  // Check if tutorial was already completed
  if (data.tutorialsCompleted[pageName]) {
    return false; // Tutorial already completed
  }

  // Check if this is first visit to the page
  const isFirstVisit = recordFirstVisit(pageName);

  return isFirstVisit;
};

/**
 * Mark tutorial as completed
 * @param pageName - name of the page/tutorial
 */
export const markTutorialCompleted = (pageName: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const data = getFirstTimeVisitData();
  if (!data) {
    return;
  }

  data.tutorialsCompleted[pageName] = new Date().toISOString();
  localStorage.setItem('firstTimeVisitData', JSON.stringify(data));
};

/**
 * Check if tutorial was completed
 * @param pageName - name of the page/tutorial
 * @returns boolean - true if tutorial was completed
 */
export const isTutorialCompleted = (pageName: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const data = getFirstTimeVisitData();
  if (!data) {
    return false;
  }

  return !!data.tutorialsCompleted[pageName];
};

/**
 * Reset all tutorial tracking (for testing purposes)
 */
export const resetTutorialTracking = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('firstTimeVisitData');

  // Also remove old tutorial tracking keys
  const oldKeys = [
    'hasTakenProfileTour',
    'hasTakenVisualizationTour',
    'hasTakenBillingTour',
    'hasTakenFeedbackPageTour',
    'hasTakenYourReportsTour',
    'hasTakenSuccessionPlanningTour',
    'hasTakenProjectsTour',
    'hasTakenReportGenerationTour',
    'hasTakenDashboardTour',
    'hasTakenUserManagementTour'
  ];

  oldKeys.forEach(key => localStorage.removeItem(key));
};
