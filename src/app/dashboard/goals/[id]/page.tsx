"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { 
  FaTarget, FaArrowLeft, FaEdit, FaProjectDiagram, FaUsers, FaPlus, 
  FaTrash, FaEye, FaCalendarAlt, FaFlag, FaChartLine, FaUserPlus,
  FaSearch, FaTimes, FaSave, FaSpinner 
} from 'react-icons/fa';
import { fetchGoals, updateGoal, deleteGoal, fetchGoalProjects, createProjectInGoal, assignProjectToGoal, removeProjectFromGoal, searchUsers } from '../api';
import { fetchProjects } from '../../projects/api';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'canceled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  department: string;
  progress: number;
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
}

interface Project {
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
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Goal>>({});

  // Project management states
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [createProjectData, setCreateProjectData] = useState({
    title: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    priority: 'medium',
    assignedEmployees: []
  });

  // Employee search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);

  useEffect(() => {
    if (goalId) {
      loadGoalData();
      loadGoalProjects();
      loadAllProjects();
    }
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

  const loadGoalData = async () => {
    try {
      setLoading(true);
      const result = await fetchGoals();
      if (result.goals) {
        const foundGoal = result.goals.find((g: any) => g.id === goalId);
        if (foundGoal) {
          setGoal(foundGoal);
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
  };

  const loadGoalProjects = async () => {
    try {
      const result = await fetchGoalProjects(goalId);
      if (result.projects) {
        setProjects(result.projects);
      }
    } catch (error) {
      console.error('Error loading goal projects:', error);
    }
  };

  const loadAllProjects = async () => {
    try {
      const result = await fetchProjects();
      if (result.projects) {
        setAllProjects(result.projects);
      }
    } catch (error) {
      console.error('Error loading all projects:', error);
    }
  };

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
        toast.error(result.error || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goal) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete the goal "${goal.title}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const result = await deleteGoal(goal.id);
      if (result.success) {
        toast.success('Goal deleted successfully');
        router.push('/dashboard/goals');
      } else {
        toast.error(result.error || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
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
        toast.error(result.error || 'Failed to create project');
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
        await loadGoalProjects();
        setShowAssignProject(false);
      } else {
        toast.error(result.error || 'Failed to assign project');
      }
    } catch (error) {
      console.error('Error assigning project:', error);
      toast.error('Failed to assign project');
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    const confirmRemove = window.confirm('Are you sure you want to remove this project from the goal?');
    if (!confirmRemove) return;

    try {
      const result = await removeProjectFromGoal(goalId, projectId);
      if (result.success) {
        toast.success('Project removed from goal');
        await loadGoalProjects();
      } else {
        toast.error(result.error || 'Failed to remove project');
      }
    } catch (error) {
      console.error('Error removing project:', error);
      toast.error('Failed to remove project');
    }
  };

  const searchEmployees = async (term: string) => {
    if (term.length < 2) {
      setEmployeeSearchResults([]);
      return;
    }

    setIsSearchingEmployees(true);
    try {
      const results = await searchUsers(term);
      setEmployeeSearchResults(results);
    } catch (error) {
      console.error('Error searching employees:', error);
      toast.error('Failed to search employees');
    } finally {
      setIsSearchingEmployees(false);
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

    setEmployeeSearchTerm('');
    setEmployeeSearchResults([]);
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
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/goals')}
            >
              <FaArrowLeft className="mr-2" />
              Back to Goals
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FaTarget className="mr-3 text-purple-600" />
                {isEditing ? (
                  <Input
                    value={editData.title || ''}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="text-3xl font-bold border-none p-0"
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
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <FaEdit className="mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={handleDeleteGoal}>
                  <FaTrash className="mr-2" />
                  Delete
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
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSaving ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
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
              <CardTitle className="flex items-center">
                <FaTarget className="mr-2" />
                Goal Details
              </CardTitle>
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
                <div>
                  <Label>Progress</Label>
                  <div className="mt-1">
                    <Progress value={goal.progress} className="w-full" />
                    <p className="text-sm text-gray-600 mt-1">{goal.progress}% Complete</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select 
                      value={editData.status} 
                      onValueChange={(value) => setEditData({...editData, status: value as any})}
                    >
                      <SelectTrigger>
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
                    <Badge className={StatusColors[goal.status] + ' inline-block mt-1'}>
                      {goal.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label>Priority</Label>
                  {isEditing ? (
                    <Select 
                      value={editData.priority} 
                      onValueChange={(value) => setEditData({...editData, priority: value as any})}
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
                  ) : (
                    <Badge className={PriorityColors[goal.priority] + ' inline-block mt-1'}>
                      {goal.priority.toUpperCase()}
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
                    <CardTitle>Assigned Projects</CardTitle>
                    <div className="flex space-x-2">
                      <Dialog open={showAssignProject} onOpenChange={setShowAssignProject}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FaPlus className="mr-2" />
                            Assign Existing
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Assign Existing Project</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {unassignedProjects.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">
                                No unassigned projects available
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {unassignedProjects.map(project => (
                                  <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                      <h4 className="font-medium">{project.name}</h4>
                                      <p className="text-sm text-gray-600">{project.description}</p>
                                      <p className="text-xs text-gray-500">{project.department}</p>
                                    </div>
                                    <Button 
                                      size="sm"
                                      onClick={() => handleAssignExistingProject(project.id)}
                                    >
                                      Assign
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        size="sm" 
                        onClick={() => setShowCreateProject(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <FaPlus className="mr-2" />
                        Create New
                      </Button>
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
                                <FaEye className="mr-1" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRemoveProject(project.id)}
                              >
                                <FaTrash className="mr-1" />
                                Remove
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
                  <CardTitle>Key Performance Indicators</CardTitle>
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{kpi.name}</h4>
                            <Badge variant="outline">
                              {kpi.current}/{kpi.target} {kpi.unit}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{kpi.description}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{Math.round((kpi.current / kpi.target) * 100)}%</span>
                            </div>
                            <Progress value={(kpi.current / kpi.target) * 100} />
                            <p className="text-xs text-gray-500">
                              Due: {new Date(kpi.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned Employees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaUsers className="mr-2" />
                Assigned Employees ({goal.assignedEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goal.assignedEmployees.length === 0 ? (
                <p className="text-gray-500 text-sm">No employees assigned</p>
              ) : (
                <div className="space-y-3">
                  {goal.assignedEmployees.map((employee, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <FaUsers className="text-purple-600 text-sm" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Viewers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaEye className="mr-2" />
                Viewers ({goal.viewers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goal.viewers.length === 0 ? (
                <p className="text-gray-500 text-sm">No viewers assigned</p>
              ) : (
                <div className="space-y-3">
                  {goal.viewers.map((viewer, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaEye className="text-blue-600 text-sm" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{viewer.name}</p>
                        <p className="text-xs text-gray-500">View Only</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Projects:</span>
                <Badge variant="outline">{projects.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total KPIs:</span>
                <Badge variant="outline">{goal.kpis.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Team Size:</span>
                <Badge variant="outline">{goal.assignedEmployees.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Visibility:</span>
                <Badge variant="outline">
                  {goal.visibleToAll ? 'Public' : 'Private'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project for Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Assign Employees</Label>
                  <div className="flex items-center space-x-2">
                    <FaSearch className="text-gray-500" />
                    <Input
                      placeholder="Search employees..."
                      value={employeeSearchTerm}
                      onChange={(e) => {
                        setEmployeeSearchTerm(e.target.value);
                        searchEmployees(e.target.value);
                      }}
                      className="w-64"
                    />
                  </div>
                </div>

                {/* Search Results */}
                {isSearchingEmployees && (
                  <div className="text-center py-2">
                    <FaSpinner className="animate-spin h-6 w-6 text-purple-600 mx-auto" />
                  </div>
                )}

                {employeeSearchResults.length > 0 && (
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                    {employeeSearchResults.map((employee) => (
                      <div 
                        key={employee.id}
                        className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                        onClick={() => addEmployeeToProject(employee)}
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

                {/* Assigned Employees */}
                <div className="space-y-2">
                  <Label>Assigned Employees ({createProjectData.assignedEmployees.length})</Label>
                  {createProjectData.assignedEmployees.map((employee: any, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{employee.role}</Badge>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => removeEmployeeFromProject(index)}
                        >
                          <FaTimes />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProject}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}