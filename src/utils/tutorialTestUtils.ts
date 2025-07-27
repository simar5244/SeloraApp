/**
 * Test utilities for the tutorial system
 * These functions help test the tutorial tracking functionality
 */

import { 
  initializeFirstTimeVisitTracking, 
  shouldShowTutorial, 
  markTutorialCompleted, 
  resetTutorialTracking,
  getFirstTimeVisitData 
} from './tutorialSettings';

/**
 * Test the tutorial system with a simulated new account
 */
export const testTutorialSystem = () => {
  console.log('🧪 Testing Tutorial System');
  
  // Reset any existing data
  resetTutorialTracking();
  console.log('✅ Reset tutorial tracking');
  
  // Simulate account creation
  const accountCreatedAt = new Date().toISOString();
  initializeFirstTimeVisitTracking(accountCreatedAt);
  console.log('✅ Initialized first-time visit tracking for account created at:', accountCreatedAt);
  
  // Test first visit to profile page
  const shouldShowProfileTutorial = shouldShowTutorial('profile');
  console.log('🔍 Should show profile tutorial on first visit:', shouldShowProfileTutorial);
  
  // Test second visit to profile page (should not show tutorial)
  const shouldShowProfileTutorialAgain = shouldShowTutorial('profile');
  console.log('🔍 Should show profile tutorial on second visit:', shouldShowProfileTutorialAgain);
  
  // Mark tutorial as completed
  markTutorialCompleted('profile');
  console.log('✅ Marked profile tutorial as completed');
  
  // Test after completion
  const shouldShowAfterCompletion = shouldShowTutorial('profile');
  console.log('🔍 Should show profile tutorial after completion:', shouldShowAfterCompletion);
  
  // Show current tracking data
  const trackingData = getFirstTimeVisitData();
  console.log('📊 Current tracking data:', trackingData);
  
  return {
    accountCreatedAt,
    firstVisitResult: shouldShowProfileTutorial,
    secondVisitResult: shouldShowProfileTutorialAgain,
    afterCompletionResult: shouldShowAfterCompletion,
    trackingData
  };
};

/**
 * Test the tutorial system with an existing account (simulating login)
 */
export const testExistingAccountFlow = () => {
  console.log('🧪 Testing Existing Account Flow');
  
  // Don't initialize tracking (simulating existing account without tracking)
  const shouldShowTutorial1 = shouldShowTutorial('profile');
  console.log('🔍 Should show tutorial for existing account (no tracking):', shouldShowTutorial1);
  
  return {
    shouldShowTutorial: shouldShowTutorial1
  };
};

/**
 * Simulate the complete new user journey
 */
export const simulateNewUserJourney = () => {
  console.log('🧪 Simulating Complete New User Journey');
  
  // Step 1: Reset everything
  resetTutorialTracking();
  
  // Step 2: User creates account and gets approved
  const accountCreatedAt = new Date().toISOString();
  initializeFirstTimeVisitTracking(accountCreatedAt);
  console.log('👤 New user account created and approved');
  
  // Step 3: User visits dashboard for first time
  console.log('🏠 User visits dashboard...');
  
  // Step 4: User visits profile page for first time
  console.log('👤 User visits profile page for first time...');
  const shouldShowProfileTutorial = shouldShowTutorial('profile');
  console.log('✨ Profile tutorial should show:', shouldShowProfileTutorial);
  
  // Step 5: User completes tutorial
  if (shouldShowProfileTutorial) {
    markTutorialCompleted('profile');
    console.log('✅ User completed profile tutorial');
  }
  
  // Step 6: User visits profile page again
  console.log('👤 User visits profile page again...');
  const shouldShowAgain = shouldShowTutorial('profile');
  console.log('✨ Profile tutorial should show again:', shouldShowAgain);
  
  // Step 7: Test other pages
  console.log('📊 User visits visualization page for first time...');
  const shouldShowVisualizationTutorial = shouldShowTutorial('visualization');
  console.log('✨ Visualization tutorial should show:', shouldShowVisualizationTutorial);
  
  return {
    profileFirstVisit: shouldShowProfileTutorial,
    profileSecondVisit: shouldShowAgain,
    visualizationFirstVisit: shouldShowVisualizationTutorial,
    finalTrackingData: getFirstTimeVisitData()
  };
};

/**
 * Test welcome screen overlay positioning
 */
export const testWelcomeScreenOverlay = () => {
  console.log('🧪 Testing Welcome Screen Overlay');

  // Reset and trigger tutorial
  resetTutorialTracking();
  const accountCreatedAt = new Date().toISOString();
  initializeFirstTimeVisitTracking(accountCreatedAt);

  // Check if welcome screen should show
  const shouldShow = shouldShowTutorial('profile');
  console.log('✨ Should show welcome screen:', shouldShow);

  if (shouldShow) {
    console.log('🎯 Welcome screen should appear with:');
    console.log('   - z-index: 9999 (above sidebar z-30)');
    console.log('   - Position: fixed covering entire viewport');
    console.log('   - Background: rgba(0, 0, 0, 0.5)');
    console.log('   - Should darken both main content AND sidebar');
  }

  return { shouldShow };
};

/**
 * Test dashboard tour button-only trigger
 */
export const testDashboardTourButtonOnly = () => {
  console.log('🧪 Testing Dashboard Tour Button-Only Trigger');

  console.log('📋 Dashboard tour should now:');
  console.log('   ✅ NOT auto-trigger on first visit');
  console.log('   ✅ Only show when clicking the help button');
  console.log('   ✅ Show welcome screen with X close button');
  console.log('   ✅ Darken both main content AND sidebar');
  console.log('   ✅ Have "Skip Tour" and "Start Tour" options');

  console.log('🎯 To test:');
  console.log('   1. Visit dashboard page');
  console.log('   2. No tutorial should auto-appear');
  console.log('   3. Click the help button (bottom-right)');
  console.log('   4. Welcome screen should appear');
  console.log('   5. Both sidebar and main content should be darkened');

  return {
    testInstructions: 'Click the help button to test the welcome screen'
  };
};

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testTutorialSystem = testTutorialSystem;
  (window as any).testExistingAccountFlow = testExistingAccountFlow;
  (window as any).simulateNewUserJourney = simulateNewUserJourney;
  (window as any).resetTutorialTracking = resetTutorialTracking;
  (window as any).testWelcomeScreenOverlay = testWelcomeScreenOverlay;
  (window as any).testDashboardTourButtonOnly = testDashboardTourButtonOnly;
}
