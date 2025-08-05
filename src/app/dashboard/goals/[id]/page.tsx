"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import {
  FaArrowLeft, FaEdit, FaProjectDiagram, FaPlus,
  FaTrash, FaEye, FaCalendarAlt, FaChartLine,
  FaSearch, FaTimes, FaSave, FaSpinner, FaComment, FaBuilding, FaRocket, FaCommentDots
} from 'react-icons/fa';
import { fetchGoals, updateGoal, deleteGoal, fetchGoalProjects, createProjectInGoal, assignProjectToGoal, removeProjectFromGoal, searchUsers } from '../api';
import { fetchProjects } from '../../projects/api';
import EmployeeSearchInput from '@/components/EmployeeSearchInput';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'canceled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  department: string;

  assignedEmployees: Array<{
    employeeId: string;
    name: string;
    email: string;
    role: string;
    assignedAt?: string;
  }>;
  assignedProjects: Array<{
    projectId: string;
    assignedAt: string;
    assignedBy?: string;
  }>;
  kpis: Array<{
    name: string;
    description: string;
    target: number;
    current: number;
    unit: string;
    dueDate: string;
  }>;
  viewers: Array<{
    employeeId: string;
    name: string;
    email: string;
  }>;
  createdByRole: string;
  isManagementGoal: boolean;
  visibleToAll: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
  };
}

interface Project {
  _id?: string;  // MongoDB ObjectId string

  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate?: string;
  department: string;
  employees: any[];
  total_budget: number;
  assignmentInfo?: {
    assignedAt: string;
    assignedBy: string;
  };
}

export default function GoalDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params?.id as string || '';

  const [goal, setGoal] = useState<Goal>({} as Goal);
  const [projects, setProjects] = useState<Project[]>([]);

  // Debug: log projects state to inspect object shape
  useEffect(() => {
    console.log('GoalDetailsPage projects state:', projects);
  }, [projects]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Goal>>({});

  // Employee search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);

  // Viewer search states
  const [viewerSearchTerm, setViewerSearchTerm] = useState('');
  const [viewerSearchResults, setViewerSearchResults] = useState<any[]>([]);
  const [showViewerSearch, setShowViewerSearch] = useState(false);

  // Project management states
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Delete goal confirmation dialog state
  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [createProjectData, setCreateProjectData] = useState({
    title: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    priority: 'medium',
    assignedEmployees: [] as any[]
  });



  // Update modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  // Removed single updateText state in favor of structured updateFields
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [goalUpdates, setGoalUpdates] = useState<any[]>([]);

  // KPI creation states
  const [showCreateKPI, setShowCreateKPI] = useState(false);
  const [createKPIData, setCreateKPIData] = useState({
    name: '',
    description: '',
    target: '',
    unit: '',
    dueDate: '',
    current: '0'
  });



  // Format update content to show sections with titles
  const formatUpdateContent = (content: string) => {
    const sections = content.split('\n\n');
    return sections.map((section, index) => {
      const [title, ...contentParts] = section.split(':');
      const content = contentParts.join(':').trim();
      
      if (!content) return null;
      
      return (
        <div key={index} className="mb-2">
          {content}
        </div>
      );
    });
  };

  // Load goal updates
  useEffect(() => {
    const loadGoalUpdates = async () => {
      if (!goalId) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/goals/${goalId}/updates`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setGoalUpdates(data.updates || []);
        }
      } catch (error) {
        console.error('Error loading goal updates:', error);
      }
    };

    loadGoalUpdates();
  }, [goalId]);

  useEffect(() => {
    if (goal) {
      setEditData({
        title: goal.title,
        description: goal.description,
        status: goal.status,
        priority: goal.priority,
        startDate: goal.startDate,
        endDate: goal.endDate,
        department: goal.department,
        visibleToAll: goal.visibleToAll
      });
    }
  }, [goal]);

  const loadGoalData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Add a cache-busting parameter if forcing refresh
      const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : '';
      
      // First, load the goal data
      const result = await fetchGoals();
      if (result.goals) {
        const foundGoal = result.goals.find((g: any) => g.id === goalId);
        if (foundGoal) {
          // Set the goal data
          setGoal(foundGoal);
          
          // Load projects linked to this goal by querying projects collection
          try {
            console.log(`Loading projects linked to goal ${goalId}`);
            
            // Use the correct API endpoint that handles assigned projects
            const projectsResult = await fetchGoalProjects(goalId);
            if (projectsResult.projects) {
              console.log('Assigned projects data:', projectsResult.projects);
              setProjects(projectsResult.projects);
            } else {
              console.log('No assigned projects found');
              setProjects([]);
            }
          } catch (error) {
            console.error('Error loading assigned projects:', error);
            setProjects([]); // Clear projects to avoid showing stale data
          }
        } else {
          toast.error('Goal not found');
          router.push('/dashboard/goals');
        }
      }
    } catch (error) {
      console.error('Error loading goal:', error);
      toast.error('Failed to load goal');
    } finally {
      setLoading(false);
    }
  }, [goalId, router]);

  const loadGoalProjects = useCallback(async () => {
    try {
      const result = await fetchGoalProjects(goalId);
      if (result.projects) {
        setProjects(result.projects);
      }
    } catch (error) {
      console.error('Error loading goal projects:', error);
    }
  }, [goalId]);

  const loadAllProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const result = await fetchProjects();
      if (result.projects) {
        setAllProjects(result.projects);
      }
    } catch (error) {
      console.error('Error loading all projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Load goal data when component mounts or goalId changes
  // Load all users for employee search
  const loadAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the same API endpoint as in AddGoalModal
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
      console.log('Loaded users:', data.users?.length || 0);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to empty array if loading fails
      setAllUsers([]);
    }
  };
  
  // Employee search function
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
  
  // Add employee to goal
  const addEmployeeToGoal = async (employee: any) => {
    // Check if already added
    if (goal.assignedEmployees?.some(emp => emp.email === employee.email)) {
      toast.error('User already added as team member');
      return;
    }
    
    const newEmployee = {
      employeeId: employee._id || employee.id || `manual-${employee.email}`,
      email: employee.email,
      name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email.split('@')[0],
      role: employee.role || 'member'
    };
    
    // Update goal state and edit data
    const updatedEmployees = [...(goal.assignedEmployees || []), newEmployee];
    const updatedGoal = {...goal, assignedEmployees: updatedEmployees};
    
    try {
      // Save to backend immediately
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`/api/goals?goalId=${goalId}&userEmail=${currentUser.email}&companyCode=${currentUser.companyCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignedEmployees: updatedEmployees
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update goal');
      }
      
      // Update local state only after successful API call
      setGoal(updatedGoal);
      setEditData({...editData, assignedEmployees: updatedEmployees});
      
      toast.success('Team member added successfully');
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error('Failed to add team member');
      return;
    }
    
    // Reset search
    setEmployeeSearchTerm('');
    setEmployeeSearchResults([]);
    setShowEmployeeSearch(false);
  };
  
  // Add viewer to goal
  const addViewerToGoal = async (viewer: any) => {
    // Check if already added
    if (goal.viewers?.some(v => v.email === viewer.email)) {
      toast.error('User already added as viewer');
      return;
    }
    
    const newViewer = {
      employeeId: viewer._id || viewer.id || `manual-${viewer.email}`,
      email: viewer.email,
      name: viewer.name || `${viewer.firstName || ''} ${viewer.lastName || ''}`.trim() || viewer.email.split('@')[0]
    };
    
    // Update goal state and edit data
    const updatedViewers = [...(goal.viewers || []), newViewer];
    const updatedGoal = {...goal, viewers: updatedViewers};
    
    try {
      // Save to backend immediately
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`/api/goals?goalId=${goalId}&userEmail=${currentUser.email}&companyCode=${currentUser.companyCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          viewers: updatedViewers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update goal');
      }
      
      // Update local state only after successful API call
      setGoal(updatedGoal);
      setEditData({...editData, viewers: updatedViewers});
      
      toast.success('Viewer added successfully');
    } catch (error) {
      console.error('Error adding viewer:', error);
      toast.error('Failed to add viewer');
      return;
    }
    
    // Reset search
    setViewerSearchTerm('');
    setViewerSearchResults([]);
    setShowViewerSearch(false);
  };
  
  // Remove employee from goal
  const handleRemoveEmployee = async (index: number) => {
    const updatedEmployees = [...goal.assignedEmployees];
    const removedEmployee = updatedEmployees[index];
    updatedEmployees.splice(index, 1);
    
    try {
      // Save to backend immediately
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`/api/goals?goalId=${goalId}&userEmail=${currentUser.email}&companyCode=${currentUser.companyCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignedEmployees: updatedEmployees
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update goal');
      }
      
      // Update local state only after successful API call
      setGoal({...goal, assignedEmployees: updatedEmployees});
      setEditData({...editData, assignedEmployees: updatedEmployees});
      
      toast.success('Team member removed successfully');
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };
  
  // Remove viewer from goal
  const handleRemoveViewer = async (index: number) => {
    const updatedViewers = [...goal.viewers];
    const removedViewer = updatedViewers[index];
    updatedViewers.splice(index, 1);
    
    try {
      // Save to backend immediately
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`/api/goals?goalId=${goalId}&userEmail=${currentUser.email}&companyCode=${currentUser.companyCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          viewers: updatedViewers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update goal');
      }
      
      // Update local state only after successful API call
      setGoal({...goal, viewers: updatedViewers});
      setEditData({...editData, viewers: updatedViewers});
      
      toast.success('Viewer removed successfully');
    } catch (error) {
      console.error('Error removing viewer:', error);
      toast.error('Failed to remove viewer');
    }
  };
  
  useEffect(() => {
    if (goalId) {
      // Load all the necessary data when the component mounts
      const loadData = async () => {
        await loadGoalData(); // This will also load projects now
        await loadAllProjects();
        await loadAllUsers();
      };
      loadData();
    }
  }, [goalId, loadGoalData]);

  const handleSaveChanges = async () => {
    if (!goal) return;
    
    try {
      setIsSaving(true);
      const result = await updateGoal(goal.id, editData);
      if (result.success) {
        toast.success('Goal updated successfully');
        await loadGoalData(); // Refresh data
        setIsEditing(false);
      } else {
        toast.error(String(result.error) || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = () => {
    setShowDeleteGoalConfirm(true);
  };

  // Confirm delete goal handler
  const confirmDeleteGoal = async () => {
    if (!goal) return;
    setIsDeletingGoal(true);
    try {
      const result = await deleteGoal(goal.id);
      if (result.success) {
        toast.success('Goal deleted successfully');
        setShowDeleteGoalConfirm(false);
        router.push('/dashboard/goals');
      } else {
        toast.error(String(result.error) || 'Failed to delete goal');
        throw new Error(String(result.error));
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    } finally {
      setIsDeletingGoal(false);
    }
  };

  const handleCreateKPI = async () => {
    try {
      if (!createKPIData.name || !createKPIData.target || !createKPIData.dueDate) {
        toast.error('Please fill in all required fields');
        return;
      }

      const kpiData = {
        ...createKPIData,
        target: Number(createKPIData.target),
        current: Number(createKPIData.current)
      };

      // Add KPI to goal's KPIs array
      const updatedGoal = {
        ...goal,
        kpis: [...(goal?.kpis || []), kpiData]
      };

      const result = await updateGoal(goalId, updatedGoal);
      if (result.success) {
        toast.success('KPI created successfully');
        setGoal(updatedGoal as Goal);
        setShowCreateKPI(false);
        setCreateKPIData({
          name: '',
          description: '',
          target: '',
          unit: '',
          dueDate: '',
          current: '0'
        });
      } else {
        toast.error(String(result.error) || 'Failed to create KPI');
      }
    } catch (error) {
      console.error('Error creating KPI:', error);
      toast.error('Failed to create KPI');
    }
  };

  // This function is now handled by the new implementation above
  // that updates the state and editData for batch saving

  const handleRemoveKPI = async (index: number) => {
    try {
      if (!goal) return;

      const updatedKPIs = goal.kpis.filter((_, i) => i !== index);
      const updatedGoal = {
        ...goal,
        kpis: updatedKPIs
      };

      const result = await updateGoal(goalId, updatedGoal);
      if (result.success) {
        toast.success('KPI removed successfully');
        setGoal(updatedGoal as Goal);
      } else {
        toast.error(String(result.error) || 'Failed to remove KPI');
      }
    } catch (error) {
      console.error('Error removing KPI:', error);
      toast.error('Failed to remove KPI');
    }
  };

  // State for structured goal update fields
  const [updateFields, setUpdateFields] = useState({
    progress: '',
    achievements: '',
    challenges: '',
    nextSteps: '',
    comments: ''
  });

  // Handle goal update submission
  const handleSubmitUpdate = async () => {
    setIsSubmittingUpdate(true);
    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Format the message from the structured fields
      const formattedMessage = [
        updateFields.progress ? `Progress: ${updateFields.progress}` : '',
        updateFields.achievements ? `Achievements: ${updateFields.achievements}` : '',
        updateFields.challenges ? `Challenges: ${updateFields.challenges}` : '',
        updateFields.nextSteps ? `Next Steps: ${updateFields.nextSteps}` : '',
        updateFields.comments ? `Additional Comments: ${updateFields.comments}` : ''
      ].filter(Boolean).join('\n\n');

      const response = await fetch(`/api/goals/${goalId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: formattedMessage,
          author_id: currentUser?._id || currentUser?.id,
          author_name: currentUser?.name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to post update');
      }

      const result = await response.json();

      // Add the new update to the local state
      setGoalUpdates(prev => [result.update, ...prev]);

      // Clear the form and close modal
      setUpdateFields({
        progress: '',
        achievements: '',
        challenges: '',
        nextSteps: '',
        comments: ''
      });
      setShowUpdateModal(false);

      toast.success('Update posted successfully!');
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update. Please try again.');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleCreateProject = async () => {
    if (!createProjectData.title.trim() || !createProjectData.description.trim()) {
      toast.error('Project title and description are required');
      return;
    }

    try {
      const result = await createProjectInGoal(goalId, {
        ...createProjectData,
        assignedEmployees: createProjectData.assignedEmployees
      });
      
      if (result.success) {
        toast.success('Project created and assigned to goal');
        await loadGoalProjects();
        setShowCreateProject(false);
        setCreateProjectData({
          title: '',
          description: '',
          department: goal?.department || '',
          startDate: '',
          endDate: '',
          status: 'planning',
          priority: 'medium',
          assignedEmployees: []
        });
      } else {
        toast.error(String(result.error) || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleAssignExistingProject = async (projectId: string) => {
    try {
      const result = await assignProjectToGoal(goalId, projectId);
      if (result.success) {
        toast.success('Project assigned to goal');
        // Close the dialog before refreshing to prevent visual glitch
        setShowAssignProject(false);
        
        // Refresh data in the background
        await Promise.all([
          loadGoalData(true),  // Force refresh with cache busting
          loadAllProjects()    // Refresh the projects list
        ]);
      } else {
        toast.error(String(result.error) || 'Failed to assign project');
      }
    } catch (error) {
      console.error('Error assigning project:', error);
      toast.error('Failed to assign project');
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    try {
      const result = await removeProjectFromGoal(goalId, projectId);
      if (result.success) {
        toast.success('Project removed from goal');
        
        // Update local state immediately for better UX
        setProjects(prevProjects => 
          prevProjects.filter(p => p.id !== projectId)
        );
        
        // Then refresh data from server
        await Promise.all([
          loadGoalData(true),
          loadAllProjects()
        ]);
      } else {
        const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to remove project from goal';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error removing project from goal:', error);
      toast.error('Failed to remove project from goal');
    } finally {
      setDeletingProjectId(null);
    }
  };



  const addEmployeeToProject = (employee: any) => {
    if (createProjectData.assignedEmployees.some((emp: any) => emp.email === employee.email)) {
      toast.error('Employee already assigned');
      return;
    }

    setCreateProjectData(prev => ({
      ...prev,
      assignedEmployees: [...prev.assignedEmployees, {
        employeeId: employee.id,
        name: employee.name || `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        department: employee.department || prev.department,
        role: 'Team Member',
        isLead: false
      }]
    }));

    toast.success(`${employee.name || employee.email} assigned to project`);
  };

  const removeEmployeeFromProject = (index: number) => {
    setCreateProjectData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin h-12 w-12 text-purple-600" />
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Goal Not Found</h1>
          <Button onClick={() => router.push('/dashboard/goals')} className="bg-purple-600 hover:bg-purple-700">
            <FaArrowLeft className="mr-2" />
            Back to Goals
          </Button>
        </div>
      </div>
    );
  }

  const StatusColors = {
    'planning': 'bg-blue-100 text-blue-800',
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-purple-100 text-purple-800',
    'canceled': 'bg-red-100 text-red-800',
    'on-hold': 'bg-yellow-100 text-yellow-800'
  };

  const PriorityColors = {
    'low': 'bg-gray-100 text-gray-800',
    'medium': 'bg-blue-100 text-blue-800',
    'high': 'bg-yellow-100 text-yellow-800',
    'critical': 'bg-red-100 text-red-800'
  };

  const unassignedProjects = allProjects.filter(p => 
    !projects.some(gp => gp.id === p.id)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">

                {isEditing ? (
                  <Input
                    value={editData.title || ''}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="text-3xl font-bold border-2 border-purple-300 rounded-md p-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  />
                ) : (
                  goal.title
                )}
                {goal.isManagementGoal && (
                  <Badge className="ml-3 bg-purple-700 text-white">Management</Badge>
                )}
              </h1>
            </div>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                {goal.permissions?.canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    <FaEdit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                {goal.permissions?.canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setShowUpdateModal(true)}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    <FaCommentDots className="w-4 h-4 mr-2" />
                    Update
                  </Button>
                )}
                {goal.permissions?.canDelete && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteGoal}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <FaTrash className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/goals')}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  <FaArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <FaTimes className="mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? <FaSpinner className="animate-spin mr-2 text-white" /> : <FaSave className="mr-2 text-white" />}
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Goal Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Basic Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Goal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Description</Label>
                {isEditing ? (
                  <Textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-700 mt-1">{goal.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  {isEditing ? (
                    <Input
                      value={editData.department || ''}
                      onChange={(e) => setEditData({...editData, department: e.target.value})}
                    />
                  ) : (
                    <p className="text-gray-700 mt-1">{goal.department}</p>
                  )}
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Label className="whitespace-nowrap">Status:</Label>
                  {isEditing ? (
                    <Select 
                      value={editData.status} 
                      onValueChange={(value) => setEditData({...editData, status: value as any})}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={goal?.status ? StatusColors[goal.status] : 'bg-gray-100 text-gray-800'}>
                      {goal?.status ? goal.status.replace('-', ' ').toUpperCase() : 'LOADING...'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Label className="whitespace-nowrap">Priority:</Label>
                  {isEditing ? (
                    <Select 
                      value={editData.priority} 
                      onValueChange={(value) => setEditData({...editData, priority: value as any})}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={goal?.priority ? PriorityColors[goal.priority] : 'bg-gray-100 text-gray-800'}>
                      {goal?.priority ? goal.priority.toUpperCase() : 'LOADING...'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.startDate || ''}
                      onChange={(e) => setEditData({...editData, startDate: e.target.value})}
                    />
                  ) : (
                    <p className="text-gray-700 mt-1 flex items-center">
                      <FaCalendarAlt className="mr-2 text-gray-500" />
                      {new Date(goal.startDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <Label>End Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.endDate || ''}
                      onChange={(e) => setEditData({...editData, endDate: e.target.value})}
                    />
                  ) : (
                    <p className="text-gray-700 mt-1 flex items-center">
                      <FaCalendarAlt className="mr-2 text-gray-500" />
                      {new Date(goal.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Projects, KPIs, etc. */}
          <Tabs defaultValue="projects" className="space-y-4">
            <TabsList>
              <TabsTrigger value="projects" className="flex items-center">
                <FaProjectDiagram className="mr-2" />
                Projects ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="kpis" className="flex items-center">
                <FaChartLine className="mr-2" />
                KPIs ({goal.kpis.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Assigned Projects</h2>
                      </CardTitle>
                    <div className="flex space-x-2">
                      {goal.permissions?.canEdit && (
                        <Dialog open={showAssignProject} onOpenChange={setShowAssignProject}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-gray-50 border-purple-600 hover:bg-gray-100 text-purple-600"
                            >
                              <FaPlus className="mr-2" />
                              Assign Existing
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="w-full max-w-2xl p-0 overflow-hidden border border-purple-300 rounded-lg shadow-md shadow-purple-100">
                          <div className="p-6 pb-4 border-b border-purple-300 bg-white rounded-t-lg">
                            <h2 className="text-lg font-semibold">Assign Existing Project</h2>
                            <p className="text-sm text-gray-500 mt-1">Search and select a project to assign to this goal</p>
                          </div>
                          <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Search Input */}
                            <div className="relative">
                              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <Input
                                placeholder="Search projects by name, description, or department..."
                                value={projectSearchTerm}
                                onChange={(e) => setProjectSearchTerm(e.target.value)}
                                className="pl-10 pr-10 h-12 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 border-gray-300 focus:border-purple-500"
                              />
                              {projectSearchTerm && (
                                <button
                                  onClick={() => setProjectSearchTerm('')}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              {isLoadingProjects ? (
                                <div className="flex justify-center items-center p-8">
                                  <FaSpinner className="animate-spin h-6 w-6 text-purple-600" />
                                  <span className="ml-2 text-gray-600">Loading projects...</span>
                                </div>
                              ) : unassignedProjects.filter(project =>
                                project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                                project.description?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                                project.department?.toLowerCase().includes(projectSearchTerm.toLowerCase())
                              ).length === 0 ? (
                                <div className="text-center p-8 text-gray-500">
                                  <FaSearch className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                  <p className="text-sm">
                                    {projectSearchTerm ? 'No projects match your search' : 'No unassigned projects available'}
                                  </p>
                                </div>
                              ) : (
                                <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-200">
                                  {unassignedProjects.filter(project =>
                                    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                                    project.description?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                                    project.department?.toLowerCase().includes(projectSearchTerm.toLowerCase())
                                  ).map(project => (
                                    <div key={project.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                                        {project.description && (
                                          <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">{project.description}</p>
                                        )}
                                        {project.department && (
                                          <div className="mt-2 flex items-center text-xs text-gray-500">
                                            <FaBuilding className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                                            <span>{project.department}</span>
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleAssignExistingProject(project.id)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white ml-4 whitespace-nowrap"
                                      >
                                        Assign
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                        </Dialog>
                      )}

                      {goal.permissions?.canEdit && (
                        <Button 
                          size="sm" 
                          onClick={() => setShowCreateProject(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <FaPlus className="w-4 h-4 mr-2" />
                          Create New
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <FaProjectDiagram className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No projects assigned to this goal yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map(project => (
                        <div key={project.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-lg">{project.name}</h4>
                              <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>Status: {project.status}</span>
                                <span>Priority: {project.priority}</span>
                                <span>Budget: ${project.total_budget?.toLocaleString()}</span>
                                <span>Team: {project.employees?.length || 0}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                              >
                                <FaEye />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRemoveProject(project._id || project.id)}
                                disabled={deletingProjectId === (project._id || project.id)}
                              >
                                {deletingProjectId === (project._id || project.id) ? (
                                  <FaSpinner className="animate-spin h-4 w-4" />
                                ) : (
                                  <FaTrash />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kpis">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Assigned Key Performance Indicators</h2>
                      </CardTitle>
                    {goal.permissions?.canEdit && (
                      <Button
                        size="sm"
                        onClick={() => setShowCreateKPI(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Create New
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {goal.kpis.length === 0 ? (
                    <div className="text-center py-8">
                      <FaChartLine className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No KPIs defined for this goal yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {goal.kpis.map((kpi, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-lg">{kpi.name}</h4>
                              {kpi.description && (
                                <p className="text-gray-600 text-sm mt-1">{kpi.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <FaChartLine className="mr-1 w-3 h-3" />
                                  <span>{kpi.current}/{kpi.target} {kpi.unit}</span>
                                </div>
                                <div className="flex items-center">
                                  <FaCalendarAlt className="mr-1 w-3 h-3" />
                                  <span>Due: {new Date(kpi.dueDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRemoveKPI(index)}
                              >
                                <FaTrash className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Goal Updates Timeline */}
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Goal Updates Timeline
            </h2>
            <div className="space-y-4">
              {goalUpdates && goalUpdates.length > 0 ? (
                goalUpdates.map((update: any, index: number) => (
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
                          <span className="text-xs text-gray-500">
                            {new Date(update.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="text-gray-700 text-sm whitespace-pre-wrap break-words">
                          {update.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-base font-medium text-gray-900 mb-2">No updates yet</p>
                  <p className="text-sm text-gray-500">
                    Goal updates will appear here when team members post updates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned Employees */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-800">Assigned Members</h3>
                {isEditing && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowEmployeeSearch(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <FaPlus />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {goal.assignedEmployees?.length === 0 ? (
                <p className="text-gray-500 text-sm">No members assigned</p>
              ) : (
                <div className="space-y-3">
                  {goal.assignedEmployees?.map((employee, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">
                            {employee.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{employee.name}</p>
                      </div>
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveEmployee(index)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <FaTimes className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Employee Search Dialog */}
              <Dialog open={showEmployeeSearch} onOpenChange={setShowEmployeeSearch}>
                <DialogContent className="sm:max-w-md border border-purple-300 shadow-md shadow-purple-100 rounded-lg overflow-hidden">
                  <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <DialogTitle className="text-lg font-semibold text-gray-900">Add Team Member</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Search for employees by name or email
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="relative">
                      <Input
                        placeholder="Search by name or email"
                        value={employeeSearchTerm}
                        onChange={(e) => {
                          setEmployeeSearchTerm(e.target.value);
                          searchEmployees(e.target.value);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-0 focus:ring-offset-0 focus:border-gray-400"
                      />
                      <FaSearch className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="border rounded-md divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
                      {employeeSearchResults.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm text-gray-500">
                            {employeeSearchTerm ? 'No employees found' : 'Start typing to search for employees'}
                          </p>
                        </div>
                      ) : (
                        employeeSearchResults.map((employee) => (
                          <div
                            key={employee.id || employee.email}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => addEmployeeToGoal(employee)}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-700 font-medium">
                                  {employee.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
                                <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                                {employee.isManualEntry && (
                                  <Badge variant="outline" className="mt-1 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Manual Entry
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                              <FaPlus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Viewers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-800">Assigned Viewers</h3>
                {isEditing && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowViewerSearch(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <FaPlus   />

                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {goal.viewers?.length === 0 ? (
                <p className="text-gray-500 text-sm">No viewers assigned</p>
              ) : (
                <div className="space-y-3">
                  {goal.viewers?.map((viewer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">
                            {viewer.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{viewer.name}</p>
                      </div>
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveViewer(index)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <FaTimes className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Viewer Search Dialog */}
              <Dialog open={showViewerSearch} onOpenChange={setShowViewerSearch}>
                <DialogContent className="sm:max-w-md border border-purple-300 shadow-md shadow-purple-100 rounded-lg overflow-hidden">
                  <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <DialogTitle className="text-lg font-semibold text-gray-900">Add Viewer</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Search for employees to add as viewers
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="relative">
                      <Input
                        placeholder="Search by name or email"
                        value={viewerSearchTerm}
                        onChange={(e) => {
                          setViewerSearchTerm(e.target.value);
                          searchEmployees(e.target.value);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-0 focus:ring-offset-0 focus:border-gray-400"
                      />
                      <FaSearch className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="border rounded-md divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
                      {employeeSearchResults.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm text-gray-500">
                            {viewerSearchTerm ? 'No employees found' : 'Start typing to search for employees'}
                          </p>
                        </div>
                      ) : (
                        employeeSearchResults.map((viewer) => (
                          <div
                            key={viewer.id || viewer.email}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => addViewerToGoal(viewer)}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-700 font-medium">
                                  {viewer.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{viewer.name}</p>
                                <p className="text-xs text-gray-500 truncate">{viewer.email}</p>
                                {viewer.isManualEntry && (
                                  <Badge variant="outline" className="mt-1 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Manual Entry
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-8 h-8 p-0 flex items-center justify-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                addViewerToGoal(viewer);
                              }}
                            >
                              <FaPlus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogContent className="w-full max-w-4xl p-0 overflow-hidden border border-purple-300 rounded-lg shadow-md shadow-purple-100">
            <div className="p-6 pb-4 border-b border-purple-300 bg-white rounded-t-lg">
              <h2 className="text-lg font-semibold">Create New Project</h2>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Project Title *</Label>
                  <Input
                    value={createProjectData.title}
                    onChange={(e) => setCreateProjectData({...createProjectData, title: e.target.value})}
                    placeholder="Enter project title"
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input
                    value={createProjectData.department}
                    onChange={(e) => setCreateProjectData({...createProjectData, department: e.target.value})}
                    placeholder="Department"
                  />
                </div>
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  value={createProjectData.description}
                  onChange={(e) => setCreateProjectData({...createProjectData, description: e.target.value})}
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={createProjectData.startDate}
                    onChange={(e) => setCreateProjectData({...createProjectData, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={createProjectData.endDate}
                    onChange={(e) => setCreateProjectData({...createProjectData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={createProjectData.status} 
                    onValueChange={(value) => setCreateProjectData({...createProjectData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={createProjectData.priority} 
                    onValueChange={(value) => setCreateProjectData({...createProjectData, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

              {/* Employee Assignment */}
              <div className="space-y-6 border-t pt-6">
                <div>
                  <EmployeeSearchInput
                    onEmployeeSelect={addEmployeeToProject}
                    searchFunction={(term) => {
                      // Use the same client-side filtering approach that works in edit members section
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
                        department: user.department || ''
                      }));
                      
                      return Promise.resolve(formattedResults);
                    }}
                    placeholder="Search employees by name or email..."
                    label="Assign Employees"
                    allowManualEmail={true}
                  />
                </div>

                {/* Assigned Employees */}
                {createProjectData.assignedEmployees.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Assigned Employees ({createProjectData.assignedEmployees.length})</Label>
                    <div className="space-y-3">
                      {createProjectData.assignedEmployees.map((employee: any, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{employee.email}</div>
                            {employee.role && (
                              <Badge variant="outline" className="mt-2">{employee.role}</Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeEmployeeFromProject(index)}
                            className="ml-4"
                          >
                            <FaTimes className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
            <div className="p-4 border-t border-purple-300 bg-white flex justify-end rounded-b-lg">
              <Button
                onClick={handleCreateProject}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Create Project
              </Button>
            </div> 
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Goal Confirmation Dialog */}
      <Dialog open={showDeleteGoalConfirm} onOpenChange={setShowDeleteGoalConfirm}>
        <DialogContent hideCloseButton className="sm:max-w-md p-0 overflow-hidden border border-red-300 shadow-lg">
          <div className="p-6">
            <DialogHeader>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-6 w-6 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <DialogTitle className="text-lg font-semibold text-gray-900">Delete</DialogTitle>
              </div>
              <DialogDescription className="mt-2 text-gray-600">
                This will delete the goal and all its linked projects. Continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteGoalConfirm(false)}
                disabled={isDeletingGoal}
                className="px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteGoal}
                disabled={isDeletingGoal}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-0 shadow-sm"
              >
                {isDeletingGoal ? (
                  <span className="flex items-center">
                    <FaSpinner className="animate-spin mr-2 h-3 w-3" />
                    Deleting...
                  </span>
                ) : (
                  <span>Delete</span>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="w-full max-w-4xl p-0 overflow-hidden border border-purple-300 rounded-lg shadow-md shadow-purple-100">
          <div className="p-6 pb-4 border-b border-purple-300 bg-white rounded-t-lg">
            <h2 className="text-lg font-semibold">Post Goal Update</h2>
            <p className="text-sm text-gray-500 mt-1">Share a comprehensive update about this goal's progress</p>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Please provide updates on the following aspects of this goal:
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Progress Field */}
              <div className="space-y-2">
                <Label htmlFor="update-progress" className="text-sm font-medium text-gray-700">
                  Current Progress
                </Label>
                <Textarea
                  id="update-progress"
                  placeholder="Describe the current progress toward goal completion..."
                  value={updateFields.progress}
                  onChange={(e) => setUpdateFields({...updateFields, progress: e.target.value})}
                  className="min-h-[100px] text-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  disabled={isSubmittingUpdate}
                />
              </div>
              
              {/* Achievements Field */}
              <div className="space-y-2">
                <Label htmlFor="update-achievements" className="text-sm font-medium text-gray-700">
                  Recent Achievements
                </Label>
                <Textarea
                  id="update-achievements"
                  placeholder="List key milestones reached, KPI achievements, or other successes since the last update..."
                  value={updateFields.achievements}
                  onChange={(e) => setUpdateFields({...updateFields, achievements: e.target.value})}
                  className="min-h-[100px] text-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  disabled={isSubmittingUpdate}
                />
              </div>
              
              {/* Challenges Field */}
              <div className="space-y-2">
                <Label htmlFor="update-challenges" className="text-sm font-medium text-gray-700">
                  Challenges & Blockers
                </Label>
                <Textarea
                  id="update-challenges"
                  placeholder="Describe any challenges encountered and how they're being addressed..."
                  value={updateFields.challenges}
                  onChange={(e) => setUpdateFields({...updateFields, challenges: e.target.value})}
                  className="min-h-[100px] text-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  disabled={isSubmittingUpdate}
                />
              </div>
              
              {/* Next Steps Field */}
              <div className="space-y-2">
                <Label htmlFor="update-next-steps" className="text-sm font-medium text-gray-700">
                  Next Steps
                </Label>
                <Textarea
                  id="update-next-steps"
                  placeholder="Outline upcoming priorities and actions planned for the next period..."
                  value={updateFields.nextSteps}
                  onChange={(e) => setUpdateFields({...updateFields, nextSteps: e.target.value})}
                  className="min-h-[100px] text-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  disabled={isSubmittingUpdate}
                />
              </div>
              
              {/* Optional Comments Field */}
              <div className="space-y-2">
                <Label htmlFor="update-comments" className="text-sm font-medium text-gray-700">
                  Additional Comments <span className="text-gray-400"></span>
                </Label>
                <Textarea
                  id="update-comments"
                  placeholder="Any other information you'd like to share about this goal..."
                  value={updateFields.comments}
                  onChange={(e) => setUpdateFields({...updateFields, comments: e.target.value})}
                  className="min-h-[80px] text-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  disabled={isSubmittingUpdate}
                />
              </div>
            </div>
            
            

            {/* Recent Updates */}
            {goalUpdates.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Updates</h4>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                  {goalUpdates.slice(0, 3).map((update, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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

          <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button
              onClick={handleSubmitUpdate}
              disabled={isSubmittingUpdate}
              className="px-6 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingUpdate ? (
                <span className="flex items-center">
                  <FaSpinner className="animate-spin h-4 w-4 mr-2" />
                  Posting Update...
                </span>
              ) : (
                'Post Update'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create KPI Modal */}
      <Dialog open={showCreateKPI} onOpenChange={setShowCreateKPI}>
        <DialogContent className="w-full max-w-2xl p-0 overflow-hidden border border-purple-300 rounded-lg shadow-md shadow-purple-100">
          <div className="p-6 pb-4 border-b border-purple-300 bg-white rounded-t-lg">
            <h2 className="text-lg font-semibold">Create New KPI</h2>
            <p className="text-sm text-gray-500 mt-1">Add a new key performance indicator for this goal</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="kpi-name" className="text-sm font-medium text-gray-700">KPI Name *</Label>
                  <Input
                    id="kpi-name"
                    value={createKPIData.name}
                    onChange={(e) => setCreateKPIData({...createKPIData, name: e.target.value})}
                    placeholder="e.g., Monthly Revenue"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kpi-unit" className="text-sm font-medium text-gray-700">Unit</Label>
                  <Input
                    id="kpi-unit"
                    value={createKPIData.unit}
                    onChange={(e) => setCreateKPIData({...createKPIData, unit: e.target.value})}
                    placeholder="e.g., USD, %, units"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpi-description" className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                  id="kpi-description"
                  value={createKPIData.description}
                  onChange={(e) => setCreateKPIData({...createKPIData, description: e.target.value})}
                  placeholder="Describe what this KPI measures..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="kpi-target" className="text-sm font-medium text-gray-700">Target Value *</Label>
                  <Input
                    id="kpi-target"
                    type="number"
                    value={createKPIData.target}
                    onChange={(e) => setCreateKPIData({...createKPIData, target: e.target.value})}
                    placeholder="100"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kpi-current" className="text-sm font-medium text-gray-700">Current Value</Label>
                  <Input
                    id="kpi-current"
                    type="number"
                    value={createKPIData.current}
                    onChange={(e) => setCreateKPIData({...createKPIData, current: e.target.value})}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kpi-due" className="text-sm font-medium text-gray-700">Due Date *</Label>
                  <Input
                    id="kpi-due"
                    type="date"
                    value={createKPIData.dueDate}
                    onChange={(e) => setCreateKPIData({...createKPIData, dueDate: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateKPI(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKPI}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Create KPI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}