/**
 * Utility functions for managing tutorial settings across the application
 */

/**
 * Check if tutorials are enabled
 * @returns boolean - true if tutorials are enabled, false otherwise
 */
export const areTutorialsEnabled = (): boolean => {
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
 * Set tutorial enabled/disabled state
 * @param enabled - boolean indicating if tutorials should be enabled
 */
export const setTutorialsEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem('tutorialsEnabled', JSON.stringify(enabled));
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
