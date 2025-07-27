"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { searchUsers, fetchGoals, updateGoal } from '../../api';
import { FaArrowLeft, FaSave, FaSpinner, FaPlus, FaMinus, FaSearch, FaTimes, FaTarget } from 'react-icons/fa';

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
  visibleToAll: boolean;
}

type KpiEditor = { 
  name: string; 
  description: string; 
  target: number; 
  current: number;
  unit: string; 
  dueDate: string; 
};

type EmployeeEditor = { 
  employeeId: string;
  name: string; 
  email: string; 
  role: string;
};

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (goalId) {
      loadGoalData();
    }
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      setLoading(true);
      const result = await fetchGoals();
      if (result.goals) {
        const foundGoal = result.goals.find((g: any) => g.id === goalId);
        if (foundGoal) {
          setGoal(foundGoal);
          setGoalData({
            title: foundGoal.title,
            description: foundGoal.description,
            department: foundGoal.department,
            startDate: foundGoal.startDate,
            endDate: foundGoal.endDate,
            status: foundGoal.status,
            priority: foundGoal.priority,
            visibleToAll: foundGoal.visibleToAll,
            kpis: foundGoal.kpis || [],
            assignedEmployees: foundGoal.assignedEmployees || [],
            viewers: foundGoal.viewers || []
          });
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
  };

  // KPI management functions
  const addKpi = () => {
    setGoalData(prev => ({
      ...prev,
      kpis: [...prev.kpis, { name: '', description: '', target: 0, current: 0, unit: '', dueDate: '' }]
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

  // Employee search and management
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
        email: viewer.email
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
    
    if (!goal) return;
    
    try {
      setSaving(true);
      
      // Validate required fields
      if (!goalData.title.trim()) {
        toast.error('Goal title is required');
        return;
      }
      
      if (!goalData.description.trim()) {
        toast.error('Goal description is required');
        return;
      }
      
      if (!goalData.department.trim()) {
        toast.error('Department is required');
        return;
      }
      
      if (!goalData.startDate) {
        toast.error('Start date is required');
        return;
      }
      
      if (!goalData.endDate) {
        toast.error('End date is required');
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
          current: Number(kpi.current),
          unit: kpi.unit,
          dueDate: kpi.dueDate
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

      console.log('Updating goal with data:', formattedData);
      
      const result = await updateGoal(goal.id, formattedData);
      if (result.success) {
        toast.success('Goal updated successfully!');
        router.push(`/dashboard/goals/${goal.id}`);
      } else {
        toast.error(result.error || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/dashboard/goals/${goal.id}`)}
            >
              <FaArrowLeft className="mr-2" />
              Back to Goal
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FaTarget className="mr-3 text-purple-600" />
                Edit Goal
              </h1>
              <p className="text-gray-600">Update goal information, KPIs, and assignments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-6 max-w-4xl">
        {/* Basic Goal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Goal Title *</Label>
            <Input 
              id="title" 
              name="title" 
              autoComplete="off" 
              value={goalData.title} 
              onChange={handleChange} 
              placeholder="Goal title"
              required
            />
          </div>
          <div>
            <Label htmlFor="department">Department *</Label>
            <Input
              id="department"
              name="department"
              autoComplete="off"
              value={goalData.department}
              onChange={handleChange}
              placeholder="Enter department"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea 
            id="description" 
            name="description" 
            autoComplete="off" 
            value={goalData.description} 
            onChange={handleChange} 
            placeholder="Enter goal description" 
            rows={3}
            required
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
            <Label htmlFor="startDate">Start Date *</Label>
            <Input 
              id="startDate" 
              name="startDate" 
              type="date" 
              autoComplete="off" 
              value={goalData.startDate} 
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date *</Label>
            <Input 
              id="endDate" 
              name="endDate" 
              type="date" 
              autoComplete="off" 
              value={goalData.endDate} 
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* KPIs Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold flex items-center">
              <FaTarget className="mr-2" />
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
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    value={kpi.current}
                    onChange={(e) => handleKpiChange(index, 'current', Number(e.target.value))}
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
                <div>
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

        {/* Assigned Employees Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Assigned Employees</Label>
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
                  <FaSpinner className="animate-spin h-6 w-6 text-purple-600 mx-auto" />
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
                  <FaSpinner className="animate-spin h-6 w-6 text-purple-600 mx-auto" />
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

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(`/dashboard/goals/${goal.id}`)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}