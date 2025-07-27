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
import { searchUsers } from './api';
import { FaPlus, FaMinus, FaUser, FaSearch } from 'react-icons/fa';
import { Target } from 'lucide-react';

interface AddGoalModalProps {
  onAddGoal: (goal: any) => Promise<{ success: boolean; error?: string; goalId?: string }>;
}

type KpiEditor = {
  name: string;
  description: string;
  target: number;
  unit: string;
  dueDate: string;
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

const AddGoalModal = ({ onAddGoal }: AddGoalModalProps) => {
  const router = useRouter();
  const [goalData, setGoalData] = useState({
    title: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    status: 'planning' as const,
    priority: 'medium' as const,
    visibleToAll: true,
    kpis: [] as KpiEditor[],
    assignedEmployees: [] as EmployeeEditor[],
    viewers: [] as EmployeeEditor[]
  });
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);

  // Employee search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);

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
  const [newProjectData, setNewProjectData] = useState<any>({});
  const [goalProjects, setGoalProjects] = useState<ProjectEditor[]>([]);

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      try {
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
    loadUserData();
    loadTopProjects();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGoalData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setGoalData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (field: string, value: boolean) => {
    setGoalData({
      ...goalData,
      [field]: value
    });
    console.log(`Set ${field} to ${value}`);
  };

  // KPI management functions
  const addKpi = () => {
    setGoalData(prev => ({
      ...prev,
      kpis: [...prev.kpis, { name: '', description: '', target: 0, unit: '', dueDate: '' }]
    }));
  };

  const removeKpi = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      kpis: prev.kpis.filter((_, i) => i !== index)
    }));
  };

  const handleKpiChange = (index: number, field: keyof KpiEditor, value: string | number) => {
    setGoalData(prev => {
      const kpis = [...prev.kpis];
      kpis[index] = { ...kpis[index], [field]: value };
      return { ...prev, kpis };
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
      const response = await fetch(`/api/projects/search?q=${encodeURIComponent(term)}`);
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
      const response = await fetch('/api/projects?limit=5');
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
  const searchEmployees = async (term: string) => {
    if (!term.trim()) {
      setEmployeeSearchResults([]);
      return;
    }

    setIsSearchingEmployees(true);
    try {
      // Check if it's an email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(term)) {
        // If it's an email, create a mock user entry
        setEmployeeSearchResults([{
          id: term,
          email: term,
          name: term.split('@')[0], // Use part before @ as name
          firstName: term.split('@')[0],
          lastName: '',
          isManualEntry: true
        }]);
      } else {
        // Search for users normally
        const results = await searchUsers(term);
        setEmployeeSearchResults(results || []);
      }
    } catch (error) {
      console.error('Error searching employees:', error);
      // If search fails, still allow manual email entry
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(term)) {
        setEmployeeSearchResults([{
          id: term,
          email: term,
          name: term.split('@')[0],
          firstName: term.split('@')[0],
          lastName: '',
          isManualEntry: true
        }]);
      } else {
        setEmployeeSearchResults([]);
      }
    } finally {
      setIsSearchingEmployees(false);
    }
  };

  const addEmployee = (employee: any) => {
    // Check if already added
    if (goalData.assignedEmployees.some(emp => emp.email === employee.email)) {
      toast.error('Employee already assigned');
      return;
    }

    setGoalData(prev => ({
      ...prev,
      assignedEmployees: [...prev.assignedEmployees, {
        employeeId: employee.id,
        name: employee.name || employee.firstName + ' ' + employee.lastName,
        email: employee.email,
        role: employee.role || 'Team Member'
      }]
    }));

    setEmployeeSearchTerm('');
    setEmployeeSearchResults([]);
    setShowEmployeeSearch(false);
    toast.success(`${employee.name || employee.email} assigned to goal`);
  };

  const removeEmployee = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.filter((_, i) => i !== index)
    }));
  };

  // Viewer search and management
  const searchViewers = async (term: string) => {
    if (term.length < 2) {
      setViewerSearchResults([]);
      return;
    }

    setIsSearchingViewers(true);
    try {
      const results = await searchUsers(term);
      setViewerSearchResults(results);
    } catch (error) {
      console.error('Error searching viewers:', error);
      toast.error('Failed to search viewers');
    } finally {
      setIsSearchingViewers(false);
    }
  };

  const addViewer = (viewer: any) => {
    // Check if already added
    if (goalData.viewers.some(v => v.email === viewer.email)) {
      toast.error('User already added as viewer');
      return;
    }

    // Check if already assigned as employee
    if (goalData.assignedEmployees.some(emp => emp.email === viewer.email)) {
      toast.error('User is already assigned as employee');
      return;
    }

    setGoalData(prev => ({
      ...prev,
      viewers: [...prev.viewers, {
        employeeId: viewer.id,
        name: viewer.name || viewer.firstName + ' ' + viewer.lastName,
        email: viewer.email,
        role: viewer.role || 'Viewer'
      }]
    }));

    setViewerSearchTerm('');
    setViewerSearchResults([]);
    setShowViewerSearch(false);
    toast.success(`${viewer.name || viewer.email} added as viewer`);
  };

  const removeViewer = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      viewers: prev.viewers.filter((_, i) => i !== index)
    }));
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

      // Prepare data for API
      const formattedData = {
        title: goalData.title,
        description: goalData.description,
        department: goalData.department,
        startDate: goalData.startDate,
        endDate: goalData.endDate,
        status: goalData.status,
        priority: goalData.priority,
        visibleToAll: goalData.visibleToAll,
        
        // Format KPIs
        kpis: goalData.kpis.map(kpi => ({
          name: kpi.name,
          description: kpi.description,
          target: Number(kpi.target),
          unit: kpi.unit,
          dueDate: kpi.dueDate
        })),

        // Format assigned projects
        assignedProjects: goalProjects.map(project => ({
          projectId: project.projectId,
          title: project.title,
          description: project.description,
          isNewProject: project.isNewProject
        })),
        
        // Format assigned employees
        assignedEmployees: goalData.assignedEmployees.map(emp => ({
          employeeId: emp.employeeId,
          email: emp.email,
          name: emp.name,
          role: emp.role
        })),
        
        // Format viewers
        viewers: goalData.viewers.map(viewer => ({
          employeeId: viewer.employeeId,
          email: viewer.email,
          name: viewer.name
        }))
      };

      // Check if current user is top management
      const isTopManagement = currentUser?.role && [
        'top_management_tier_1', 
        'top_management_tier_2', 
        'top_management_tier_3',
        'admin'
      ].includes(currentUser.role);
      
      // Get company code from multiple possible sources
      const companyCode = 
        currentUser?.companyCode || 
        currentUser?.company_code || 
        localStorage.getItem('companyCode');
      
      // Create submission data with necessary metadata
      const submissionData = {
        ...formattedData,
        creatorRole: currentUser?.role,
        creatorEmail: currentUser?.email,
        creatorName: currentUser?.name,
        companyCode: companyCode,
        isManagementGoal: isTopManagement,
        // Ensure visibleToAll is explicitly set (defaulting to true if not specified)
        visibleToAll: goalData.visibleToAll !== false,
      };
      
      console.log('Submitting goal data with company code:', submissionData.companyCode);
      
      const result = await onAddGoal(submissionData);
      if (result && result.success && result.goalId) {
        // Update any projects created within this goal to link back to the goal
        const goalId = result.goalId;
        for (const project of submissionData.assignedProjects || []) {
          if (project.isNewProject) {
            try {
              await fetch(`/api/projects/${project.projectId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  linkedToGoal: true,
                  goalContext: {
                    goalId: goalId,
                    goalTitle: submissionData.title
                  }
                })
              });
              console.log(`Linked project ${project.projectId} to goal ${goalId}`);
            } catch (error) {
              console.error('Error linking project to goal:', error);
            }
          }
        }

        toast.success('Goal created successfully!');
        router.push(`/dashboard/goals/${result.goalId}`);
        return;
      }
      toast.error(result?.error || 'Failed to create goal');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white text-black space-y-6 w-full">
      {/* Basic Goal Info - Matching Create Project Page */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold flex items-center">
            <Target className="mr-2 h-4 w-4" />
            Key Performance Indicators (KPIs)
          </Label>
          <Button type="button" onClick={addKpi} size="sm" variant="outline">
            <FaPlus className="mr-2" />
            Add KPI
          </Button>
        </div>
        
        {goalData.kpis.map((kpi, index) => (
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

      {/* Project Assignment Section */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold flex items-center">
            📋 Assigned Projects
          </Label>
          <Button
            type="button"
            onClick={() => setShowCreateProject(!showCreateProject)}
            size="sm"
            variant="outline"
          >
            <FaPlus className="mr-2" />
            Create Project
          </Button>
        </div>

        {/* Assigned Projects List */}
        {goalProjects.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {goalProjects.map((project, pIndex) => (
                <div key={pIndex} className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                  <button
                    type="button"
                    onClick={() => window.open(`/dashboard/projects/${project.projectId}`, '_blank')}
                    className="hover:underline cursor-pointer"
                    title="Click to view project details"
                  >
                    {project.title}
                  </button>
                  {project.isNewProject && <span className="ml-1 text-xs">(New)</span>}
                  <button
                    type="button"
                    onClick={() => removeProjectFromGoal(project.projectId)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                    title="Remove project from goal"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Search */}
        <div className="space-y-3">
          <div>
            <Input
              placeholder="Search existing projects..."
              value={projectSearchTerm}
              onChange={(e) => {
                setProjectSearchTerm(e.target.value);
                searchProjects(e.target.value);
              }}
            />
          </div>

          {/* Search Results */}
          {projectSearchResults.length > 0 && (
            <div className="border rounded-lg max-h-32 overflow-y-auto">
              {projectSearchResults.map((project) => (
                <div
                  key={project.id || project._id}
                  className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => addProjectToGoal(project)}
                >
                  <div className="font-medium text-sm">{project.title || project.project_title}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {project.description || project.project_description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top 5 Projects */}
          {!projectSearchTerm && topProjects.length > 0 && (
            <div>
              <Label className="text-sm text-gray-600">Top 5 Projects:</Label>
              <div className="border rounded-lg max-h-32 overflow-y-auto mt-1">
                {topProjects.map((project) => (
                  <div
                    key={project.id || project._id}
                    className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => addProjectToGoal(project)}
                  >
                    <div className="font-medium text-sm">{project.title || project.project_title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {project.description || project.project_description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  onChange={(e) => setNewProjectData(prev => ({
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
                  onChange={(e) => setNewProjectData(prev => ({
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
                  onChange={(e) => setNewProjectData(prev => ({
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
                  onChange={(e) => setNewProjectData(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={newProjectData.description || ''}
                  onChange={(e) => setNewProjectData(prev => ({
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
                  onChange={(e) => setNewProjectData(prev => ({
                    ...prev,
                    status: e.target.value
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
                  onChange={(e) => setNewProjectData(prev => ({
                    ...prev,
                    priority: e.target.value
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
                            if (!currentMembers.find((m: any) => m.email === employee.email)) {
                              setNewProjectData(prev => ({
                                ...prev,
                                assignedEmployees: [...currentMembers, {
                                  employeeId: employee.id,
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
                              const updatedMembers = newProjectData.assignedEmployees.filter((_: any, i: number) => i !== mIndex);
                              setNewProjectData(prev => ({
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
                    onChange={(e) => setNewProjectData(prev => ({
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

      {/* Assigned Employees Section */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold flex items-center">
            <FaUser className="mr-2" />
            Assigned Employees
          </Label>
          <Button 
            type="button" 
            onClick={() => setShowEmployeeSearch(!showEmployeeSearch)} 
            size="sm" 
            variant="outline"
          >
            <FaPlus className="mr-2" />
            Add Employee
          </Button>
        </div>

        {showEmployeeSearch && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center space-x-2">
              <FaSearch className="text-gray-500" />
              <Input
                placeholder="Search employees by name or email..."
                value={employeeSearchTerm}
                onChange={(e) => {
                  setEmployeeSearchTerm(e.target.value);
                  searchEmployees(e.target.value);
                }}
                className="flex-1"
              />
            </div>
            
            {isSearchingEmployees && (
              <div className="text-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            )}
            
            {employeeSearchResults.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto">
                {employeeSearchResults.map((employee) => (
                  <div 
                    key={employee.id}
                    className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                    onClick={() => addEmployee(employee)}
                  >
                    <div>
                      <div className="font-medium">{employee.name || `${employee.firstName} ${employee.lastName}`}</div>
                      <div className="text-sm text-gray-600">{employee.email}</div>
                    </div>
                    <Badge variant="outline">{employee.role || 'Employee'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {goalData.assignedEmployees.map((employee, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">{employee.name}</div>
                <div className="text-sm text-gray-600">{employee.email}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{employee.role}</Badge>
                <Button 
                  type="button" 
                  onClick={() => removeEmployee(index)} 
                  size="sm" 
                  variant="destructive"
                >
                  <FaMinus />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Viewers Section */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Viewers (View-only Access)</Label>
          <Button 
            type="button" 
            onClick={() => setShowViewerSearch(!showViewerSearch)} 
            size="sm" 
            variant="outline"
          >
            <FaPlus className="mr-2" />
            Add Viewer
          </Button>
        </div>

        {showViewerSearch && (
          <div className="border rounded-lg p-4 bg-yellow-50">
            <div className="flex items-center space-x-2">
              <FaSearch className="text-gray-500" />
              <Input
                placeholder="Search users by name or email..."
                value={viewerSearchTerm}
                onChange={(e) => {
                  setViewerSearchTerm(e.target.value);
                  searchViewers(e.target.value);
                }}
                className="flex-1"
              />
            </div>
            
            {isSearchingViewers && (
              <div className="text-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            )}
            
            {viewerSearchResults.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto">
                {viewerSearchResults.map((viewer) => (
                  <div 
                    key={viewer.id}
                    className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                    onClick={() => addViewer(viewer)}
                  >
                    <div>
                      <div className="font-medium">{viewer.name || `${viewer.firstName} ${viewer.lastName}`}</div>
                      <div className="text-sm text-gray-600">{viewer.email}</div>
                    </div>
                    <Badge variant="outline">{viewer.role || 'User'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {goalData.viewers.map((viewer, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <div className="font-medium">{viewer.name}</div>
                <div className="text-sm text-gray-600">{viewer.email}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Viewer</Badge>
                <Button 
                  type="button" 
                  onClick={() => removeViewer(index)} 
                  size="sm" 
                  variant="destructive"
                >
                  <FaMinus />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visibility Settings */}
      <div className="space-y-4 border-t pt-4">
        <Label className="text-lg font-semibold">Visibility Settings</Label>
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
      <div className="flex justify-end pt-4 border-t">
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