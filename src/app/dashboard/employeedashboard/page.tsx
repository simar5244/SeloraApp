'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaUsers,
  FaProjectDiagram,
  FaUserTie,
  FaSearch,
  FaChartLine,
  FaFileAlt,
  FaComments,
  FaUserCog,
  FaCalendarAlt,
  FaClipboardList
} from 'react-icons/fa';

// Initial state for the employee dashboard
const initialStats = {
  assignedProjects: 0,
  weeklyHours: 0,
  feedbackReceived: 0,
  feedbackGiven: 0,
  upcomingDeadlines: 0,
  projects: []
};

// Type definitions
interface Project {
  id: string;
  title: string;
  status: string;
  endDate: string;
  priority: string;
  department: string;
  weeklyHours: number;
}

interface DashboardStats {
  assignedProjects: number;
  weeklyHours: number;
  feedbackReceived: number;
  feedbackGiven: number;
  upcomingDeadlines: number;
  projects: Project[];
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Fetch employee dashboard data from API
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user's projects
        const projectsResponse = await fetch('/api/dashboard/employee/projects', {
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Important for sending cookies
        });
        
        if (!projectsResponse.ok) {
          throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
        }
        
        const projects = await projectsResponse.json();
        
        // Calculate total weekly hours
        const weeklyHours = projects.reduce((total: number, project: any) => {
          return total + (project.weeklyHours || 0);
        }, 0);
        
        // Count upcoming deadlines (within 7 days)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        
        // Calculate upcoming deadlines count
        const upcomingDeadlines = projects.filter((project: any) => {
          if (!project.endDate) return false;
          try {
            const dueDate = new Date(project.endDate);
            dueDate.setHours(0, 0, 0, 0); // Normalize time for comparison
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue >= 0 && daysUntilDue <= 7;
          } catch (error) {
            console.error('Error processing project end date:', project.endDate, error);
            return false;
          }
        }).length;
        
        // Log projects for debugging
        console.log('Projects with end dates:', projects.map((p: any) => ({
          title: p.title,
          endDate: p.endDate,
          daysUntil: p.endDate ? Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 'N/A'
        })));
        
        // Fetch feedback count
        const feedbackResponse = await fetch('/api/dashboard/feedback-count', {
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        let feedbackCount = 0;
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          feedbackCount = feedbackData.count || 0;
        }
        
        setFeedbackCount(feedbackCount);
        setStats(prev => ({
          ...prev,
          assignedProjects: projects.length,
          weeklyHours,
          upcomingDeadlines,
          projects: projects.map((project: any) => ({
            id: project._id,
            title: project.name || 'Unnamed Project',
            status: project.status || 'active',
            endDate: project.endDate || new Date().toISOString(),
            priority: project.priority || 'medium',
            department: project.department || 'General',
            weeklyHours: project.weeklyHours || 0
          }))
        }));
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching employee dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        
        // Set empty state on error
        setStats(prev => ({
          ...prev,
          projects: []
        }));
      } finally {
        setIsLoading(false);
        setIsFeedbackLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Format date to display
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    return `Due in ${diffDays} days`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'active': 
      case 'in progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-orange-100 text-orange-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Define features for employee dashboard
  const features = [
    {
      title: 'My Projects',
      description: 'View and manage your assigned projects and tasks.',
      icon: <FaProjectDiagram className="h-8 w-8 text-blue-600" />,
      href: '/dashboard/myprojects',
      color: 'border-blue-200 bg-blue-50 hover:bg-blue-100'
    },
    {
      title: 'Time Tracking',
      description: 'Log and manage your work hours across different projects.',
      icon: <FaCalendarAlt className="h-8 w-8 text-green-600" />,
      href: '/dashboard/timetracking',
      color: 'border-green-200 bg-green-50 hover:bg-green-100'
    },
    {
      title: 'Feedback',
      description: 'Give and receive feedback from your colleagues.',
      icon: <FaComments className="h-8 w-8 text-yellow-600" />,
      href: '/dashboard/feedback',
      color: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
    },
    {
      title: 'Skill Development',
      description: 'Track your skills and find learning opportunities.',
      icon: <FaUserCog className="h-8 w-8 text-purple-600" />,
      href: '/dashboard/skills',
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    },
    {
      title: 'Team Directory',
      description: 'Find and connect with colleagues across the organization.',
      icon: <FaUsers className="h-8 w-8 text-indigo-600" />,
      href: '/dashboard/directory',
      color: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
    },
    {
      title: 'My Reports',
      description: 'Access and download your personal reports and analytics.',
      icon: <FaFileAlt className="h-8 w-8 text-pink-600" />,
      href: '/dashboard/myreports',
      color: 'border-pink-200 bg-pink-50 hover:bg-pink-100'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Welcome section */} 
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, <span className="text-purple-700">{user?.firstName || 'User'}</span>
        </h1>
        <p className="text-lg text-gray-600">
          Here's your personal dashboard with your projects and tasks.
        </p>
      </div>

      {/* Error message if API fetch failed */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Personal Stats grid */} 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Assigned Projects */} 
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Assigned Projects</p>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
              ) : (
                <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.assignedProjects}</p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaProjectDiagram className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        

        {/* Feedback Given This Quarter */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Feedback Given (Q{Math.floor(new Date().getMonth() / 3) + 1})</p>
              {isFeedbackLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
              ) : (
                <p className="text-3xl font-semibold text-gray-900 mt-1">{feedbackCount}</p>
              )}
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaComments className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Upcoming Deadlines</p>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
              ) : (
                <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.upcomingDeadlines}</p>
              )}
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FaClipboardList className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Current Projects section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Current Projects</h2>
          <Link href="/dashboard/myprojects" className="text-sm font-medium text-purple-700 hover:text-blue-900">
            View all →
          </Link>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-16 bg-gray-200 animate-pulse rounded"></div>
          </div>
        ) : stats.projects && stats.projects.length > 0 ? (
          <div className="space-y-4">
            {stats.projects.map(project => (
              <Link 
                key={project.id} 
                href={`/dashboard/projects/${project.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDueDate(project.endDate)} 
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No active projects assigned to you.</p>
        )}
      </div>

    </div>
  );
}