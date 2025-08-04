"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangeEvent, useEffect, useState, useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GoalDisplayCard from "./GoalDisplayCard";
import { fetchGoals } from "./api";
import { toast } from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";
import { GoalsTourLauncher } from "@/components/tour/GoalsTourLauncher";


import { useRouter } from "next/navigation";
import {
  Target,
  Plus,
  Search
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  status: "planning" | "active" | "completed" | "canceled" | "on-hold";
  priority: "low" | "medium" | "high" | "critical";
  startDate: string;
  endDate?: string;
  department?: string;
  progress?: number;
  assignedEmployees: Array<{
    employeeId?: string;
    name?: string;
    email?: string;
    role?: string;
  }>;
  assignedProjects: Array<{
    projectId?: string;
    assignedAt?: string;
  }>;
  kpis: Array<{
    name?: string;
    description?: string;
    target?: number;
    current?: number;
    unit?: string;
    dueDate?: string;
  }>;
  createdByRole: string;
  isManagementGoal: boolean;
  viewers: Array<string | { email?: string; }>;
  visibleToAll: boolean;
  hasAccess: boolean;
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
  };
}



export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadingGoals, setLoadingGoals] = useState<boolean>(true);
  const [canCreateGoals, setCanCreateGoals] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);



  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (goals) filterGoals();
  }, [searchTerm, departmentFilter, statusFilter, goals]);

  const loadGoals = async () => {
    try {
      setLoadingGoals(true);
      setErrorMessage(null);
      const result = await fetchGoals();

      if (result.error) {
        setErrorMessage(result.error);
        setGoals([]);
        setFilteredGoals([]);
        toast.error(`Error: ${result.error}`);
        return;
      }

      if (result?.goals && Array.isArray(result.goals)) {
        // Check user permissions for creating goals based on first goal's permissions
        // (all goals will have same user permissions since they're based on user role)
        if (result.goals.length > 0 && result.goals[0].permissions) {
          // User can create goals if they are admin or top management
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const currentUser = JSON.parse(storedUser);
              const userRole = currentUser.role || '';
              const canCreate = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(userRole);
              setCanCreateGoals(canCreate);
            } catch (e) {
              console.error('Failed to parse user data:', e);
              setCanCreateGoals(false);
            }
          }
        }

        // Optimized goal formatting for better performance
        const formattedGoals = result.goals.map((g: any) => ({
          id: g.id || g._id?.toString() || "",
          title: g.title || g.goal_title || "",
          description: g.description || g.goal_description || "",
          status: g.status || "planning",
          priority: g.priority || "medium",
          startDate: g.startDate || g.start_date || "",
          endDate: g.endDate || g.end_date || "",
          department: g.department || "",
          progress: g.progress || 0,
          assignedEmployees: g.assignedEmployees || [],
          assignedProjects: g.assignedProjects || [],
          kpis: g.kpis || [],
          createdByRole: g.createdByRole || '',
          isManagementGoal: g.isManagementGoal || false,
          viewers: g.viewers || [],
          visibleToAll: g.visibleToAll || false,
          hasAccess: true,
          permissions: g.permissions || { canEdit: false, canDelete: false, canView: true }
        }));
        setGoals(formattedGoals);
        setFilteredGoals(formattedGoals);
      } else {
        console.error("Invalid goals data:", result);
        setGoals([]);
        setFilteredGoals([]);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load goals");
      setGoals([]);
      setFilteredGoals([]);
      toast.error("Failed to load goals. Please try again.");
    } finally {
      setLoadingGoals(false);
    }
  };

  const filterGoals = useCallback(() => {
    if (!goals) return;

    let filtered = [...goals];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((g) => {
        // Check goal title
        if (g.title.toLowerCase().includes(term)) return true;
        
        // Check goal description
        if (g.description?.toLowerCase().includes(term)) return true;
        
        // Check department
        if (g.department?.toLowerCase().includes(term)) return true;
        
        // Check assigned employees
        if (g.assignedEmployees?.some(emp => {
          if (emp.name?.toLowerCase().includes(term)) return true;
          if (emp.email?.toLowerCase().includes(term)) return true;
          if (emp.role?.toLowerCase().includes(term)) return true;
          return false;
        })) return true;
        
        return false;
      });
    }

    // Filter by department
    if (departmentFilter !== "all") {
      filtered = filtered.filter((g) => g.department === departmentFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((g) => g.status === statusFilter);
    }

    // Default sorting by title
    filtered.sort((a, b) => a.title.localeCompare(b.title));

    setFilteredGoals(filtered);
  }, [searchTerm, departmentFilter, statusFilter, goals]);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDepartmentFilterChange = (value: string) => setDepartmentFilter(value);
  const handleStatusFilterChange = (value: string) => setStatusFilter(value);



  // Get unique departments for filter - optimized with useMemo
  const departments = useMemo(() =>
    Array.from(new Set(goals.map(g => g.department).filter(Boolean))),
    [goals]
  );

  // Calculate stats


  if (loadingGoals) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header - Matching Projects Page */}
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mt-4">
          <span className="text-purple-700">Goals</span> Management
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
          Drive organizational success through strategic goal setting and tracking.
        </p>
      </div>

      {/* Controls - Matching Projects Page Layout */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 grid grid-cols-3 gap-3 mr-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search goals, employees, departments..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              data-tour="search-input"
            />
          </div>

          <Select value={departmentFilter} onValueChange={handleDepartmentFilterChange}>
            <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" data-tour="department-filter">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept || ''}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" data-tour="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canCreateGoals && (
          <Button
            onClick={() => router.push('/dashboard/goals/create')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-tour="create-goal-button"
          >
            Add Goal
          </Button>
        )}
      </div>



      {/* Goals Grid - Matching Projects Page */}
      {loadingGoals ? (
        <div className="flex flex-col justify-center items-center h-64">
          <FaSpinner className="animate-spin h-8 w-8 text-purple-600 mb-4" />
          <p className="text-gray-600">Loading goals...</p>
        </div>
      ) : errorMessage ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{errorMessage}</p>
          <Button onClick={loadGoals} variant="outline">
            Try Again
          </Button>
        </div>
      ) : filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="goals-grid">
          {filteredGoals.map((goal) => (
            <GoalDisplayCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first goal'}
          </p>
          
        </div>
      )}


      <GoalsTourLauncher />
    </div>
  );
}