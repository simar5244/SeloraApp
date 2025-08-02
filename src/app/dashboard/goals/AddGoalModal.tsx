import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { FaPlus, FaMinus, FaUser, FaSearch, FaSpinner, FaTrash } from 'react-icons/fa';
import { Target, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AddGoalModalProps {
  onAddGoal: (goal: any) => Promise<{ success: boolean; error?: string; goalId?: string }>;
  onCancel?: () => void;
}

type Employee = {
  id?: string;
  employeeId?: string;
  name: string;
  email: string;
  department: string;
  role: string;
  tasks: string;
  hours: string;
  toolsUsed: string;
  addedBy?: string;
  isLead?: boolean;
};

type Viewer = {
  id?: string;
  employeeId?: string;
  name: string;
  email: string;
  addedBy?: string;
};

type GoalData = {
  title: string;
  description: string;
  department: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  employees: Employee[];
  viewers: Viewer[];
  visibleToAll?: boolean;
  kpis?: KpiEditor[];
  [key: string]: any; // For other dynamic properties
};

type KpiEditor = {
  name: string;
  description: string;
  target: string | number;
  current?: string | number;
  unit: string;
  dueDate?: string;
};

type ProjectEditor = {
  projectId: string;
  title: string;
  description?: string;
  isNewProject?: boolean;
};

type EmployeeEditor = { 
  employeeId: string;
  name: string; 
  email: string; 
  role: string;
};

interface ProjectFormData {
  title: string;
  description: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedEmployees: Array<{ employeeId: string; name: string; email: string }>;
  visibleToAll: boolean;
}

const AddGoalModal = ({ onAddGoal, onCancel }: AddGoalModalProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const [goalData, setGoalData] = useState<GoalData>({
    title: '',
    description: '',
    department: '',
    status: 'not_started',
    priority: 'medium',
    startDate: '',
    endDate: '',
    employees: [],
    viewers: [],
    visibleToAll: true,
    kpis: []
  });
  
  // State managed by parent component
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);

  // Employee search states - using user-management pattern
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Viewer search states
  const [viewerSearchTerm, setViewerSearchTerm] = useState('');
  const [viewerSearchResults, setViewerSearchResults] = useState<any[]>([]);
  const [isSearchingViewers, setIsSearchingViewers] = useState(false);
  const [showViewerSearch, setShowViewerSearch] = useState(false);

  // Project-related state
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectSearchResults, setProjectSearchResults] = useState<any[]>([]);
  const [isSearchingProjects, setIsSearchingProjects] = useState(false);
  const [topProjects, setTopProjects] = useState<any[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState<any>({});
  const [goalProjects, setGoalProjects] = useState<ProjectEditor[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');

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

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      try {
        // Load all users for search
        await loadAllUsers();

        // Determine current user from localStorage or API
        const storedUser = localStorage.getItem('user');
        let user: any = storedUser ? JSON.parse(storedUser) : {};
        try {
          const token = localStorage.getItem('token');
          const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (meRes.ok) {
            const meJson = await meRes.json();
            user = meJson.user || meJson;
          }
        } catch {
          console.warn('Auth/me endpoint unavailable, using localStorage user');
        }
        
        setCurrentUser(user);
        // Cache companyCode for API calls
        if (user.companyCode) {
          localStorage.setItem('companyCode', user.companyCode);
        } else if ((user as any).company_code) {
          localStorage.setItem('companyCode', (user as any).company_code);
        }
        
        // Determine if user is admin or top management
        const roleLower = (user.role || '').toLowerCase();
        const isPrivileged = roleLower === 'admin' || roleLower.startsWith('top_management');
        setIsPrivilegedUser(isPrivileged);
        
      } catch (e) {
        console.error('Error loading user data:', e);
        toast.error('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    }

    async function loadProjectsList() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/projects?limit=10', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProjectsList(data.projects || []);
        }
      } catch (error) {
        console.error('Error loading projects list:', error);
      }
    }

    loadUserData();
    loadTopProjects();
    loadProjectsList();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGoalData((prev: GoalData) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setGoalData((prev: GoalData) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (field: string, value: boolean) => {
    setGoalData((prev: GoalData) => ({
      ...prev,
      [field]: value
    }));
    console.log(`Set ${field} to ${value}`);
  };

  // KPI management functions
  const addKpi = () => {
    setGoalData((prev: GoalData) => ({
      ...prev,
      kpis: [
        ...(prev.kpis || []), 
        { 
          name: '', 
          description: '', 
          target: 0, 
          current: 0, 
          unit: '',
          deadline: '',
          id: uuidv4()
        }
      ]
    }));
  };

  const removeKpi = (index: number) => {
    setGoalData((prev: GoalData) => ({
      ...prev,
      kpis: (prev.kpis || []).filter((_, i: number) => i !== index)
    }));
  };

  const handleKpiChange = (index: number, field: keyof KpiEditor, value: string | number) => {
    setGoalData((prev: GoalData) => {
      const updatedKpis = [...(prev.kpis || [])];
      updatedKpis[index] = { 
        ...updatedKpis[index], 
        [field]: field === 'target' || field === 'current' ? Number(value) : value 
      } as KpiEditor;
      return { ...prev, kpis: updatedKpis };
    });
  };

  // Project search and management functions
  const searchProjects = async (term: string) => {
    if (!term.trim()) {
      setProjectSearchResults([]);
      return;
    }

    setIsSearchingProjects(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/search?q=${encodeURIComponent(term)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProjectSearchResults(data.projects || []);
      }
    } catch (error) {
      console.error('Error searching projects:', error);
    } finally {
      setIsSearchingProjects(false);
    }
  };

  const loadTopProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTopProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading top projects:', error);
    }
  };

  const addProjectToGoal = (project: any) => {
    const projectEditor: ProjectEditor = {
      projectId: project.id || project._id,
      title: project.title || project.project_title,
      description: project.description || project.project_description,
      isNewProject: false
    };

    if (!goalProjects.find(p => p.projectId === projectEditor.projectId)) {
      setGoalProjects(prev => [...prev, projectEditor]);
    }
  };

  const handleAssignExistingProject = (projectId: string) => {
    try {
      const project = projectsList.find(p => p.id === projectId || p._id === projectId);
      
      if (project) {
        addProjectToGoal(project);
        setShowAssignProject(false);
        setProjectSearchTerm('');
        toast.success('Project added to goal');
      } else {
        toast.error('Project not found');
      }
    } catch (error) {
      console.error('Error assigning project:', error);
      toast.error('Failed to assign project');
    }
  };

  const removeProjectFromGoal = (projectId: string) => {
    setGoalProjects(prev => prev.filter(p => p.projectId !== projectId));
  };

  const createProjectForGoal = async () => {
    if (!newProjectData?.title) {
      toast.error('Project title is required');
      return;
    }

    try {
      // Get current user info for project creation
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      // Ensure current user is included as a member if they're creating the project
      const projectMembers = [...(newProjectData.assignedEmployees || [])];
      if (currentUser && !projectMembers.find(m => m.email === currentUser.email)) {
        projectMembers.push({
          employeeId: currentUser.id || currentUser._id,
          name: currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`.trim(),
          email: currentUser.email,
          role: 'member'
        });
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          project_title: newProjectData.title,
          title: newProjectData.title,
          project_description: newProjectData.description || '',
          description: newProjectData.description || '',
          start_date: newProjectData.startDate || new Date().toISOString().split('T')[0],
          startDate: newProjectData.startDate || new Date().toISOString().split('T')[0],
          end_date: newProjectData.endDate || '',
          endDate: newProjectData.endDate || '',
          total_budget: newProjectData.budget || 0,
          budget: newProjectData.budget || 0,
          assignedEmployees: projectMembers,
          assigned_employees: projectMembers,
          team_members: projectMembers.map(m => ({
            user_id: m.employeeId,
            name: m.name,
            email: m.email,
            role: m.role || 'member',
            permissions: ['view', 'edit', 'comment'], // Give full project permissions
            joinedAt: new Date().toISOString()
          })),
          project_permissions: projectMembers.reduce((acc: any, m: any) => {
            acc[m.email] = {
              role: m.role || 'member',
              permissions: ['view', 'edit', 'comment', 'manage_tasks'],
              canEdit: true,
              canDelete: m.role === 'lead' || currentUser?.email === m.email,
              assignedAt: new Date().toISOString()
            };
            return acc;
          }, {}),
          visibleToAll: newProjectData.visibleToAll || false,
          status: newProjectData.status || 'planning',
          priority: newProjectData.priority || 'medium',
          department: goalData.department || '',
          createdBy: currentUser?.email || '',
          createdByRole: currentUser?.role || '',
          companyCode: currentUser?.companyCode || '',
          createdFromGoal: true,
          linkedToGoal: true,
          goalContext: {
            goalId: 'pending', // Will be updated when goal is created
            goalTitle: goalData.title || 'New Goal'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newProject: ProjectEditor = {
          projectId: result.projectId || result.id || result._id,
          title: newProjectData.title,
          description: newProjectData.description,
          isNewProject: true
        };

        // Add to goal projects
        setGoalProjects(prev => [...prev, newProject]);

        // Reset form and hide create form
        setNewProjectData({});
        setShowCreateProject(false);

        toast.success('Project created and assigned to KPI successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  // Employee search and management
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

  const addEmployee = () => setGoalData(prev => ({ ...prev, employees: [...prev.employees, { name:'',email:'',department:'',role:'',tasks:'',hours:'',toolsUsed:'' }] }));
  const removeEmployee = (i: number) => setGoalData(prev => { const emps=[...prev.employees]; emps.splice(i,1); return { ...prev, employees: emps }; });
  const handleEmployeeChange = (i: number, field: string, value: any) => setGoalData(prev => { const emps = [...prev.employees]; emps[i] = { ...emps[i], [field]: value }; return { ...prev, employees: emps }; });

  const addEmployeeFromSearch = (employee: any) => {
    // Check if already added
    if (goalData.employees.some(emp => emp.email === employee.email)) {
      toast.error('User already added as team member');
      return;
    }

    setGoalData(prev => ({
      ...prev,
      employees: [...prev.employees, {
        name: employee.name || `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
        department: employee.department || '',
        role: employee.role || 'Team Member',
        tasks: '',
        hours: '',
        toolsUsed: '',
        addedBy: currentUser?.name || currentUser?.email || 'Current User'
      }]
    }));

    toast.success(`${employee.name || employee.email} added as team member`);
  };

  // Viewer search and management
  const addMember = () => setGoalData(prev => ({ ...prev, viewers: [...prev.viewers, { name: '', email: '' }] }));
  const removeMember = (i: number) => setGoalData(prev => { const m = [...prev.viewers]; m.splice(i,1); return { ...prev, viewers: m }; });
  const handleMemberChange = (i: number, field: 'name' | 'email', value: string) => setGoalData(prev => { const m = [...prev.viewers]; m[i] = { ...m[i], [field]: value }; return { ...prev, viewers: m }; });

  const addViewerFromSearch = (viewer: any) => {
    // Check if already added
    if (goalData.viewers.some(v => v.email === viewer.email)) {
      toast.error('User already added as viewer');
      return;
    }

    // Check if already assigned as employee
    if (goalData.employees.some(emp => emp.email === viewer.email)) {
      toast.error('User is already assigned as team member');
      return;
    }

    setGoalData(prev => ({
      ...prev,
      viewers: [...prev.viewers, {
        name: viewer.name || `${viewer.firstName} ${viewer.lastName}`.trim(),
        email: viewer.email,
        addedBy: currentUser?.name || currentUser?.email || 'Current User'
      }]
    }));

    toast.success(`${viewer.name || viewer.email} added as viewer`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        toast.error('Authentication required. Please log in again.');
        setSubmitting(false);
        return;
      }
      
      // Validate required fields
      if (!goalData.title.trim()) {
        toast.error('Goal title is required');
        setSubmitting(false);
        return;
      }
      
      if (!goalData.description.trim()) {
        toast.error('Goal description is required');
        setSubmitting(false);
        return;
      }
      
      if (!goalData.department.trim()) {
        toast.error('Department is required');
        setSubmitting(false);
        return;
      }
      
      if (!goalData.startDate) {
        toast.error('Start date is required');
        setSubmitting(false);
        return;
      }
      
      if (!goalData.endDate) {
        toast.error('End date is required');
        setSubmitting(false);
        return;
      }

      // Format projects data and ensure projectId is a string
      console.log('Formatting projects for goal submission:', goalProjects);
      const formattedProjects = (goalProjects || []).map((project: any) => {
        // Ensure projectId is a string and handle different possible formats
        let projectId = project.projectId || project._id || project.id;
        
        if (!projectId) {
          console.error('Project missing ID:', project);
          throw new Error('One or more projects are missing a valid ID');
        }
        
        // Convert to string if it's an ObjectId
        if (typeof projectId === 'object' && projectId) {
          projectId = projectId._id || projectId.id || projectId.toString();
          console.log('Converted project ID:', { original: project.projectId, converted: projectId });
        }
        
        const formattedProject = {
          projectId: projectId,
          title: project.title || project.project_title,
          description: project.description || project.project_description,
          isNewProject: project.isNewProject || false,
          assignedAt: new Date().toISOString(),
          assignedBy: currentUser?.id || 'system'
        };
        
        console.log('Formatted project:', formattedProject);
        return formattedProject;
      });
      
      console.log('Formatted projects:', formattedProjects);

      // Prepare the base goal data
      const formattedData = {
        ...goalData,
        startDate: goalData.startDate ? new Date(goalData.startDate).toISOString() : '',
        endDate: goalData.endDate ? new Date(goalData.endDate).toISOString() : '',
        visibleToAll: goalData.visibleToAll || false,
        
        // Format KPIs
        kpis: (goalData.kpis || []).map((kpi: KpiEditor) => ({
          name: kpi.name,
          description: kpi.description,
          target: Number(kpi.target) || 0,
          current: Number(kpi.current) || 0,
          unit: kpi.unit || '',
          dueDate: kpi.dueDate || ''
        })),
        
        // Format assigned employees
        assignedEmployees: (goalData.employees || []).map((emp: Employee) => ({
          employeeId: emp.employeeId || emp.id || `manual-${emp.email}`,
          email: emp.email,
          name: emp.name,
          role: emp.role || ''
        })),
        
        // Format viewers
        viewers: (goalData.viewers || []).map((viewer: Viewer) => ({
          employeeId: viewer.employeeId || viewer.id || `manual-${viewer.email}`,
          email: viewer.email,
          name: viewer.name
        })),
        
        // Add assigned projects with proper format for the API
        assignedProjects: formattedProjects.map(project => ({
          projectId: project.projectId,
          assignedAt: project.assignedAt,
          assignedBy: project.assignedBy
        }))
      };
      
      console.log('Submitting goal with projects:', JSON.stringify({
        ...formattedData,
        // Don't log the entire projects array to keep logs clean
        assignedProjects: `[${formattedData.assignedProjects.length} projects]`
      }, null, 2));

      // Submit the goal with all data including projects
      const result = await onAddGoal(formattedData);
      
      if (result && result.success && result.goalId) {
        const goalId = result.goalId;
        console.log(`Goal created with ID: ${goalId}`);
        
        // Process project linking after goal creation
        if (formattedProjects.length > 0) {
          const companyCode = currentUser?.companyCode || (currentUser as any)?.company_code || localStorage.getItem('companyCode');
          if (!companyCode) {
            console.error('Company code not found in localStorage');
            toast.error('Company code required for project linking');
            setSubmitting(false);
            return;
          }
          
          const queryString = `?companyCode=${encodeURIComponent(companyCode)}`;
          let hasErrors = false;
          
          // Process each project
          for (const project of formattedProjects) {
            try {
              // 1. Update project with goal context
              const projectId = project.projectId;
              const projectUpdateResponse = await fetch(`/api/projects${queryString}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  projectId: projectId,
                  linkedToGoal: true,
                  goalContext: {
                    goalId: goalId,
                    goalTitle: formattedData.title
                  },
                  createdFromGoal: project.isNewProject ? goalId : undefined
                })
              });
              
              if (!projectUpdateResponse.ok) {
                const errorData = await projectUpdateResponse.json().catch(() => ({}));
                console.error(`Failed to update project ${projectId}:`, {
                  status: projectUpdateResponse.status,
                  statusText: projectUpdateResponse.statusText,
                  error: errorData
                });
                hasErrors = true;
                continue;
              }
              
              console.log(`Updated project ${projectId} with goal context`);
              
              // Assignment of projects is handled by the createGoal API; skipping POST assignment
              
              console.log(`Successfully linked project ${projectId} to goal ${goalId}`);
            } catch (error) {
              console.error(`Error processing project for goal ${goalId}:`, error);
              hasErrors = true;
              // Continue with next project even if one fails
            }
          }
          
          if (hasErrors) {
            toast('Goal created, but there were issues linking some projects', { icon: '⚠️' });
          } else {
            toast.success('Goal created and projects linked successfully!');
          }
          
          router.push(`/dashboard/goals/${goalId}`);
        } else {
          // No projects to link, just redirect
          toast.success('Goal created successfully!');
          router.push(`/dashboard/goals/${goalId}`);
        }
      } else {
        toast.error(result?.error || 'Failed to create goal');
      }
    } catch (error) {
      console.error('Error submitting goal:', error);
      toast.error('Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <FaSpinner className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white text-black space-y-6 w-full">
      {/* Basic Goal Info - Matching Create Project Page */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="basic-goal-fields">
        <div>
          <Label htmlFor="title">Goal Title</Label>
          <Input
            id="title"
            name="title"
            autoComplete="off"
            value={goalData.title}
            onChange={handleChange}
            placeholder="Goal title"
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            autoComplete="off"
            value={goalData.department}
            onChange={handleChange}
            placeholder="Enter department"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          autoComplete="off"
          value={goalData.description}
          onChange={handleChange}
          placeholder="Describe the goal objectives and expected outcomes"
          rows={4}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select name="status" value={goalData.status} onValueChange={(v) => handleSelectChange('status', v)}>
            <SelectTrigger id="status" className="text-gray-900 bg-white">
              <SelectValue placeholder="Select status" className="text-gray-900" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="planning" className="text-gray-900">Planning</SelectItem>
              <SelectItem value="active" className="text-gray-900">Active</SelectItem>
              <SelectItem value="on-hold" className="text-gray-900">On Hold</SelectItem>
              <SelectItem value="completed" className="text-gray-900">Completed</SelectItem>
              <SelectItem value="canceled" className="text-gray-900">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" value={goalData.priority} onValueChange={(v) => handleSelectChange('priority', v)}>
            <SelectTrigger id="priority" className="text-gray-900 bg-white">
              <SelectValue placeholder="Select priority" className="text-gray-900" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="low" className="text-gray-900">Low</SelectItem>
              <SelectItem value="medium" className="text-gray-900">Medium</SelectItem>
              <SelectItem value="high" className="text-gray-900">High</SelectItem>
              <SelectItem value="critical" className="text-gray-900">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            autoComplete="off"
            value={goalData.startDate}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            autoComplete="off"
            value={goalData.endDate}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* KPIs Section */}
      <div className="space-y-4 border-t pt-4" data-tour="kpi-section">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center">
            <Target className="mr-2 h-4 w-4" />
            Key Performance Indicators (KPIs)
          </Label>
          <Button type="button" onClick={addKpi} size="sm" variant="outline">
            <FaPlus className="mr-2" />
            Add KPI
          </Button>
        </div>
        
        {goalData.kpis?.map((kpi, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">KPI #{index + 1}</h4>
              <Button 
                type="button" 
                onClick={() => removeKpi(index)} 
                size="sm" 
                variant="destructive"
              >
                <FaMinus />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>KPI Name</Label>
                <Input
                  value={kpi.name}
                  onChange={(e) => handleKpiChange(index, 'name', e.target.value)}
                  placeholder="e.g., Revenue Growth"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={kpi.unit}
                  onChange={(e) => handleKpiChange(index, 'unit', e.target.value)}
                  placeholder="e.g., %, $, units"
                />
              </div>
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={kpi.target}
                  onChange={(e) => handleKpiChange(index, 'target', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={kpi.dueDate}
                  onChange={(e) => handleKpiChange(index, 'dueDate', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={kpi.description}
                  onChange={(e) => handleKpiChange(index, 'description', e.target.value)}
                  placeholder="Describe this KPI..."
                  rows={2}
                />
              </div>
            </div>


          </div>
        ))}
      </div>

      {/* Linked Projects Selection */}
      <div className="space-y-2 border-t pt-4" data-tour="linked-projects">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showLink"
            checked={showLink}
            onCheckedChange={(checked) => setShowLink(!!checked)}
          />
          <Label htmlFor="showLink" className="text-sm font-medium leading-none">
            Link this goal to projects
          </Label>
        </div>

        {showLink && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm text-black">Linked Projects</Label>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  if (selectedProjectId) {
                    const selectedProject = projectsList.find(p => p.id === selectedProjectId);
                    if (selectedProject && !goalProjects.some(gp => gp.projectId === selectedProjectId)) {
                      const projectEditor: ProjectEditor = {
                        projectId: selectedProjectId,
                        title: selectedProject.project_title || selectedProject.name || 'Unnamed Project',
                        description: selectedProject.description || selectedProject.project_description,
                        isNewProject: false
                      };
                      setGoalProjects(prev => [...prev, projectEditor]);
                      setSelectedProjectId('');
                    }
                  }
                }}
                className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
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
                  <SelectValue placeholder="Select a project to link" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {/* Search Input in Dropdown */}
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => {
                        setProjectSearchTerm(e.target.value);
                        searchProjects(e.target.value);
                      }}
                      className="text-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Recent Projects (when no search) */}
                  {!projectSearchTerm && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-500 font-medium">Recent Projects</div>
                      {projectsList
                        .filter(p => {
                          // Skip if no ID or title
                          if (!p.id || !(p.project_title || p.name)) return false;

                          // Only show if not already linked
                          return !goalProjects.some(gp => gp.projectId === p.id);
                        })
                        .map(p => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-black hover:bg-gray-100"
                          >
                            {p.project_title || p.name || 'Unnamed Project'}
                          </SelectItem>
                        ))}
                    </>
                  )}

                  {/* Search Results */}
                  {projectSearchTerm && projectSearchResults.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-500 font-medium">Search Results</div>
                      {projectSearchResults
                        .filter(p => !goalProjects.some(gp => gp.projectId === p.id))
                        .map(p => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-black hover:bg-gray-100"
                          >
                            {p.project_title || p.title || 'Unnamed Project'}
                          </SelectItem>
                        ))}
                    </>
                  )}

                  {/* No results */}
                  {projectSearchTerm && projectSearchResults.length === 0 && !isSearchingProjects && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      No projects found
                    </div>
                  )}

                  {/* Loading */}
                  {isSearchingProjects && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      Searching...
                    </div>
                  )}

                  {/* No projects available when not searching */}
                  {!projectSearchTerm && projectsList.filter(p =>
                    p.id &&
                    (p.project_title || p.name) &&
                    !goalProjects.some(gp => gp.projectId === p.id)
                  ).length === 0 && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      No projects available to link
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Display selected linked projects */}
            <div className="space-y-2">
              {goalProjects.map((linkedProject, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-md">
                  <span className="text-sm text-black flex-1">{linkedProject.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Simply remove the project from the linked projects list
                      setGoalProjects((prev: Array<{projectId: string, title: string}>) => 
                        prev.filter((_, i) => i !== idx)
                      );
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                    aria-label="Unlink project"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </Button>
                </div>
              ))}

              {goalProjects.length === 0 && (
                <p className="text-sm text-gray-500 italic">No linked projects selected</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="space-y-4 border-t pt-4 mt-4" data-tour="projects-section">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Projects</Label>
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAssignProject(true)}
              className="text-xs"
            >
              <FaPlus className="mr-1 h-3 w-3" /> Assign Existing
            </Button>
          </div>
        </div>

        {/* Project Search */}
        {showAssignProject && (
          <div className="border rounded-md p-4 bg-white shadow-sm">
            <div className="mb-4">
              <Label htmlFor="project-search" className="text-sm font-medium mb-2">
                Search Projects
              </Label>
              <div className="flex">
                <Input
                  id="project-search"
                  value={projectSearchTerm}
                  onChange={(e) => {
                    setProjectSearchTerm(e.target.value);
                    searchProjects(e.target.value);
                  }}
                  placeholder="Search by project name..."
                  className="flex-1"
                />
              </div>
            </div>

            {isSearchingProjects ? (
              <div className="text-center py-4">
                <FaSpinner className="animate-spin h-5 w-5 mx-auto text-purple-600" />
                <p className="text-sm text-gray-500 mt-2">Searching projects...</p>
              </div>
            ) : projectSearchResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto border rounded-md">
                {projectSearchResults.map((project) => (
                  <div
                    key={project.id || project._id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleAssignExistingProject(project.id || project._id)}
                  >
                    <div className="font-medium">{project.title || project.project_title}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {project.description || project.project_description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {project.department || project.project_department} • {project.status || project.project_status}
                    </div>
                  </div>
                ))}
              </div>
            ) : projectSearchTerm ? (
              <div className="text-center py-4 text-gray-500">
                No projects found for "{projectSearchTerm}"
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Type to search for projects
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAssignProject(false);
                  setProjectSearchTerm('');
                  setProjectSearchResults([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Project List */}
        {goalProjects.length > 0 ? (
          <div className="space-y-2">
            {goalProjects.map((project, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                <div>
                  <div className="font-medium">{project.title}</div>
                  <div className="text-sm text-gray-600 truncate max-w-md">{project.description}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeProjectFromGoal(project.projectId)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <FaTrash className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 border border-dashed rounded-md">
            <p className="text-sm text-gray-500">No projects assigned to this goal yet</p>
          </div>
        )}
      </div>

      {/* Create New Project Section */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Need to create a new project?</Label>
          <Button
            type="button"
            onClick={() => setShowCreateProject(!showCreateProject)}
            size="sm"
            variant="outline"
            className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
          >
            <FaPlus className="mr-2" />
            Create Project
          </Button>
        </div>

        {/* Create New Project Form */}
        {showCreateProject && (
          <div className="mt-4 p-4 border rounded-lg bg-blue-50">
            <h5 className="font-medium mb-3">Create New Project</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Project Title</Label>
                <Input
                  value={newProjectData.title || ''}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  placeholder="Enter project title"
                />
              </div>
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  value={newProjectData.budget || ''}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    budget: Number(e.target.value)
                  }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newProjectData.startDate || ''}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newProjectData.endDate || ''}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={newProjectData.description || ''}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Project description..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={newProjectData.status || 'planning'}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    status: e.target.value as ProjectFormData['status']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  value={newProjectData.priority || 'medium'}
                  onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                    ...prev,
                    priority: e.target.value as ProjectFormData['priority']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Team Members (searchable or enter email)</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Search team members or enter email directly..."
                    value={employeeSearchTerm}
                    onChange={(e) => {
                      setEmployeeSearchTerm(e.target.value);
                      searchEmployees(e.target.value);
                    }}
                  />
                  {employeeSearchResults.length > 0 && (
                    <div className="border rounded-lg max-h-32 overflow-y-auto">
                      {employeeSearchResults.map((employee) => (
                        <div
                          key={employee.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            const currentMembers = newProjectData.assignedEmployees || [];
                            if (!currentMembers.find((m: { email: string }) => m.email === employee.email)) {
                              setNewProjectData((prev: ProjectFormData) => ({
                                ...prev,
                                assignedEmployees: [...currentMembers, {
                                  employeeId: employee.id || '',
                                  name: employee.name,
                                  email: employee.email
                                }]
                              }));
                            }
                            setEmployeeSearchTerm('');
                            setEmployeeSearchResults([]);
                          }}
                        >
                          <div className="font-medium text-sm">
                            {employee.name}
                            {employee.isManualEntry && <span className="ml-1 text-xs text-blue-600">(Email)</span>}
                          </div>
                          <div className="text-xs text-gray-500">{employee.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {newProjectData.assignedEmployees?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newProjectData.assignedEmployees.map((member: any, mIndex: number) => (
                        <div key={mIndex} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                          <span>{member.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedMembers = newProjectData.assignedEmployees.filter((_: unknown, i: number) => i !== mIndex);
                              setNewProjectData((prev: ProjectFormData) => ({
                                ...prev,
                                assignedEmployees: updatedMembers
                              }));
                            }}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="visibleToAll"
                    checked={newProjectData.visibleToAll || false}
                    onChange={(e) => setNewProjectData((prev: ProjectFormData) => ({
                      ...prev,
                      visibleToAll: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor="visibleToAll">Allow all to view this project</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateProject(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={createProjectForGoal}
                disabled={!newProjectData.title}
              >
                Create & Assign
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Employees Section */}
      <div className="space-y-4 border-t pt-4" data-tour="members-section">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Team Members</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowEmployeeSearch(!showEmployeeSearch)}
              className="text-black text-sm"
            >
              Search & Add
            </Button>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={addEmployee}
              className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
            >
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
        {goalData.employees.map((emp, idx) => (
          <div key={idx} className="border p-4 rounded-md space-y-3 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="font-medium">Employee {idx+1}</span>
              <Button variant="destructive" size="sm" type="button" onClick={() => removeEmployee(idx)}>Remove</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Name" value={emp.name} onChange={(e) => handleEmployeeChange(idx,'name',e.target.value)} />
              <Input placeholder="Email" value={emp.email} onChange={(e) => handleEmployeeChange(idx,'email',e.target.value)} />
              <Input placeholder="Department" value={emp.department} onChange={(e) => handleEmployeeChange(idx,'department',e.target.value)} />
              <Input placeholder="Role" value={emp.role} onChange={(e) => handleEmployeeChange(idx,'role',e.target.value)} />
              <Input
                placeholder="Added by"
                value={emp.addedBy || currentUser?.name || currentUser?.email || 'Current User'}
                disabled
                className="bg-gray-100 text-gray-600"
              />
              <div className="md:col-span-2">
                <Textarea placeholder="Specific Tasks (comma separated)" value={emp.tasks} onChange={(e) => handleEmployeeChange(idx,'tasks',e.target.value)} rows={2} />
              </div>
              <Input type="number" placeholder="Hours Worked" value={emp.hours} onChange={(e) => handleEmployeeChange(idx,'hours',e.target.value)} />
              <Input placeholder="Tools Used (comma separated)" value={emp.toolsUsed} onChange={(e) => handleEmployeeChange(idx,'toolsUsed',e.target.value)} />
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox
                  id={`isLead-${idx}`}
                  checked={emp.isLead || false}
                  onCheckedChange={(checked) => handleEmployeeChange(idx, 'isLead', !!checked)}
                />
                <Label htmlFor={`isLead-${idx}`} className="text-sm">
                  Is this person the lead of the goal?
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Members (association only) */}
      <div className="space-y-2 border-t pt-4" data-tour="viewers-section">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Viewers</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowViewerSearch(!showViewerSearch)}
              className="text-black text-sm"
            >
              Search & Add
            </Button>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={addMember}
              className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
            >
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

        {goalData.viewers.map((viewer, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <Input placeholder="Name" value={viewer.name} onChange={e => handleMemberChange(idx, 'name', e.target.value)} />
            <Input placeholder="Email" value={viewer.email} onChange={e => handleMemberChange(idx, 'email', e.target.value)} />
            <Input
              placeholder="Added by"
              value={viewer.addedBy || currentUser?.name || currentUser?.email || 'Current User'}
              disabled
              className="bg-gray-100 text-gray-600"
            />
            <Button variant="destructive" size="sm" type="button" onClick={() => removeMember(idx)}>Remove</Button>
          </div>
        ))}
      </div>

      {/* Visibility Settings */}
      <div className="space-y-4 border-t pt-4" data-tour="visibility-settings">
        <Label className="text-sm font-medium">Visibility Settings</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="visibleToAll"
            checked={goalData.visibleToAll}
            onCheckedChange={(checked) => handleCheckboxChange('visibleToAll', !!checked)}
          />
          <Label htmlFor="visibleToAll" className="text-sm">
            Make this goal visible to all company members
          </Label>
        </div>
        <p className="text-sm text-gray-600">
          If unchecked, only assigned employees, viewers, and management will be able to see this goal.
        </p>
      </div>

      {/* Submit Button - Matching Project Modal */}
      <div className="flex justify-between pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-900"
          >
            <ArrowLeft size={16} />
            Back to Goals
          </Button>
        )}
        <Button
          type="submit"
          size="default"
          disabled={submitting}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-6"
        >
          {submitting ? 'Creating...' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
};

export default AddGoalModal;