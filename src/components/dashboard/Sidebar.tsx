"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Users, LayoutGrid, Search, Coins, UserCog, Camera,
  User, Settings, LogOut, X, Menu, ChevronLeft, ChevronRight,
  LineChart, Database, Building2, Shield, MessageSquare, ListChecks, Briefcase,
  ClipboardList, Plug, FileText, BarChart2, Building, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES, getUserAccessibleRoutes, hasRouteAccess } from '@/lib/permissions';
import Image from 'next/image';

interface SidebarProps {
  user: any;
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  order: number;
}

export default function Sidebar({ user, isOpen, toggleSidebar }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Check if a nav item is active
  const isActive = (path: string) => {
    if (!pathname) return false;
    
    // Special handling for dashboard routes
    if (path === ROUTES.EMPLOYEE_DASHBOARD || path === ROUTES.DASHBOARD) {
      if (user?.role?.startsWith('employee_')) {
        return pathname === ROUTES.EMPLOYEE_DASHBOARD || 
               pathname.startsWith(`${ROUTES.EMPLOYEE_DASHBOARD}/`);
      } else {
        return pathname === ROUTES.DASHBOARD || 
               (pathname.startsWith(`${ROUTES.DASHBOARD}/`) && 
               !pathname.startsWith(ROUTES.EMPLOYEE_DASHBOARD));
      }
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // Define all possible navigation items with their respective order
  const allNavItems: NavItem[] = [
    { 
      name: 'Dashboard', 
      href: user?.role?.startsWith('employee_') ? ROUTES.EMPLOYEE_DASHBOARD : ROUTES.DASHBOARD, 
      icon: <Home className="w-5 h-5" />, 
      order: 1 
    },
    { name: 'Projects', href: ROUTES.PROJECTS, icon: <ClipboardList className="w-5 h-5" />, order: 2 },
    { name: 'Feedback', href: ROUTES.FEEDBACK, icon: <MessageSquare className="w-5 h-5" />, order: 3 },
    { name: 'Integrations', href: ROUTES.INTEGRATIONS, icon: <Plug className="w-5 h-5" />, order: 4 },
    { name: 'Visualizations', href: ROUTES.VISUALIZATIONS, icon: <LayoutGrid className="w-5 h-5" />, order: 5 },
    { name: 'Succession Planning', href: ROUTES.SUCCESSION_PLANNING, icon: <UserCog className="w-5 h-5" />, order: 6 },
    { name: 'Evaluation Metrics', href: ROUTES.EVALUATION_METRICS, icon: <BarChart2 className="w-5 h-5" />, order: 7 },
    { name: 'Org AI', href: ROUTES.WEB_QUERY, icon: <Database className="w-5 h-5" />, order: 8 },
    { name: 'Report Generation', href: ROUTES.REPORT_GENERATION, icon: <FileText className="w-5 h-5" />, order: 9 },
    { name: 'User Management', href: ROUTES.USER_MANAGEMENT, icon: <Users className="w-5 h-5" />, order: 10 },
    { name: 'Department Management', href: ROUTES.DEPARTMENT_MANAGEMENT, icon: <Building className="w-5 h-5" />, order: 11 },
    { name: 'Goals', href: ROUTES.GOALS, icon: <Target className="w-5 h-5" />, order: 12 },
    { name: 'User Approvals', href: ROUTES.USER_APPROVALS, icon: <Shield className="w-5 h-5" />, order: 13 },
    { name: 'Platform Settings', href: ROUTES.PLATFORM_SETTINGS, icon: <Settings className="w-5 h-5" />, order: 14 },
  ];

  // Get navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (!user || !user.role) return [];
    
    // Get routes the user has access to
    const accessibleRoutes = getUserAccessibleRoutes(user.role);
    
    // Filter navigation items based on accessible routes and sort by order
    return allNavItems
      .filter(item => accessibleRoutes.includes(item.href))
      .sort((a, b) => a.order - b.order);
  };

  const navItems = getNavItems();

  // Effect to check screen size (keep as is)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Use router.replace instead of push to ensure a full page refresh
    window.location.href = '/login';
  };

  // Use `isOpen` prop for width and visibility logic
  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20" 
          onClick={toggleSidebar} // Close on overlay click
        ></div>
      )}

      <div 
        className={`fixed inset-y-0 left-0 z-30 flex flex-col h-full bg-gray-50 text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-400
          ${isOpen ? 'w-64' : 'w-20'} 
          ${isMobile ? (isOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full') : ''}`}
      >
        {/* Header with Logo, Title, and Collapse Button */}
        <div className="flex items-center justify-between h-16 pl-6 pr-4 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden h-10">
            {/* Logo using Image component */}
            <div className={`relative flex-shrink-0 ${isOpen ? 'h-6 w-6 -ml-0.5' : 'h-0 w-0 opacity-0'}`}>
              <Image 
                src="/logo1.png" 
                alt="Synera Logo" 
                fill
                className="object-contain"
                sizes="24px"
              />
            </div>
            {isOpen && <span className="text-lg font-semibold text-black whitespace-nowrap">Selora</span>}
          </Link>
          <div className="flex items-center">
            {/* Desktop Collapse Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-gray-500 hover:text-purple-600 hover:bg-purple-100"
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="sr-only">{isOpen ? 'Collapse' : 'Expand'} Sidebar</span>
            </Button>
            
            {/* Mobile Close Button */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar} 
                className="ml-2 text-gray-300 hover:text-purple-600 hover:bg-purple-100"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow overflow-y-auto overflow-x-hidden p-3 space-y-1">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name} className="list-none">
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors group
                    ${pathname === item.href
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-800 hover:bg-purple-200 hover:text-black'
                    } 
                    ${!isOpen ? 'justify-center' : ''}`}
                  title={!isOpen ? item.name : undefined}
                >
                  <span className={`flex-shrink-0 h-5 w-5 ${isOpen ? 'mr-3' : ''}`}>{item.icon}</span>
                  {isOpen && <span className="truncate">{item.name}</span>}
                  {!isOpen && <span className="sr-only">{item.name}</span>} 
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Area with Billing, Profile and Logout */}
        <div className="mt-auto border-t border-gray-700 p-3 flex-shrink-0 space-y-2">
          {/* Billing Button - Only show for users with billing access */}
          {user && hasRouteAccess(user.role, ROUTES.BILLING) && (
            <Link
              href={ROUTES.BILLING}
              className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full
                ${pathname === ROUTES.BILLING
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-800 hover:bg-gray-200 hover:text-black'
                } 
                ${!isOpen ? 'justify-center' : ''}`}
              title={!isOpen ? 'Billing' : undefined}
            >
              <Coins className="w-4 h-4 mr-2" />
              {isOpen && <span className="text-sm">Billing</span>}
              {!isOpen && <span className="sr-only">Billing</span>}
            </Link>
          )}
          
          {/* Profile Button */}
          <Link
            href="/dashboard/profile"
            className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full
              ${pathname === '/dashboard/profile'
                ? 'bg-purple-600 text-white' 
                : 'text-gray-800 hover:bg-purple-200 hover:text-black'
              } 
              ${!isOpen ? 'justify-center' : ''}`}
            title={!isOpen ? 'Profile' : undefined}
          >
            <User className="w-4 h-4 mr-2" />
            {isOpen && <span className="text-sm">Profile</span>}
            {!isOpen && <span className="sr-only">Profile</span>}
          </Link>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left
              text-gray-800 hover:bg-red-100 hover:text-red-700
              ${!isOpen ? 'justify-center' : ''}`}
            title={!isOpen ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isOpen && <span>Sign Out</span>}
            <span className="sr-only">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
} 