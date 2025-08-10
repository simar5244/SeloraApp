'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaUsers,
  FaProjectDiagram,
  FaUserTie,
  FaSearch,
  FaCoins,
  FaLightbulb,
  FaChartLine,
  FaFileAlt,
  FaPlug,
  FaComments,
  FaTimes,
  FaThumbsUp,
  FaThumbsDown,
  FaExclamationTriangle,
  FaDollarSign,
  FaClock,
  FaFileAlt as FaFileAltSolid,
  FaSitemap
} from 'react-icons/fa';
import AdminChecklist from '@/components/checklist/AdminChecklist';

// Types for overworked employees
interface JobResponsibility {
  _id: string;
  duty: string;
  hours: number;
}

interface EmployeeWithHours {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobResponsibilities: JobResponsibility[];
  totalHours: number;
}

interface EmployeeWithFeedback {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  averageRating: number;
  weightedRating: number;
  feedbackCount: number;
  lastFeedbackDate?: string;
}

interface EmployeeWithAttritionRisk {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  attritionRisk: string;
  attrition_score?: number;
  primary_explanation?: string;
  lastUpdated?: string;
  timestamp?: string;
  // Add these fields from the API response
  attritionAssessment?: {
    timestamp: string;
    email: string;
    attrition_score: number;
    attrition_risk: string;
    primary_explanation: string;
  };
}

interface Report {
  _id: string;
  name: string;
  title?: string;
  type: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  // Add other report fields as needed
}

interface ScheduledReport extends Report {
  nextRun: string;
  frequency: string;
  status: 'active' | 'paused' | 'completed';
}

interface Project {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  budget: number;
  teamMembers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

// Initial state for the dashboard
const initialStats = {
  totalEmployees: 0,
  activeProjects: 0,
  overworkedEmployees: 0,
  underutilizedEmployees: 0,
  criticalRoles: 0,
  avgUtilization: 0,
  feedback: {
    given: 0,
    received: 0
  },
  integrations: {
    active: 0
  },
  reports: {
    count: 0
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [overworkedEmployees, setOverworkedEmployees] = useState<EmployeeWithHours[]>([]);
  const [underutilizedEmployees, setUnderutilizedEmployees] = useState<EmployeeWithHours[]>([]);
  const [highFeedbackEmployees, setHighFeedbackEmployees] = useState<EmployeeWithFeedback[]>([]);
  const [lowFeedbackEmployees, setLowFeedbackEmployees] = useState<EmployeeWithFeedback[]>([]);
  const [highPriorityProjects, setHighPriorityProjects] = useState<Project[]>([]);
  const [highBudgetProjects, setHighBudgetProjects] = useState<Project[]>([]);
  const [highAttritionEmployees, setHighAttritionEmployees] = useState<EmployeeWithAttritionRisk[]>([]);
  const [integrations, setIntegrations] = useState<Array<{
    type: string;
    filename: string;
    recordcount: number;
    timestamp: string;
  }>>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<{
    type: string;
    filename: string;
    recordcount: number;
    timestamp: string;
  } | null>(null);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [scheduledReports, setScheduledReports] = useState<{
    count: number;
    recent: (Report & ScheduledReport)[];
  }>({ count: 0, recent: [] });
  const [selectedReport, setSelectedReport] = useState<Report | (Report & ScheduledReport) | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithHours | EmployeeWithFeedback | EmployeeWithAttritionRisk | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch overworked employees
  const fetchOverworkedEmployees = async () => {
    try {
      const response = await fetch('/api/dashboard/overworked', {
        cache: 'no-store' // Ensure we don't get cached data
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch overworked employees:', errorText);
        throw new Error(`Failed to fetch overworked employees: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setOverworkedEmployees(data);
    } catch (err) {
      console.error('Error fetching overworked employees:', err);
    }
  };

  // Fetch underutilized employees
  const fetchUnderutilizedEmployees = async () => {
    try {
      console.log('Fetching underutilized employees...');
      const response = await fetch('/api/dashboard/underutilized', {
        cache: 'no-store' // Ensure we don't get cached data
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch underutilized employees:', errorText);
        throw new Error(`Failed to fetch underutilized employees: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Underutilized employees data:', data);
      setUnderutilizedEmployees(data);
    } catch (err) {
      console.error('Error in fetchUnderutilizedEmployees:', err);
    }
  };

  // Fetch high feedback employees
  const fetchHighFeedbackEmployees = async () => {
    try {
      const response = await fetch('/api/dashboard/high-feedback', {
        cache: 'no-store'
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch high feedback employees:', errorText);
        throw new Error(`Failed to fetch high feedback employees: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setHighFeedbackEmployees(data);
    } catch (err) {
      console.error('Error in fetchHighFeedbackEmployees:', err);
    }
  };

  // Fetch low feedback employees
  const fetchLowFeedbackEmployees = async () => {
    try {
      const response = await fetch('/api/dashboard/low-feedback', { 
        headers: {
          'company-code': 'ABC123'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch low feedback employees');
      }
      const data = await response.json();
      setLowFeedbackEmployees(data);
    } catch (err) {
      console.error('Error fetching low feedback employees:', err);
      setError('Failed to load low feedback employees');
    }
  };

  // Fetch high priority projects
  const fetchHighPriorityProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/high-priority-projects', { 
        headers: {
          'company-code': 'ABC123',
          'authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch high priority projects');
      }
      const data = await response.json();
      setHighPriorityProjects(data);
    } catch (err) {
      console.error('Error fetching high priority projects:', err);
      setError('Failed to load high priority projects');
    }
  };

  // Fetch high budget projects
  const fetchHighBudgetProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/high-budget-projects', { 
        headers: {
          'company-code': 'ABC123',
          'authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch high budget projects');
      }
      const data = await response.json();
      setHighBudgetProjects(data);
    } catch (err) {
      console.error('Error fetching high budget projects:', err);
      setError('Failed to load high budget projects');
    }
  };

  // Fetch user's recent reports
  const fetchRecentReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/user-recent-reports', { 
        headers: {
          'company-code': 'ABC123',
          'authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recent reports');
      }
      const data = await response.json();
      setRecentReports(data);
    } catch (err) {
      console.error('Error fetching recent reports:', err);
    }
  };

  // Fetch user's scheduled reports
  const fetchScheduledReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/user-scheduled-reports', { 
        headers: {
          'company-code': 'ABC123',
          'authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled reports');
      }
      const data = await response.json();
      setScheduledReports(data);
    } catch (err) {
      console.error('Error fetching scheduled reports:', err);
    }
  };

  // Fetch high attrition employees
  const fetchHighAttritionEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/high-attrition', { 
        headers: {
          'company-code': 'ABC123',
          'authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch high attrition employees');
      }
      const data = await response.json();
      console.log('Fetched high attrition employees:', JSON.stringify(data, null, 2));
      setHighAttritionEmployees(data);
    } catch (err) {
      console.error('Error fetching high attrition employees:', err);
    }
  };

  // Fetch integration history
  const fetchIntegrationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/integration-history', {
        headers: {
          'company-code': 'ABC123',
          'authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch integration history');
      }
      const data = await response.json();
      console.log('Fetched integration history:', data);
      setIntegrations(data);
    } catch (err) {
      console.error('Error fetching integration history:', err);
    }
  };

  const handleEmployeeClick = (employee: EmployeeWithHours | EmployeeWithFeedback | EmployeeWithAttritionRisk) => {
    console.log('Selected employee data:', JSON.stringify(employee, null, 2));
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleProjectClick = (project: Project) => {
    window.location.href = `/dashboard/projects/${project._id}`;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setSelectedProject(null);
  };

  // Define features with a consistent purple/white theme
  const features = [
    {
      title: 'Organization Galaxy',
      description: '3D visualization of your organization.',
      icon: <FaLightbulb className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/galaxy-view',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    },
    {
      title: 'Organization Chart',
      description: 'Run simulations on your organization structure to visualize hierarchy and relationships.',
      icon: <FaSitemap className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/org-chart',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    },
    {
      title: 'Succession Planning',
      description: 'Identify critical roles and plan for organizational continuity.',
      icon: <FaUserTie className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/succession-planning',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100' // Use complementary colors
    },
    {
      title: 'Project Allocation Assistant',
      description: 'AI-powered recommendations for optimal team allocation and skills matching.',
      icon: <FaProjectDiagram className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/projects/create',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100' // Keep some variation
    },
    
    
    {
      title: 'OrgAI',
      description: 'Advanced AI search to find the right people with the right skills.',
      icon: <FaSearch className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/orgai',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    },
    {
      title: 'Organizational Reports',
      description: 'Get tailored, scheduled reports on your employee activity, performance, attrition, and more.',
      icon: <FaFileAltSolid className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/report-generation',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    }
  ];

  useEffect(() => {
    // Fetch user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Fetch dashboard stats (total employees and active projects)
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dashboard/stats', { 
          headers: {
            'company-code': 'ABC123',
            'authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(prev => ({
            ...prev,
            totalEmployees: data.totalEmployees || 0,
            activeProjects: data.activeProjects || 0
          }));
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    // Fetch all data
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await Promise.all([
          fetchDashboardStats(),
          fetchOverworkedEmployees(),
          fetchUnderutilizedEmployees(),
          fetchHighFeedbackEmployees(),
          fetchLowFeedbackEmployees(),
          fetchHighPriorityProjects(),
          fetchHighBudgetProjects(),
          fetchHighAttritionEmployees(),
          fetchRecentReports(),
          fetchScheduledReports()
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
    fetchIntegrationHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Checklist bubble (Stripe-like) - only on admin dashboard */}
      <AdminChecklist
        totalEmployees={stats.totalEmployees}
        activeProjects={stats.activeProjects}
        currentUser={user}
      />
      {/* Main Content */}
      <div className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome section - using purple accent */}
        <div className="mb-10" data-tour="welcome-section">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, <span className="text-purple-700">{user?.firstName || 'User'}</span>
        </h1>
        <p className="text-lg text-gray-600">
            Here's your organization's dashboard overview.
        </p>
      </div>

        {/* Error message if API fetch failed */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Stats grid - cleaner cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-tour="stats-overview">
          {/* Total Employees Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100" data-tour="total-employees">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Employees</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.totalEmployees}</p>
                )}
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FaUsers className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Active Projects Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100" data-tour="active-projects">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Projects</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.activeProjects}</p>
                )}
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FaProjectDiagram className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Organization Insights */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100" data-tour="organization-insights">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Organization Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Overutilized Employees */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaUsers className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">Overutilized Employees</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${overworkedEmployees.length} employees working >50 hours/week`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && overworkedEmployees.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {overworkedEmployees.map(emp => (
                      <div 
                        key={emp._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeClick(emp);
                        }}
                      >
                        {emp.firstName} {emp.lastName} ({emp.totalHours} hrs)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Underutilized Employees */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaUsers className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">Underutilized Employees</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${underutilizedEmployees.length} employees working <30 hours/week`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && underutilizedEmployees.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {underutilizedEmployees.map(emp => (
                      <div 
                        key={emp._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeClick(emp);
                        }}
                      >
                        {emp.firstName} {emp.lastName} ({emp.totalHours} hrs)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* High Feedback Employees */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaThumbsUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">Highly Rated Employees</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${highFeedbackEmployees.length} employees with rating ≥ 4.0`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && highFeedbackEmployees.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {highFeedbackEmployees.map(emp => (
                      <div 
                        key={emp._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => handleEmployeeClick(emp)}
                      >
                        {emp.firstName} {emp.lastName} ({emp.averageRating?.toFixed(1)}★)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Low Feedback Employees */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaThumbsDown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">Lowly Rated Employees</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${lowFeedbackEmployees.length} employees with rating ≤ 2.0`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && lowFeedbackEmployees.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {lowFeedbackEmployees.map(emp => (
                      <div 
                        key={emp._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => handleEmployeeClick(emp)}
                      >
                        {emp.firstName} {emp.lastName} ({emp.averageRating?.toFixed(1)}★)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* High Attrition Risk Employees */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaExclamationTriangle className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">High Attrition Risk Employees</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-24 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${highAttritionEmployees.length} employees at risk`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && highAttritionEmployees.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {highAttritionEmployees.map(emp => (
                      <div 
                        key={emp._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeClick(emp);
                        }}
                      >
                        {emp.firstName} {emp.lastName} 
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full ml-2">
                          {emp.attritionRisk}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ERP Integrations */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaPlug className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">ERP Integrations</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${integrations.length} recent integrations`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && integrations.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {integrations.map((integration, index) => (
                      <div 
                        key={index}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => setSelectedIntegration(integration)}
                      >
                        <div className="font-medium">{integration.type}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {integration.filename || 'No filename available'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Insights */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mt-8" data-tour="project-insights">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Project Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* High Priority Projects */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaExclamationTriangle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">High & Critical Priority Projects</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${highPriorityProjects.length} projects`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && highPriorityProjects.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {highPriorityProjects.map(project => (
                      <div 
                        key={project._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => handleProjectClick(project)}
                      >
                        {project.title}
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {project.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* High Budget Projects */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 cursor-default">
                <div className="p-2 bg-purple-100 rounded-full mr-4">
                  <FaDollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">High Budget Projects</p>
                  <p className="text-sm text-purple-800 font-medium">
                    {isLoading ? (
                      <span className="inline-block h-4 w-16 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      `${highBudgetProjects.length} projects`
                    )}
                  </p>
                </div>
              </div>
              {!isLoading && highBudgetProjects.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {highBudgetProjects.map(project => (
                      <div 
                        key={project._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => handleProjectClick(project)}
                      >
                        {project.title}
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          ${project.budget.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Insights */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mt-8" data-tour="report-insights">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Report Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Recent Reports */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-default">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full mr-4">
                    <FaFileAltSolid className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Recent Reports</p>
                    <p className="text-sm text-purple-800">
                      {isLoading ? (
                        <span className="inline-block h-4 w-24 bg-gray-200 animate-pulse rounded"></span>
                      ) : (
                        `${recentReports.length} reports generated`
                      )}
                    </p>
                  </div>
                </div>
                <a 
                  href="/dashboard/your-reports" 
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  See all
                </a>
              </div>
              {!isLoading && recentReports.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recentReports.map((report) => (
                      <div 
                        key={report._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => setSelectedReport(report)}
                      >
                        {report.title || report.name || 'Untitled Report'} ({report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'No date'})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scheduled Reports */}
            <div className="border border-purple-100 bg-purple-50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-default">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full mr-4">
                    <FaClock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Scheduled Reports</p>
                    <p className="text-sm text-purple-800">
                      {isLoading ? (
                        <span className="inline-block h-4 w-24 bg-gray-200 animate-pulse rounded"></span>
                      ) : (
                        `${scheduledReports.count} scheduled reports`
                      )}
                    </p>
                  </div>
                </div>
                <a 
                  href="/dashboard/your-reports" 
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  See all
                </a>
              </div>
              {!isLoading && scheduledReports.recent.length > 0 && (
                <div className="border-t border-purple-100 p-3 bg-white">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {scheduledReports.recent.map((report) => (
                      <div 
                        key={report._id}
                        className="text-sm text-gray-700 hover:text-purple-700 cursor-pointer hover:bg-purple-50 p-2 rounded"
                        onClick={() => setSelectedReport(report)}
                      >
                        {report.title || report.name || 'Untitled Report'} (Next: {report.nextRun ? new Date(report.nextRun).toLocaleDateString() : 'No schedule'})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        

        {/* Features grid - updated theme */}
        <div className="mt-8" data-tour="ai-features">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">AI-Powered Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href} passHref>
                <div className={`p-6 rounded-xl shadow-md border cursor-pointer transition-all duration-300 ease-in-out ${feature.color} hover:shadow-lg hover:scale-[1.03] h-full flex flex-col`}>
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm flex-grow mb-4">{feature.description}</p>
                  <div className="mt-auto text-sm font-medium text-purple-700 hover:text-purple-900">
                    Explore Feature →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Employee/Project Details Modal */}
      {(isModalOpen && selectedEmployee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedEmployee.email}</p>
                </div>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-4 space-y-4">
                {('attrition_score' in selectedEmployee || 'attritionAssessment' in selectedEmployee) && (
                  <div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Attrition Risk</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          (selectedEmployee.attritionAssessment?.attrition_risk || selectedEmployee.attritionRisk) === 'high' ? 'bg-purple-200 text-purple-800' :
                          (selectedEmployee.attritionAssessment?.attrition_risk || selectedEmployee.attritionRisk) === 'medium' ? 'bg-purple-300 text-purple-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {(selectedEmployee.attritionAssessment?.attrition_risk || selectedEmployee.attritionRisk).charAt(0).toUpperCase() + 
                           (selectedEmployee.attritionAssessment?.attrition_risk || selectedEmployee.attritionRisk).slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Attrition Score</h4>
                        <span className="font-medium text-gray-800">
                          {((selectedEmployee.attritionAssessment?.attrition_score || selectedEmployee.attrition_score || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      {(selectedEmployee.attritionAssessment?.primary_explanation || selectedEmployee.primary_explanation) && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Primary Factor</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {selectedEmployee.attritionAssessment?.primary_explanation || selectedEmployee.primary_explanation}
                          </p>
                        </div>
                      )}
                      {(selectedEmployee.attritionAssessment?.timestamp || selectedEmployee.timestamp) && (
                        <div className="text-xs text-gray-500 mt-2">
                          Last updated: {new Date(selectedEmployee.attritionAssessment?.timestamp || selectedEmployee.timestamp || '').toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {'totalHours' in selectedEmployee && (
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Total Hours</h4>
                      <span className="font-medium text-gray-900">{selectedEmployee.totalHours} hrs/week</span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-700 mt-3">Job Responsibilities:</h4>
                    <ul className="mt-1 space-y-1">
                      {selectedEmployee.jobResponsibilities.map((job: JobResponsibility) => (
                        <li key={job._id} className="text-sm text-gray-600 flex justify-between">
                          <span>• {job.duty}</span>
                          <span className="font-medium">{job.hours} hrs</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {'averageRating' in selectedEmployee && (
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm text-gray-700">Average Rating</h4>
                        <span className="text-gray-900">
                          {selectedEmployee.averageRating?.toFixed(1)}★
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm text-gray-700">Weighted Rating</h4>
                        <span className="text-gray-900">
                          {selectedEmployee.weightedRating?.toFixed(1)}★
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm text-gray-700">Total Feedbacks</h4>
                        <span className="text-gray-900">
                          {selectedEmployee.feedbackCount}
                        </span>
                      </div>
                      {selectedEmployee.lastFeedbackDate && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Last Feedback</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(selectedEmployee.lastFeedbackDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {('totalHours' in selectedEmployee && selectedEmployee.totalHours > 50) 
                    ? 'Consider redistributing some responsibilities to balance the workload.'
                    : ('totalHours' in selectedEmployee && selectedEmployee.totalHours < 30)
                      ? 'This employee has available capacity for additional responsibilities.'
                      : ('averageRating' in selectedEmployee && selectedEmployee.averageRating <= 2)
                        ? 'Consider additional training or support for this employee.'
                        : ('averageRating' in selectedEmployee && selectedEmployee.averageRating >= 4)
                          ? 'This employee is performing exceptionally well.'
                          : 'View more details in the employee profile.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Details Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedIntegration.type} Integration
              </h3>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900">File Name</h4>
                <p className="mt-1">{selectedIntegration.filename || 'N/A'}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Last Updated</h4>
                <p className="mt-1">
                  {new Date(selectedIntegration.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedReport.title || selectedReport.name || 'Untitled Report'}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              {'createdAt' in selectedReport && selectedReport.createdAt && (
                <p>Created: {new Date(selectedReport.createdAt).toLocaleString()}</p>
              )}
              {'nextRun' in selectedReport && selectedReport.nextRun && (
                <p>Next Run: {new Date(selectedReport.nextRun).toLocaleString()}</p>
              )}
              {'frequency' in selectedReport && selectedReport.frequency && (
                <p>Frequency: {selectedReport.frequency.charAt(0).toUpperCase() + selectedReport.frequency.slice(1).toLowerCase()}</p>
              )}
              {'status' in selectedReport && selectedReport.status && (
                <p>Status: {selectedReport.status}</p>
              )}
              {'createdBy' in selectedReport && selectedReport.createdBy && (
                <p>Created by: {selectedReport.createdBy.name || selectedReport.createdBy.email}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}