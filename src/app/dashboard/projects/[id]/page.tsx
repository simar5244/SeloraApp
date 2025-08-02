'use client';

import { useRouter, useParams } from 'next/navigation';
import { FaArrowLeft, FaEdit, FaTrash, FaUser, FaClock, FaCalendar, FaExclamationCircle, FaSpinner, FaCommentDots, FaSearch, FaPlus } from 'react-icons/fa';
import { Project } from '@/types/project';
import { Label } from '@/components/ui/label';
import ProjectForm from '@/components/ProjectForm';
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Clock, XCircle, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { toast } from 'react-hot-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkIcon as LucideLinkIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { EmployeeContribution } from '@/types/project';

// Label component for form fields
const FormLabel = ({ children, htmlFor, className, ...props }: { children: React.ReactNode, htmlFor?: string, className?: string, [key: string]: any }) => (
  <label htmlFor={htmlFor} className={className} {...props}>
    {children}
  </label>
);

interface ProjectDetailProps {
  params: {
    id: string;
  };
}

// Status styles
const statusStyles: Record<string, string> = {
  'planning': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'ongoing': 'bg-yellow-100 text-yellow-800',
  'active': 'bg-yellow-100 text-yellow-800',
  'review': 'bg-purple-100 text-purple-800',
  'completed': 'bg-green-100 text-green-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  'canceled': 'bg-red-100 text-red-800'
};

// Priority styles
const priorityStyles: Record<string, string> = {
  'low': 'bg-gray-100 text-gray-800',
  'medium': 'bg-blue-100 text-blue-800',
  'high': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800'
};

// Normalize status to match our status styles
const normalizeStatus = (status: string): string => {
  if (!status) return 'planning';
  
  // Convert to lowercase and handle common variations
  const s = status.toLowerCase();
  
  if (s.includes('plan') || s === 'backlog') return 'planning';
  if (s.includes('progress') || s === 'ongoing' || s === 'in progress' || s === 'active') return 'in-progress';
  if (s.includes('review') || s === 'qa' || s === 'testing') return 'review';
  if (s.includes('complet') || s === 'done' || s === 'finished') return 'completed';
  if (s.includes('hold') || s === 'paused') return 'on-hold';
  if (s.includes('cancel') || s === 'abandoned') return 'canceled';
  
  // Default to planning if no match
  return 'planning';
};

// Normalize priority to match our priority styles
const normalizePriority = (priority: string): string => {
  if (!priority) return 'medium';
  
  const p = priority.toLowerCase();
  
  if (p.includes('critical') || p.includes('urgent') || p === 'highest') return 'critical';
  if (p.includes('high')) return 'high';
  if (p.includes('med') || p === 'normal') return 'medium';
  if (p.includes('low')) return 'low';
  
  return 'medium';
};

// Fix type errors by adding interface definitions
interface ExtendedProject extends Project {
  linkedProjects?: Array<{ id: string; title: string }>;
  viewers?: Array<{
    name: string;
    email: string;
  }>;
  employees?: ExtendedEmployeeContribution[];
  visibleToAll?: boolean;
  isManagementProject?: boolean;
  createdByRole?: string;
  tools_used?: any;
  risk_level?: number;
}

interface ExtendedEmployeeContribution extends EmployeeContribution {
  name?: string;
  email?: string;
  department?: string;
  tasks?: string | string[];
  tools_used?: string | string[];
}

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ExtendedProject | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkingProject, setLinkingProject] = useState(false);
  const [linkedProjects, setLinkedProjects] = useState<any[]>([]);
  type EmployeeEditor = { name: string; email: string; department: string; role: string; hours: string; tasks: string; tools_used: string };
  const [editData, setEditData] = useState<{
    project_title: string;
    project_description: string;
    status: string;
    priority: string;
    department: string;
    start_date: string;
    end_date: string;
    total_hours: string;
    tech_stack: string[];
    linkedProjects: { id: string; title: string }[];
    employees: EmployeeEditor[];
    viewers: { name: string; email: string; role?: string }[];
    total_budget: string;
    visibleToAll: boolean;
  }>({
    project_title: '',
    project_description: '',
    status: '',
    priority: '',
    department: '',
    start_date: '',
    end_date: '',
    total_hours: '',
    tech_stack: [],
    linkedProjects: [],
    employees: [{ name: '', email: '', department: '', role: '', hours: '', tasks: '', tools_used: '' }],
    viewers: [],
    total_budget: '',
    visibleToAll: false
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Update modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState<any[]>([]);

  // User search states for edit mode - using user-management pattern
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [showViewerSearch, setShowViewerSearch] = useState(false);

  // Load current user once and load all users for search
  useEffect(() => {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) setCurrentUser(JSON.parse(userJson));
    } catch (error) {
      console.error('Error loading current user:', error);
    }

    // Load all users for search functionality
    loadAllUsers();
  }, []);

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user info for authorization
      let userInfo = '';
      
      if (currentUser) {
        const params = new URLSearchParams();
        if (currentUser.id) params.append('userId', currentUser.id);
        if (currentUser.email) params.append('userEmail', currentUser.email);
        if (currentUser.role) params.append('userRole', currentUser.role);
        
        if (params.toString()) {
          userInfo = `&${params.toString()}`;
        }
      }
      
      // Prepare auth headers and include companyCode
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      let companyCodeQuery = '';
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const code = parsed.companyCode || parsed.company_code;
          if (code) companyCodeQuery = `&companyCode=${encodeURIComponent(code)}`;
        } catch {}
      }
      
      // Use a relative URL with user info for permission enforcement
      const res = await fetch(
        `/api/projects?projectId=${id}${userInfo}${companyCodeQuery}`,
        { cache: 'no-store', credentials: 'include', headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {} }
      );
      
      if (res.status === 403) {
        setError('You do not have permission to view this project.');
        return;
      }
      
      if (!res.ok) {
        throw new Error(`Failed to fetch project: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Project data received:", data);
      
      if (!data || (!data.project && !data.id)) {
        throw new Error("Invalid project data received");
      }
      
      setProject(data.project ?? data);
      setLinkedProjects((data.project ?? data).linkedProjects || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProject();
  }, [id, currentUser]);

  useEffect(() => {
    if (project) {
      const start = project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '';
      const end = project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '';
      
      // Build employee editor list: include contributions and other members
      const contributions = project.employee_contributions?.map(c => {
        const tasks = Array.isArray(c.tasks) ? c.tasks.join(',') : typeof c.tasks === 'string' ? c.tasks : '';
        const tools = Array.isArray(c.tools_used) ? c.tools_used.join(',') : typeof c.tools_used === 'string' ? c.tools_used : '';
        return { name: c.name || '', email: c.email || '', department: c.department || '', role: c.role, hours: String(c.hours_per_week), tasks, tools_used: tools };
      }) || [];
      const membersOnly = project.employees?.filter((m: any) => !contributions.some(c => c.email === m.email)).map((m: any) => ({ name: m.name || '', email: m.email, department: m.department || '', role: m.role || '', hours: '', tasks: '', tools_used: '' })) || [];
      
      setEditData({
        project_title: project.project_title || '',
        project_description: project.project_description || '',
        status: project.status || '',
        priority: project.priority || '',
        department: project.department || '',
        start_date: start,
        end_date: end,
        total_hours: project.total_hours?.toString() || '',
        tech_stack: project.tech_stack || [],
        linkedProjects: (project.linkedProjects || []).map(lp => ({ id: lp.id || lp._id, title: lp.title || lp.project_title || lp.name })),
        employees: [...contributions, ...membersOnly],
        viewers: project.viewers?.map(v => ({ name: v.name || '', email: v.email || '' })) || [],
        total_budget: String((project as any).total_budget || ''),
        visibleToAll: project.visibleToAll || false
      });
      
      // Set linked projects from the project data
      const initialLinked = (project.linkedProjects || []).map(lp => ({ id: lp.id || lp._id, title: lp.title || lp.project_title || lp.name }));
      if (initialLinked.length > 0) {
        setLinkedProjects(initialLinked);
        setShowLinkSection(true);
      } else {
        setLinkedProjects([]);
      }
      // Refresh available projects now that linkedProjects is set
      fetchAvailableProjects();
    }
  }, [project]);

  useEffect(() => {
    if (project && currentUser) {
      // Check if user is top management - they can edit all projects
      const isTopManagement = 
        currentUser.role === 'top_management_tier_1' || 
        currentUser.role === 'top_management_tier_2' || 
        currentUser.role === 'top_management_tier_3';
      
      // Check if user is a project member (with edit rights)
      const isMember = project.employees?.some((emp: any) => 
        emp.email === currentUser.email || emp.employee_email === currentUser.email
      );
      
      // Check if user is only a viewer (view-only access)
      const isViewer = !isMember && project.viewers?.some((viewer: any) => 
        viewer.email === currentUser.email
      );
      
      // Top management can always edit
      // Any project member can edit
      setCanEdit(isTopManagement || isMember);
      
      console.log('Access check:', {
        email: currentUser.email,
        role: currentUser.role,
        isTopManagement,
        isMember,
        isViewer,
        canEdit: isTopManagement || isMember
      });
    } else {
      setCanEdit(false);
    }
  }, [project, currentUser]);

  useEffect(() => {
    if (showLinkSection) fetchAvailableProjects();
  }, [showLinkSection, id]);

  useEffect(() => {
    fetchAvailableProjects();
  }, []);

  // Load project updates
  useEffect(() => {
    const loadProjectUpdates = async () => {
      if (!id) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/projects/${id}/updates`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setProjectUpdates(data.updates || []);
        }
      } catch (error) {
        console.error('Error loading project updates:', error);
      }
    };

    loadProjectUpdates();
  }, [id]);

  // Handle project update
  const handleUpdateProject = async (updatedData: any) => {
    try {
      // Get current user info
      let userId = currentUser?.email || null;
      let userRole = currentUser?.role || null;
      
      // If no current user in state, try to get from localStorage
      if (!userId || !userRole) {
        try {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const userData = JSON.parse(userJson);
            userId = userData.email || null;
            userRole = userData.role || null;
          }
        } catch (error) {
          console.error("Error retrieving user data:", error);
        }
      }
      
      // Include auth and company headers
      const token = localStorage.getItem('token');
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (currentUser?.companyCode) headers['X-Company-Code'] = currentUser.companyCode;
      const response = await fetch(
        `/api/projects?projectId=${id}&userId=${userId}&userRole=${userRole}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            projectId: id,
            ...updatedData,
            linkedProjects: linkedProjects.map(lp => lp.id)
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update project: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // Re-fetch project to ensure fresh data with all fields
        await fetchProject();
        toast.success("Project updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.message || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  // Handle project deletion
  const handleDeleteProject = async () => {
    try {
      // Show confirmation toast with loading state
      toast.loading('Deleting project...', { id: 'delete-project' });
      
      // Get the company code from currentUser or localStorage
      let companyCode = '';
      if (currentUser?.companyCode) {
        companyCode = currentUser.companyCode;
      } else {
        // Try to get from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            companyCode = parsed.companyCode || parsed.company_code || '';
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
      }

      if (!companyCode) {
        toast.error('Company code is required for deletion', { id: 'delete-project' });
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects?projectId=${id}&companyCode=${encodeURIComponent(companyCode)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to delete project: ${response.statusText}`);
      }
      
      // Show success message
      toast.success('Project deleted successfully', { id: 'delete-project' });
      
      // Wait a brief moment to show the success message before redirecting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate back to projects page
      router.push('/dashboard/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete project', { id: 'delete-project' });
      setError(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  // Add these new functions to manage viewers
  const addViewer = () => {
    setEditData(prev => ({
      ...prev,
      viewers: [...prev.viewers, { name: '', email: '', role: 'viewer' }]
    }));
  };

  const removeViewer = (index: number) => {
    setEditData(prev => {
      const newViewers = [...prev.viewers];
      newViewers.splice(index, 1);
      return { ...prev, viewers: newViewers };
    });
  };

  // Handle project update submission
  const handleSubmitUpdate = async () => {
    if (!updateText.trim()) return;

    setIsSubmittingUpdate(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: updateText.trim(),
          author_id: currentUser?._id || currentUser?.id,
          author_name: currentUser?.name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to post update');
      }

      const result = await response.json();

      // Add the new update to the local state
      setProjectUpdates(prev => [result.update, ...prev]);

      // Clear the form and close modal
      setUpdateText('');
      setShowUpdateModal(false);

      toast.success('Update posted successfully!');
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update. Please try again.');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleViewerChange = (index: number, field: 'name' | 'email', value: string) => {
    setEditData(prev => {
      const newViewers = [...prev.viewers];
      newViewers[index] = { ...newViewers[index], [field]: value };
      return { ...prev, viewers: newViewers };
    });
  };

  // Load all users once for fast client-side search (user-management pattern)
  const loadAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users?limit=0', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }

      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to empty array if loading fails
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Employee search function - using client-side filtering (user-management pattern)
  const searchEmployees = (term: string) => {
    if (!term.trim()) {
      setEmployeeSearchResults([]);
      return;
    }

    // Filter users client-side for instant results
    const filteredUsers = allUsers.filter(user => {
      const matchesSearch =
        user.username?.toLowerCase().includes(term.toLowerCase()) ||
        user.email?.toLowerCase().includes(term.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(term.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(term.toLowerCase())) ||
        (user.name && user.name.toLowerCase().includes(term.toLowerCase()));

      return matchesSearch;
    });

    // Format results to match expected structure
    const formattedResults = filteredUsers.map(user => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || '',
      department: user.department || '',
      jobTitle: user.jobTitle || ''
    }));

    // Check if the term looks like an email for manual entry
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(term) && !formattedResults.some(user => user.email === term)) {
      // Add manual email entry option
      formattedResults.unshift({
        _id: term,
        id: term,
        email: term,
        name: term.split('@')[0],
        firstName: term.split('@')[0],
        lastName: '',
        role: '',
        department: '',
        jobTitle: '',
        isManualEntry: true
      } as any);
    }

    setEmployeeSearchResults(formattedResults);
  };

  const addEmployeeFromSearch = (employee: any) => {
    // Check if already added
    if (editData.employees.some(emp => emp.email === employee.email)) {
      toast.error('User already added as team member');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    setEditData(prev => ({
      ...prev,
      employees: [...prev.employees, {
        name: employee.name || `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
        department: employee.department || '',
        role: employee.role || 'Team Member',
        tasks: '',
        hours: '',
        tools_used: '',
        addedBy: currentUser?.name || currentUser?.email || 'Current User'
      }]
    }));

    toast.success(`${employee.name || employee.email} added as team member`);
  };

  const addViewerFromSearch = (viewer: any) => {
    // Check if already added
    if (editData.viewers.some(v => v.email === viewer.email)) {
      toast.error('User already added as viewer');
      return;
    }

    // Check if already assigned as employee
    if (editData.employees.some(emp => emp.email === viewer.email)) {
      toast.error('User is already assigned as team member');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    setEditData(prev => ({
      ...prev,
      viewers: [...prev.viewers, {
        name: viewer.name || `${viewer.firstName} ${viewer.lastName}`.trim(),
        email: viewer.email,
        addedBy: currentUser?.name || currentUser?.email || 'Current User'
      }]
    }));

    toast.success(`${viewer.name || viewer.email} added as viewer`);
  };

  // Normalize status and priority values
  const normalizedStatus = project ? normalizeStatus(project.status) : 'planning';
  const normalizedPriority = project ? normalizePriority(project.priority) : 'medium';

  // Function to fetch available projects for linking
  const fetchAvailableProjects = async () => {
    try {
      setLoadingProjects(true);
      
      // Get token and company code for authorization
      const token = localStorage.getItem('token');
      const companyCode = localStorage.getItem('companyCode') || '';
      const userEmail = localStorage.getItem('userEmail') || '';
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Fetch all projects for this tenant with proper authorization
      const params = new URLSearchParams({
        companyCode,
        userEmail: userEmail || ''
      });
      const res = await fetch(`/api/projects?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch projects: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.projects) {
        // Filter out current project
        const filtered = data.projects.filter((p: any) => 
          p.id !== id && 
          p._id !== id &&
          // Filter out already linked projects, using both id and projectId for comparison
          !((linkedProjects || []).some(lp => 
            lp.id === p.id || lp.id === p._id
          ))
        );
        
        // Filter by user permission - only include projects the user has access to
        // The API should already filter based on the user's token, but we'll double check
        const userEmail = currentUser?.email?.toLowerCase();
        const userRole = currentUser?.role;
        const isAdmin = userRole && ['admin', 'manager'].some(r => userRole.includes(r));
        
        const permitted = filtered.filter((p: any) => {
          // Always include if user is admin or the project is visible to all
          if (isAdmin || p.visibleToAll) return true;
          
          // Include if user is a project member/contributor
          if (Array.isArray(p.employees) && p.employees.some(
            (e: any) => e.email?.toLowerCase() === userEmail
          )) return true;
          
          // Include if user is explicitly added as a viewer
          if (Array.isArray(p.viewers) && p.viewers.some(
            (v: any) => v.email?.toLowerCase() === userEmail
          )) return true;
          
          // Otherwise, exclude
          return false;
        });
        
        setAvailableProjects(permitted);
      }
    } catch (error) {
      console.error('Error fetching available projects:', error);
      toast.error('Failed to load available projects');
    } finally {
      setLoadingProjects(false);
    }
  };
  
  // Function to link projects (client-side only)
  const handleLinkProject = () => {
    if (!selectedProjectId) return;
    const p = availableProjects.find(p => (p.id || p._id) === selectedProjectId);
    if (p) {
      setLinkedProjects(lps => [...lps, { id: selectedProjectId, title: p.project_title || p.name }]);
      setSelectedProjectId('');
    }
  };

  // Function to remove linked project (client-side only)
  const handleUnlinkProject = (lpId: string) => {
    // Update the linked projects list immediately
    setLinkedProjects(lps => lps.filter(lp => lp.id !== lpId));
    
    // No need to fetch available projects again since we already have all projects in availableProjects
    // The dropdown will update automatically because linkedProjects has changed
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="mb-4">
        <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center text-purple-600 hover:text-purple-800"
        >
          <FaArrowLeft className="mr-2" />
          Back to Projects
        </button>
      </div>
      <div className={`${error.includes('permission') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-700'} p-6 rounded-lg border`}>
        <h1 className="text-2xl font-bold mb-4">{error.includes('permission') ? 'Access Denied' : 'Error Loading Project'}</h1>
        <p>{error}</p>
        {error.includes('permission') && (
          <p className="mt-2">
            You need to be added as a member or viewer to access this project, or the project needs 
            to be marked as visible to all employees.
          </p>
        )}
      </div>
      {/* Add space between project details box and footer */}
      <div className="mb-96"></div>
    </div>
  );

  if (!project) return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center text-purple-600 hover:text-purple-800"
        >
          <FaArrowLeft className="mr-2" />
          Back to Projects
        </button>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
        <p>The project you're looking for could not be found.</p>
      </div>
      {/* Add space between project details box and footer */}
      <div className="mb-96"></div>
    </div>
  );

  // Editing overlay
  if (isEditing) {
    return (
      <div className="min-h-screen overflow-auto p-6 bg-gray-50 text-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setIsEditing(false)}
              className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-900"
            >
              <FaArrowLeft className="mr-2" />
              Back to Projects
            </button>
            
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Edit Project</h1>
            <p className="text-gray-500">Update the project details below.</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <form className="bg-white text-black p-6 space-y-6 w-full">
              {/* Basic Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="project_title" className="text-sm font-medium">Project Name</Label>
                  <Input id="project_title" value={editData.project_title} onChange={e => setEditData({ ...editData, project_title: e.target.value })} placeholder="Project name" className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Input 
                    id="department"
                    value={editData.department}
                    onChange={e => setEditData({ ...editData, department: e.target.value })}
                    placeholder="Enter department"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project_description" className="text-sm font-medium">Description</Label>
                <Textarea 
                  id="project_description" 
                  value={editData.project_description} 
                  onChange={e => setEditData({ ...editData, project_description: e.target.value })} 
                  placeholder="Enter project description" 
                  rows={3} 
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <Select name="status" value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                  <Select name="priority" value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-sm font-medium">Start Date</Label>
                  <Input id="start_date" type="date" value={editData.start_date} onChange={e => setEditData({ ...editData, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-sm font-medium">End Date</Label>
                  <Input id="end_date" type="date" value={editData.end_date} onChange={e => setEditData({ ...editData, end_date: e.target.value })} />
                </div>
              </div>
              
              {/* Budget & Tools Used */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="total_budget" className="text-sm font-medium">Budget</Label>
                  <Input
                    id="total_budget" 
                    type="number" 
                    placeholder="Enter project budget"
                    value={editData.total_budget} 
                    onChange={e => setEditData({ ...editData, total_budget: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech_stack" className="text-sm font-medium">Tools Used (comma separated)</Label>
                  <Input
                    id="tech_stack" 
                    placeholder="e.g. Jira, Figma, GitHub"
                    value={editData.tech_stack.join(', ')} 
                    onChange={e => setEditData({ ...editData, tech_stack: e.target.value.split(',').map(t => t.trim()) })}
                  />
                </div>
              </div>
              
              {/* Linked Projects Selection */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium">Linked Projects</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      if (selectedProjectId) {
                        const selectedProject = availableProjects.find(p => (p.id || p._id) === selectedProjectId);
                        if (selectedProject && !linkedProjects.some(lp => lp.id === selectedProjectId)) {
                          setLinkedProjects(lps => [...lps, {
                            id: selectedProjectId,
                            title: selectedProject.project_title || selectedProject.name
                          }]);
                          setSelectedProjectId('');
                        }
                      }
                    }}
                    disabled={!selectedProjectId}
                  >
                    Add Project
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger className="flex-1 bg-white text-black border-gray-300">
                      <SelectValue placeholder="Select a project to link" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      {availableProjects
                        .filter(p => {
                          // Skip if no ID or title
                          if (!(p.id || p._id) || !(p.project_title || p.name)) return false;
                          
                          // Get the ID in a consistent format
                          const projectId = p.id || p._id;
                          
                          // Only show if not already linked and not the current project
                          return !linkedProjects.some(lp => lp.id === projectId) && 
                                 projectId !== id;
                        })
                        .map((p) => (
                          <SelectItem 
                            key={p.id || p._id} 
                            value={p.id || p._id || ''} 
                            className="text-black hover:bg-gray-100"
                          >
                            {p.project_title || p.name || 'Unnamed Project'}
                          </SelectItem>
                      ))}
                      {availableProjects.filter(p => {
                        const projectId = p.id || p._id;
                        return projectId && 
                               (p.project_title || p.name) && 
                               !linkedProjects.some(lp => lp.id === projectId) && 
                               projectId !== id;
                      }).length === 0 && (
                        <p className="text-sm text-gray-700 text-center py-2 px-4 my-2 mx-2">
                          No projects available to link
                        </p>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Display selected linked projects */}
                <div className="space-y-2">
                  {linkedProjects.map((linkedProject, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-md">
                      <span className="text-sm text-black flex-1">{linkedProject.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkProject(linkedProject.id);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                        aria-label="Unlink project"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </Button>
                    </div>
                  ))}
                  
                  {linkedProjects.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No linked projects selected</p>
                  )}
                </div>
              </div>
              
              {/* Employees Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Team Members</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowEmployeeSearch(!showEmployeeSearch);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
                    >
                      <FaSearch className="mr-1 h-3 w-3" />
                      Search & Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setEditData(prev => ({...prev, employees: [...prev.employees, { name: '', email: '', department: '', role: '', hours: '', tasks: '', tools_used: '' }]}));
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-black text-sm"
                    >
                      <FaPlus className="mr-1 h-3 w-3" />
                      Add Manually
                    </Button>
                  </div>
                </div>

                {showEmployeeSearch && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="space-y-3">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Search team members by name or email..."
                          className="pl-10 pr-4 py-2 w-full"
                          value={employeeSearchTerm}
                          onChange={(e) => {
                            setEmployeeSearchTerm(e.target.value);
                            searchEmployees(e.target.value);
                          }}
                        />
                      </div>

                      {isLoadingUsers && (
                        <div className="flex items-center justify-center py-4">
                          <FaSpinner className="animate-spin h-5 w-5 text-purple-600 mr-2" />
                          <span className="text-sm text-gray-600">Loading users...</span>
                        </div>
                      )}

                      {employeeSearchTerm && employeeSearchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                          {employeeSearchResults.map((employee, index) => (
                            <div
                              key={employee.id || index}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                addEmployeeFromSearch(employee);
                                setShowEmployeeSearch(false);
                                setEmployeeSearchTerm('');
                                setEmployeeSearchResults([]);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {employee.name || employee.email}
                                    {employee.isManualEntry && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Manual Entry</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">{employee.email}</div>
                                  {employee.department && (
                                    <div className="text-xs text-gray-500">{employee.department} • {employee.role}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {employeeSearchTerm && employeeSearchResults.length === 0 && !isLoadingUsers && (
                        <div className="text-center py-4 text-gray-500">
                          No users found for "{employeeSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {editData.employees.map((emp, idx) => (
                  <div key={idx} className="border p-4 rounded-md space-y-3 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Employee {idx+1}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditData(prev=>({...prev,employees:prev.employees.filter((_,j)=>j!==idx)}));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Name" value={emp.name} onChange={(e) => {
                        const arr=[...editData.employees];
                        arr[idx].name=e.target.value;
                        setEditData({...editData,employees:arr});
                      }} />
                      <Input placeholder="Email" value={emp.email} onChange={(e) => {
                        const arr=[...editData.employees];
                        arr[idx].email=e.target.value;
                        setEditData({...editData,employees:arr});
                      }} />
                      <Input placeholder="Department" value={emp.department} onChange={(e) => {
                        const arr=[...editData.employees];
                        arr[idx].department=e.target.value;
                        setEditData({...editData,employees:arr});
                      }} />
                      <Input placeholder="Role" value={emp.role} onChange={(e) => {
                        const arr=[...editData.employees];
                        arr[idx].role=e.target.value;
                        setEditData({...editData,employees:arr});
                      }} />
                      <Input
                        placeholder="Added by"
                        value={emp.addedBy || currentUser?.name || currentUser?.email || 'Current User'}
                        disabled
                        className="bg-gray-100 text-gray-600"
                      />
                      <div className="md:col-span-2">
                        <Textarea placeholder="Specific Tasks (comma separated)" value={emp.tasks} onChange={(e) => {
                          const arr=[...editData.employees];
                          arr[idx].tasks=e.target.value;
                          setEditData({...editData,employees:arr});
                        }} rows={2} />
                      </div>
                      <Input type="number" placeholder="Hours Worked" value={emp.hours} onChange={(e) => {
                        const arr=[...editData.employees];
                        arr[idx].hours=e.target.value;
                        setEditData({...editData,employees:arr});
                      }} />
                      <Input placeholder="Tools Used (comma separated)" value={emp.tools_used} onChange={(e) => {
                        const arr=[...editData.employees];
                        arr[idx].tools_used=e.target.value;
                        setEditData({...editData,employees:arr});
                      }} />
                      <div className="flex items-center space-x-2 md:col-span-2">
                        <Checkbox
                          id={`isLead-${idx}`}
                          checked={emp.isLead || false}
                          onCheckedChange={(checked) => {
                            const arr=[...editData.employees];
                            arr[idx].isLead = !!checked;
                            setEditData({...editData,employees:arr});
                          }}
                        />
                        <Label htmlFor={`isLead-${idx}`} className="text-sm">
                          Is this person the lead of the project?
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Viewers Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Viewers</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowViewerSearch(!showViewerSearch);
                      }}
                      className="bg-yellow-100 hover:bg-yellow-200 text-black text-sm"
                    >
                      <FaSearch className="mr-1 h-3 w-3" />
                      Search & Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        addViewer();
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-black text-sm"
                    >
                      <FaPlus className="mr-1 h-3 w-3" />
                      Add Manually
                    </Button>
                  </div>
                </div>

                {showViewerSearch && (
                  <div className="border rounded-lg p-4 bg-yellow-50">
                    <div className="space-y-3">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Search viewers by name or email..."
                          className="pl-10 pr-4 py-2 w-full"
                          value={employeeSearchTerm}
                          onChange={(e) => {
                            setEmployeeSearchTerm(e.target.value);
                            searchEmployees(e.target.value);
                          }}
                        />
                      </div>

                      {isLoadingUsers && (
                        <div className="flex items-center justify-center py-4">
                          <FaSpinner className="animate-spin h-5 w-5 text-purple-600 mr-2" />
                          <span className="text-sm text-gray-600">Loading users...</span>
                        </div>
                      )}

                      {employeeSearchTerm && employeeSearchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                          {employeeSearchResults.map((viewer, index) => (
                            <div
                              key={viewer.id || index}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                addViewerFromSearch(viewer);
                                setShowViewerSearch(false);
                                setEmployeeSearchTerm('');
                                setEmployeeSearchResults([]);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {viewer.name || viewer.email}
                                    {viewer.isManualEntry && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Manual Entry</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">{viewer.email}</div>
                                  {viewer.department && (
                                    <div className="text-xs text-gray-500">{viewer.department} • {viewer.role}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {employeeSearchTerm && employeeSearchResults.length === 0 && !isLoadingUsers && (
                        <div className="text-center py-4 text-gray-500">
                          No users found for "{employeeSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editData.viewers.map((viewer, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input placeholder="Name" value={viewer.name} onChange={e => handleViewerChange(idx, 'name', e.target.value)} />
                    <Input placeholder="Email" value={viewer.email} onChange={e => handleViewerChange(idx, 'email', e.target.value)} />
                    <Input
                      placeholder="Added by"
                      value={viewer.addedBy || currentUser?.name || currentUser?.email || 'Current User'}
                      disabled
                      className="bg-gray-100 text-gray-600"
                    />
                    <Button variant="destructive" size="sm" type="button" onClick={(e) => {
                      e.preventDefault();
                      removeViewer(idx);
                    }}>Remove</Button>
                  </div>
                ))}
              </div>
              
              {/* Project Visibility */}
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visibleToAll"
                    checked={editData.visibleToAll}
                    onCheckedChange={(checked) => setEditData({ ...editData, visibleToAll: !!checked })}
                  />
                  <FormLabel htmlFor="visibleToAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Make Visible to All Employees (Recommended)
                  </FormLabel>
                </div>
                <p className="text-xs text-gray-500 pl-6 mt-1">
                  When enabled, all employees will have view access to this project.
                  Top management will still have edit access regardless of this setting.
                </p>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="border-gray-300 text-gray-700"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsEditing(false);
                    }} 
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={async () => {
                      // Show loading state
                      toast.loading('Saving project...');
                      
                      try {
                        // Format the data for API
                        const formattedData = {
                          ...editData,
                          employee_contributions: editData.employees.map(e => {
                            // Handle tasks safely
                            const tasks = typeof e.tasks === 'string' && e.tasks.trim() !== '' ? 
                                        e.tasks.split(',').map(t => t.trim()) : [];
                            
                            return {
                              employee_id: e.email,
                              name: e.name,
                              email: e.email,
                              department: e.department,
                              role: e.role,
                              hours_per_week: Number(e.hours),
                              start_date: new Date(),
                              active: true,
                              tasks: tasks,
                              tools_used: e.tools_used ? e.tools_used.split(',').map(t => t.trim()) : [],
                              project_title: editData.project_title
                            };
                          }),
                          viewers: editData.viewers,
                          tech_stack: editData.tech_stack,
                          total_hours: Number(editData.total_hours),
                          total_budget: Number(editData.total_budget),
                          start_date: editData.start_date,
                          end_date: editData.end_date,
                          priority: editData.priority,
                          visibleToAll: editData.visibleToAll,
                          linkedProjects: linkedProjects
                        };
                        
                        // Update the project on the server
                        await handleUpdateProject(formattedData);
                        
                        // Dismiss the loading toast
                        toast.dismiss();
                      } catch (error) {
                        // Dismiss the loading toast
                        toast.dismiss();
                        
                        // Show error message
                        toast.error('Failed to save project: ' + (error instanceof Error ? error.message : 'Unknown error'));
                      }
                    }}
                  >
                    Save Project
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center text-purple-600 hover:text-purple-800"
        >
          <FaArrowLeft className="mr-2" />
          Back to Projects
        </button>
        
        {canEdit && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
              disabled={!canEdit}
            >
              <FaEdit className="w-4 h-4 mr-2" />
              Edit Project
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowUpdateModal(true)}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <FaCommentDots className="w-4 h-4 mr-2" />
              Update
            </Button>

            {canEdit && (
              <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <FaTrash className="w-4 h-4 mr-2" />
                    Delete Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">Delete Project</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Are you sure you want to delete this project? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteProject();
                        setDeleteConfirmOpen(false);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          {/* Project Title and Status Section */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 overflow-hidden">
              <h1 className="text-3xl font-bold text-gray-900 break-words">
                {project?.project_title || project?.name || 'Project Details'}
              </h1>
              
              {/* Add Management badge if applicable */}
              {(project?.isManagementProject || 
                ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(project?.createdByRole)) && (
                  <Badge className="bg-purple-100 text-purple-800 text-sm mt-2 inline-flex">
                    Management
                  </Badge>
                )}
            </div>
            
            <div className="flex-shrink-0">
              <div className="flex flex-col items-end gap-2">
                <Badge className={statusStyles[normalizedStatus] || 'bg-gray-100 text-gray-800'}>
                  {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).replace('-', ' ')}
                </Badge>
                
                <Badge className={priorityStyles[normalizedPriority] || 'bg-gray-100 text-gray-800'}>
                  {normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1)} Priority
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-2">Description</h2>
              <p className="text-gray-600 whitespace-pre-line">{project.project_description}</p>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-2">Linked Projects</h2>
              <div className="space-y-2">
                {project?.linkedProjects && project.linkedProjects.length > 0 ? (
                  project.linkedProjects.map((lp) => (
                    <div key={lp.id}>
                      <a href={`/dashboard/projects/${lp.id}`} className="text-blue-600 hover:underline">
                        {lp.title}
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No linked projects</p>
                )}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-2">Tech Stack</h2>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(project.tech_stack)
                  ? project.tech_stack.map((tech, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm">
                        {tech}
                      </span>
                    ))
                  : null}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-2">Team Members</h2>
              <div className="space-y-3">
                {project.employee_contributions?.map((contribution, index) => (
                  <div key={index} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                        <FaUser />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contribution.name || contribution.employee_id}</p>
                        {contribution.email && <p className="text-sm text-gray-800">{contribution.email}</p>}
                        {contribution.role && <p className="text-sm text-gray-700">{contribution.role}</p>}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-800">
                      <FaClock className="mr-1" />
                      {contribution.hours_per_week} hours/week
                    </div>
                  </div>
                ))}
                
                {/* List project.employees without contributions */}

                
                {(!project.employee_contributions || project.employee_contributions.length === 0) && project.employees?.length === 0 && (
                  <p className="text-gray-500 italic">No team members assigned to this project.</p>
                )}
              </div>
            </div>
            
            {/* Viewers section */}
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-800 mb-2">Project Viewers</h2>
              <div className="space-y-3">
                {project.viewers?.map((viewer: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-md shadow-sm">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mr-3">
                        <FaUser />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">{viewer.name}</p>
                        <p className="text-sm text-gray-600">{viewer.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!project.viewers || project.viewers.length === 0) && (
                  <p className="text-gray-500 italic">No viewers added to this project.</p>
                )}
              </div>
            </div>

            {/* Project Updates Timeline */}
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Project Updates Timeline
              </h2>
              <div className="space-y-4">
                {projectUpdates && projectUpdates.length > 0 ? (
                  projectUpdates.map((update: any, index: number) => (
                    <div key={update._id || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start space-x-3">
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {update.author_name || 'Unknown User'}
                              </span>
                              <span className="text-sm text-gray-500">posted an update</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(update.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap break-words">
                            {update.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaCommentDots className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No updates yet</p>
                    <p className="text-gray-500">
                      Project updates will appear here when team members post progress reports.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Project Details</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Department</p>
                  <p className="text-gray-900">{project.department}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Timeline</p>
                  <p className="text-gray-900">
                    {new Date(project.start_date).toLocaleDateString()} - 
                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Estimated Hours</p>
                  <p className="text-gray-900">{project.total_hours}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Active Contributors</p>
                  <p className="text-gray-900">
                    {project.employee_contributions?.filter(c => c.active).length || 0}
                  </p>
                </div>
              </div>
            </div>
            
            {(project.complexity_score || project.impact_score || project.risk_level) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h2 className="text-lg font-medium text-gray-800 mb-3">Analytics</h2>
                
                <div className="space-y-3">
                  {project.complexity_score !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Complexity Score</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${project.complexity_score}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">{project.complexity_score}/100</p>
                    </div>
                  )}
                  
                  {project.impact_score !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Impact Score</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ width: `${project.impact_score}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">{project.impact_score}/100</p>
                    </div>
                  )}
                  
                  {project.risk_level && (
                    <div>
                      <p className="text-sm text-gray-500">Risk Level</p>
                      <p className={`font-medium ${
                        project.risk_level === 'High' ? 'text-red-600' :
                        project.risk_level === 'Medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {project.risk_level}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Post Project Update</DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Write a comprehensive update about this project in one detailed paragraph.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="update-text" className="text-base font-semibold text-gray-800 mb-3 block">
                Project Update
              </Label>
              <div className="text-sm text-gray-600 mb-3">
                <p>Write a comprehensive update covering progress, challenges, achievements, next steps, and any important information the team should know.</p>
              </div>
              <Textarea
                id="update-text"
                placeholder="Write a comprehensive project update in one detailed paragraph. Include progress made, current status, any challenges and how they're being addressed, team highlights, upcoming priorities, and any other important information the team should know..."
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                className="mt-2 min-h-[200px] text-base"
                disabled={isSubmittingUpdate}
              />
              <div className="mt-2 text-sm text-gray-500">
                {updateText.length}/2000 characters
              </div>
            </div>

            {/* Recent Updates */}
            {projectUpdates.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Updates</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {projectUpdates.slice(0, 3).map((update, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {update.author_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(update.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{update.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUpdateModal(false);
                setUpdateText('');
              }}
              disabled={isSubmittingUpdate}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpdate}
              disabled={!updateText.trim() || isSubmittingUpdate || updateText.length > 2000}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
            >
              {isSubmittingUpdate ? (
                <>
                  <FaSpinner className="animate-spin mr-2 h-4 w-4 text-purple-600" />
                  Posting Update...
                </>
              ) : (
                'Post Project Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add space between project details box and footer */}
      <div className="mb-96"></div>
    </div>
  );
}