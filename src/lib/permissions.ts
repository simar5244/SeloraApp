// Define user role types
export type UserRole = 
  | 'employee_tier_1' 
  | 'employee_tier_2' 
  | 'employee_tier_3'
  | 'top_management_tier_1' 
  | 'top_management_tier_2' 
  | 'top_management_tier_3'
  | 'admin'
  | 'superadmin';

// Define all available routes in the system
export const ROUTES = {
  DASHBOARD: '/dashboard',
  EMPLOYEE_DASHBOARD: '/dashboard/employeedashboard',
  PROJECTS: '/dashboard/projects',
  FEEDBACK: '/dashboard/feedback',
  INTEGRATIONS: '/dashboard/employees',
  VISUALIZATIONS: '/dashboard/visualizations',
  SUCCESSION_PLANNING: '/dashboard/succession-planning',
  EVALUATION_METRICS: '/dashboard/evaluation-metrics',
  WEB_QUERY: '/dashboard/orgai',
  REPORT_GENERATION: '/dashboard/report-generation',
  BILLING: '/dashboard/billing',
  PROFILE: '/dashboard/profile',
  USER_MANAGEMENT: '/dashboard/user-management',
  USER_APPROVALS: '/dashboard/admin/approvals',
  PLATFORM_SETTINGS: '/dashboard/superadmin',
};

// Define route access by role
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Employee tiers
  employee_tier_1: [
    ROUTES.EMPLOYEE_DASHBOARD,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.PROFILE,
  ],
  employee_tier_2: [
    ROUTES.EMPLOYEE_DASHBOARD,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.PROFILE,
  ],
  employee_tier_3: [
    ROUTES.EMPLOYEE_DASHBOARD,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.PROFILE,
  ],
  
  // Management tiers
  top_management_tier_1: [
    ROUTES.DASHBOARD,
    ROUTES.INTEGRATIONS,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.VISUALIZATIONS,
    ROUTES.SUCCESSION_PLANNING,
    ROUTES.EVALUATION_METRICS,
    ROUTES.WEB_QUERY,
    ROUTES.REPORT_GENERATION,
    ROUTES.PROFILE,
  ],
  top_management_tier_2: [
    ROUTES.DASHBOARD,
    ROUTES.INTEGRATIONS,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.VISUALIZATIONS,
    ROUTES.SUCCESSION_PLANNING,
    ROUTES.EVALUATION_METRICS,
    ROUTES.WEB_QUERY,
    ROUTES.REPORT_GENERATION,
    ROUTES.PROFILE,
  ],
  top_management_tier_3: [
    ROUTES.DASHBOARD,
    ROUTES.INTEGRATIONS,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.VISUALIZATIONS,
    ROUTES.SUCCESSION_PLANNING,
    ROUTES.EVALUATION_METRICS,
    ROUTES.WEB_QUERY,
    ROUTES.REPORT_GENERATION,
    ROUTES.PROFILE,
  ],
  
  // Admin roles
  admin: [
    ROUTES.DASHBOARD,
    ROUTES.INTEGRATIONS,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.VISUALIZATIONS,
    ROUTES.SUCCESSION_PLANNING,
    ROUTES.EVALUATION_METRICS,
    ROUTES.WEB_QUERY,
    ROUTES.REPORT_GENERATION,
    ROUTES.USER_MANAGEMENT,
    ROUTES.BILLING,
    ROUTES.PROFILE,
  ],
  superadmin: [
    ROUTES.DASHBOARD,
    ROUTES.INTEGRATIONS,
    ROUTES.PROJECTS,
    ROUTES.FEEDBACK,
    ROUTES.VISUALIZATIONS,
    ROUTES.SUCCESSION_PLANNING,
    ROUTES.EVALUATION_METRICS,
    ROUTES.WEB_QUERY,
    ROUTES.REPORT_GENERATION,
    ROUTES.USER_MANAGEMENT,
    ROUTES.PLATFORM_SETTINGS,
    ROUTES.BILLING,
    ROUTES.PROFILE,
  ],
};

// Helper function to check if a user has access to a specific route
export function hasRouteAccess(userRole: UserRole | string, path: string): boolean {
  // If no role, deny access
  if (!userRole) return false;
  
  // Normalize role to handle common variations
  let normalizedRole = userRole.toLowerCase();
  
  // Handle common role variations
  if (normalizedRole === 'employee') {
    normalizedRole = 'employee_tier_1'; // Default employee to tier 1
  } else if (normalizedRole === 'admin' || normalizedRole === 'ADMIN') {
    normalizedRole = 'admin';
  }
  
  // Get allowed routes for this role
  const allowedRoutes = ROLE_PERMISSIONS[normalizedRole as UserRole] || [];
  
  // Check if the exact path is allowed
  if (allowedRoutes.includes(path)) return true;
  
  // Check if any parent route is allowed (for nested routes)
  return allowedRoutes.some(route => path.startsWith(route));
}

// Helper to get all routes a user can access
export function getUserAccessibleRoutes(userRole: UserRole | string): string[] {
  return ROLE_PERMISSIONS[userRole as UserRole] || [];
} 