'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  BackgroundVariant,
  MiniMap,
  Node,
  Edge,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaSearch, FaFilter, FaTimes, FaCamera, FaSyncAlt, FaUndo } from 'react-icons/fa';
import { Target, Users, Briefcase, Calendar, AlertCircle, CheckCircle, Clock, Pause } from 'lucide-react';
import { toast } from "react-hot-toast";
import html2canvas from 'html2canvas';

// Types
interface Goal {
  id: string;
  title: string;
  description: string;
  department: string;
  startDate: string;
  endDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planning' | 'active' | 'completed' | 'canceled' | 'on-hold';
  progress: number;
  assignedProjects: Array<{
    projectId: string;
    assignedAt?: string;
  }>;
  assignedEmployees: Array<{
    employeeId?: string;
    name?: string;
    email?: string;
    role?: string;
  }>;
  kpis: Array<{
    name?: string;
    description?: string;
    target?: number;
    current?: number;
    unit?: string;
    dueDate?: string;
  }>;
  visibleToAll: boolean;
  createdByRole: string;
  isManagementGoal: boolean;
}

interface Project {
  _id: string;
  project_title: string;
  project_description: string;
  department: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  total_budget: number;
  linkedProjects: string[];
  employee_contributions: Array<{
    employee_id?: string;
    name: string;
    email: string;
    department: string;
    role: string;
    hours_per_week?: number;
    tasks: string[];
    tools_used: string[];
  }>;
  employees: Array<{
    name: string;
    email: string;
    department: string;
    role: string;
    hours?: string;
    tasks?: string;
    tools_used?: string;
  }>;
}

interface Employee {
  _id: string;
  email: string;
  firstName: string;
  lastName?: string;
  jobTitle: string;
  department?: string;
  officeLocation?: string;
  salary?: string;
  toolsProficient?: string;
  workMode?: string;
  jobResponsibilities?: Array<{
    duty: string;
    hours: number;
  }>;
}

interface ObjectiveNode extends Node {
  data: {
    id: string;
    type: 'goal' | 'project' | 'employee';
    level: number;
    title: string;
    subtitle?: string;
    status?: string;
    priority?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    progress?: number;
    role?: string;
    email?: string;
    details: Goal | Project | Employee;
  };
}

// Node Components
const GoalNode = ({ data }: { data: ObjectiveNode['data'] }) => {
  const goal = data.details as Goal;
  const statusIcons = {
    planning: <Clock className="w-4 h-4 text-blue-500" />,
    active: <CheckCircle className="w-4 h-4 text-green-500" />,
    completed: <CheckCircle className="w-4 h-4 text-green-600" />,
    'on-hold': <Pause className="w-4 h-4 text-yellow-500" />,
    canceled: <AlertCircle className="w-4 h-4 text-red-500" />
  };

  const priorityColors = {
    low: 'border-green-400 bg-green-50 hover:bg-green-100',
    medium: 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100',
    high: 'border-orange-400 bg-orange-50 hover:bg-orange-100',
    critical: 'border-red-400 bg-red-50 hover:bg-red-100'
  };

  const statusColors = {
    planning: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    canceled: 'bg-red-100 text-red-800'
  };

  return (
    <Card className={`w-80 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${priorityColors[goal.priority]} border-2 shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-purple-600" />
            <Badge variant="outline" className="text-xs font-semibold border-purple-300 text-purple-700">
              GOAL
            </Badge>
          </div>
          <Badge className={`text-xs font-medium ${statusColors[goal.status]}`}>
            {goal.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
          {goal.title}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 line-clamp-2 mt-1">
          {goal.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {statusIcons[goal.status]}
              <span className="text-sm font-medium text-gray-700 capitalize">
                {goal.status.replace('-', ' ')}
              </span>
            </div>
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
              {goal.department}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(goal.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{goal.assignedProjects.length} projects</span>
            </div>
          </div>

          {goal.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-700">
                <span>Progress</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className={`text-xs font-medium ${
              goal.priority === 'critical' ? 'border-red-400 text-red-700' :
              goal.priority === 'high' ? 'border-orange-400 text-orange-700' :
              goal.priority === 'medium' ? 'border-yellow-400 text-yellow-700' :
              'border-green-400 text-green-700'
            }`}>
              {goal.priority.toUpperCase()} PRIORITY
            </Badge>
            {goal.kpis && goal.kpis.length > 0 && (
              <span className="text-xs text-gray-500">{goal.kpis.length} KPIs</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProjectNode = ({ data }: { data: ObjectiveNode['data'] }) => {
  const project = data.details as Project;
  const isMainProject = data.level === 2;

  const priorityColors = {
    low: 'border-green-400 bg-green-50 hover:bg-green-100',
    medium: 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100',
    high: 'border-orange-400 bg-orange-50 hover:bg-orange-100',
    critical: 'border-red-400 bg-red-50 hover:bg-red-100'
  };

  const statusColors = {
    planning: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    canceled: 'bg-red-100 text-red-800'
  };

  const teamSize = (project.employee_contributions || project.employees || []).length;

  return (
    <Card className={`${isMainProject ? 'w-72' : 'w-64'} cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 shadow-md ${priorityColors[project.priority as keyof typeof priorityColors] || 'border-gray-400 bg-gray-50 hover:bg-gray-100'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Briefcase className={`${isMainProject ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600`} />
            <Badge variant={isMainProject ? "default" : "outline"} className={`text-xs font-semibold ${
              isMainProject ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700'
            }`}>
              {isMainProject ? 'MAIN PROJECT' : 'LINKED PROJECT'}
            </Badge>
          </div>
        </div>
        <CardTitle className={`${isMainProject ? 'text-base' : 'text-sm'} font-bold text-gray-900 line-clamp-2 leading-tight`}>
          {project.project_title}
        </CardTitle>
        <CardDescription className="text-xs text-gray-600 line-clamp-2 mt-1">
          {project.project_description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={`text-xs font-medium capitalize ${statusColors[project.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
              {project.status.replace('-', ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
              {project.department}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No date'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{teamSize} {teamSize === 1 ? 'member' : 'members'}</span>
            </div>
          </div>

          {project.total_budget > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Budget:</span>
              <span className="font-medium text-gray-800">${project.total_budget.toLocaleString()}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className={`text-xs font-medium ${
              project.priority === 'critical' ? 'border-red-400 text-red-700' :
              project.priority === 'high' ? 'border-orange-400 text-orange-700' :
              project.priority === 'medium' ? 'border-yellow-400 text-yellow-700' :
              'border-green-400 text-green-700'
            }`}>
              {project.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
            </Badge>
            {project.linkedProjects && project.linkedProjects.length > 0 && (
              <span className="text-xs text-gray-500">{project.linkedProjects.length} linked</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmployeeNode = ({ data }: { data: ObjectiveNode['data'] }) => {
  const employee = data.details as any; // Can be from project or employee data
  const isFromProject = !employee.firstName; // Project employees don't have firstName

  const name = isFromProject ? employee.name : `${employee.firstName} ${employee.lastName || ''}`.trim();
  const isHighLevel = data.level === 3;
  const role = employee.role || employee.jobTitle || 'Employee';
  const department = employee.department || 'Unknown Dept';

  // Determine employee level styling
  const levelColors = {
    3: 'border-green-400 bg-green-50 hover:bg-green-100', // Direct employees
    4: 'border-green-300 bg-green-25 hover:bg-green-75'   // Indirect employees
  };

  const levelBadgeColors = {
    3: 'bg-green-100 text-green-800 border-green-300',
    4: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <Card className={`${isHighLevel ? 'w-56' : 'w-52'} cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 shadow-md ${levelColors[data.level as keyof typeof levelColors] || 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Users className={`${isHighLevel ? 'w-4 h-4' : 'w-3 h-3'} text-green-600`} />
            <Badge variant="outline" className={`text-xs font-semibold ${levelBadgeColors[data.level as keyof typeof levelBadgeColors] || 'bg-gray-100 text-gray-700'}`}>
              {isHighLevel ? 'DIRECT' : 'INDIRECT'}
            </Badge>
          </div>
        </div>
        <CardTitle className={`${isHighLevel ? 'text-sm' : 'text-xs'} font-bold text-gray-900 line-clamp-1 leading-tight`}>
          {name || 'Unknown Employee'}
        </CardTitle>
        <CardDescription className="text-xs text-gray-600 line-clamp-1 mt-1">
          {role}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
              {department}
            </Badge>
            {employee.hours_per_week && (
              <span className="text-xs text-gray-600 font-medium">
                {employee.hours_per_week}h/week
              </span>
            )}
          </div>

          {employee.email && (
            <div className="text-xs text-gray-500 truncate bg-gray-50 px-2 py-1 rounded">
              {employee.email}
            </div>
          )}

          {employee.tasks && employee.tasks.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">{employee.tasks.length}</span> tasks assigned
            </div>
          )}

          {employee.tools_used && employee.tools_used.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {employee.tools_used.slice(0, 2).map((tool: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                  {tool}
                </Badge>
              ))}
              {employee.tools_used.length > 2 && (
                <span className="text-xs text-gray-500">+{employee.tools_used.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Custom node types
const nodeTypes = {
  goalNode: GoalNode,
  projectNode: ProjectNode,
  employeeNode: EmployeeNode,
};

// Main Component
const ObjectiveVisualizationPage = () => {
  // Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState<ObjectiveNode[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Data states
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const companyCode = user.companyCode || '';

      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Build query parameters for company-specific data
      const queryParams = new URLSearchParams();
      if (companyCode) {
        queryParams.append('companyCode', companyCode);
      }
      if (user.email) {
        queryParams.append('userEmail', user.email);
      }

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      console.log('Fetching objective visualization data...');

      // Fetch goals, projects, and employees in parallel with better error handling
      const [goalsRes, projectsRes, employeesRes] = await Promise.all([
        fetch(`/api/goals${queryString}`, { headers }).catch(err => {
          console.error('Goals API error:', err);
          return { ok: false, status: 500, statusText: 'Goals API failed' };
        }),
        fetch(`/api/projects${queryString}`, { headers }).catch(err => {
          console.error('Projects API error:', err);
          return { ok: false, status: 500, statusText: 'Projects API failed' };
        }),
        fetch(`/api/organization/employees${queryString}`, { headers }).catch(err => {
          console.error('Employees API error:', err);
          return { ok: false, status: 500, statusText: 'Employees API failed' };
        })
      ]);

      // Check for critical failures
      if (!goalsRes.ok && goalsRes.status !== 404) {
        throw new Error(`Failed to fetch goals: ${goalsRes.status} ${goalsRes.statusText}`);
      }
      if (!projectsRes.ok && projectsRes.status !== 404) {
        throw new Error(`Failed to fetch projects: ${projectsRes.status} ${projectsRes.statusText}`);
      }

      // Parse responses with fallbacks
      const [goalsData, projectsData, employeesData] = await Promise.all([
        goalsRes.ok && 'json' in goalsRes ? goalsRes.json().catch(() => ({ goals: [] })) : { goals: [] },
        projectsRes.ok && 'json' in projectsRes ? projectsRes.json().catch(() => ({ projects: [] })) : { projects: [] },
        employeesRes.ok && 'json' in employeesRes ? employeesRes.json().catch(() => []) : []
      ]);

      console.log('Raw data received:', {
        goals: goalsData.goals?.length || 0,
        projects: projectsData.projects?.length || 0,
        employees: Array.isArray(employeesData) ? employeesData.length : (employeesData.employees?.length || 0)
      });

      // Process and set data
      let processedGoals = processGoalsData(goalsData.goals || []);
      let processedProjects = processProjectsData(projectsData.projects || []);
      const processedEmployees = processEmployeesData(
        Array.isArray(employeesData) ? employeesData : (employeesData.employees || [])
      );



      setGoals(processedGoals);
      setProjects(processedProjects);
      setEmployees(processedEmployees);

      // Extract unique filter options
      const allDepartments = new Set<string>();
      const allStatuses = new Set<string>();
      const allPriorities = new Set<string>();

      processedGoals.forEach(g => {
        g.department && allDepartments.add(g.department);
        g.status && allStatuses.add(g.status);
        g.priority && allPriorities.add(g.priority);
      });

      processedProjects.forEach(p => {
        p.department && allDepartments.add(p.department);
        p.status && allStatuses.add(p.status);
        p.priority && allPriorities.add(p.priority);
      });

      processedEmployees.forEach(e => {
        e.department && allDepartments.add(e.department);
      });

      setDepartments(Array.from(allDepartments).filter(d => d.trim()).sort());
      setStatuses(Array.from(allStatuses).filter(s => s.trim()).sort());
      setPriorities(Array.from(allPriorities).filter(p => p.trim()).sort());

      console.log('Processed data:', {
        goals: processedGoals.length,
        projects: processedProjects.length,
        employees: processedEmployees.length,
        departments: Array.from(allDepartments).length
      });

      // Build visualization
      buildVisualization(processedGoals, processedProjects, processedEmployees);

      console.log(`Data loaded successfully: ${processedGoals.length} goals, ${processedProjects.length} projects, and ${processedEmployees.length} employees.`);

    } catch (err) {
      console.error('Error loading data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Data processing functions
  const processGoalsData = (rawGoals: any[]): Goal[] => {
    if (!Array.isArray(rawGoals)) {
      console.warn('Goals data is not an array:', rawGoals);
      return [];
    }

    return rawGoals.map((g, index) => {
      try {
        return {
          id: g.id || g._id?.toString() || g.goalId || `goal-${index}`,
          title: g.title || g.goal_title || 'Untitled Goal',
          description: g.description || g.goal_description || '',
          department: g.department || 'Unknown',
          startDate: g.startDate || g.start_date || new Date().toISOString(),
          endDate: g.endDate || g.end_date || new Date().toISOString(),
          priority: ['low', 'medium', 'high', 'critical'].includes(g.priority) ? g.priority : 'medium',
          status: ['planning', 'active', 'completed', 'canceled', 'on-hold'].includes(g.status) ? g.status : 'planning',
          progress: typeof g.progress === 'number' ? Math.max(0, Math.min(100, g.progress)) : 0,
          assignedProjects: Array.isArray(g.assignedProjects) ? g.assignedProjects : [],
          assignedEmployees: Array.isArray(g.assignedEmployees) ? g.assignedEmployees : [],
          kpis: Array.isArray(g.kpis) ? g.kpis : [],
          visibleToAll: Boolean(g.visibleToAll),
          createdByRole: g.createdByRole || g.createdBy || '',
          isManagementGoal: Boolean(g.isManagementGoal)
        };
      } catch (err) {
        console.error('Error processing goal:', g, err);
        return null;
      }
    }).filter(Boolean) as Goal[];
  };

  const processProjectsData = (rawProjects: any[]): Project[] => {
    if (!Array.isArray(rawProjects)) {
      console.warn('Projects data is not an array:', rawProjects);
      return [];
    }

    return rawProjects.map((p, index) => {
      try {
        // Handle linked projects - can be array of IDs or objects
        let linkedProjects: string[] = [];
        if (Array.isArray(p.linkedProjects)) {
          linkedProjects = p.linkedProjects.map((lp: any) =>
            typeof lp === 'string' ? lp : (lp.projectId || lp._id || lp.id || '')
          ).filter(Boolean);
        } else if (Array.isArray(p.linked_projects)) {
          linkedProjects = p.linked_projects.map((lp: any) =>
            typeof lp === 'string' ? lp : (lp.projectId || lp._id || lp.id || '')
          ).filter(Boolean);
        }

        return {
          _id: p._id?.toString() || p.id || `project-${index}`,
          project_title: p.project_title || p.title || 'Untitled Project',
          project_description: p.project_description || p.description || '',
          department: p.department || 'Unknown',
          start_date: p.start_date || p.startDate || '',
          end_date: p.end_date || p.endDate || '',
          status: p.status || 'ongoing',
          priority: ['low', 'medium', 'high', 'critical'].includes(p.priority) ? p.priority : 'medium',
          total_budget: typeof p.total_budget === 'number' ? p.total_budget : (typeof p.budget === 'number' ? p.budget : 0),
          linkedProjects,
          employee_contributions: Array.isArray(p.employee_contributions) ? p.employee_contributions : [],
          employees: Array.isArray(p.employees) ? p.employees : []
        };
      } catch (err) {
        console.error('Error processing project:', p, err);
        return null;
      }
    }).filter(Boolean) as Project[];
  };

  const processEmployeesData = (rawEmployees: any[]): Employee[] => {
    if (!Array.isArray(rawEmployees)) {
      console.warn('Employees data is not an array:', rawEmployees);
      return [];
    }

    return rawEmployees.map((e, index) => {
      try {
        return {
          _id: e._id?.toString() || e.id || `employee-${index}`,
          email: e.email || '',
          firstName: e.firstName || e.first_name || '',
          lastName: e.lastName || e.last_name || '',
          jobTitle: e.jobTitle || e.job_title || e.position || 'Employee',
          department: e.department || 'Unknown',
          officeLocation: e.officeLocation || e.office_location || '',
          salary: e.salary || '',
          toolsProficient: e.toolsProficient || e.tools_proficient || '',
          workMode: e.workMode || e.work_mode || '',
          jobResponsibilities: Array.isArray(e.jobResponsibilities) ? e.jobResponsibilities : []
        };
      } catch (err) {
        console.error('Error processing employee:', e, err);
        return null;
      }
    }).filter(Boolean) as Employee[];
  };

  // Build visualization
  const buildVisualization = (goals: Goal[], projects: Project[], employees: Employee[]) => {
    console.log('Building visualization with:', { goals: goals.length, projects: projects.length, employees: employees.length });

    if (goals.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Filter goals based on selected filters
    let filteredGoals = goals;

    if (selectedGoal !== 'all') {
      filteredGoals = goals.filter(g => g.id === selectedGoal);
    }

    if (selectedDepartment !== 'all') {
      filteredGoals = filteredGoals.filter(g => g.department === selectedDepartment);
    }

    if (selectedStatus !== 'all') {
      filteredGoals = filteredGoals.filter(g => g.status === selectedStatus);
    }

    if (selectedPriority !== 'all') {
      filteredGoals = filteredGoals.filter(g => g.priority === selectedPriority);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredGoals = filteredGoals.filter(g => {
        // Search in goal properties
        const goalMatch = g.title.toLowerCase().includes(query) ||
                         g.description.toLowerCase().includes(query) ||
                         g.department.toLowerCase().includes(query) ||
                         g.status.toLowerCase().includes(query) ||
                         g.priority.toLowerCase().includes(query);

        // Search in assigned projects
        const projectMatch = projects.some(p =>
          g.assignedProjects.some(ap => {
            const projectId = typeof ap === 'string' ? ap : ap.projectId;
            return (projectId === p._id || projectId === p._id.toString()) &&
                   (p.project_title.toLowerCase().includes(query) ||
                    p.project_description.toLowerCase().includes(query) ||
                    p.department.toLowerCase().includes(query));
          })
        );

        // Search in assigned employees
        const employeeMatch = g.assignedEmployees.some(emp =>
          (emp.name && emp.name.toLowerCase().includes(query)) ||
          (emp.email && emp.email.toLowerCase().includes(query)) ||
          (emp.role && emp.role.toLowerCase().includes(query))
        );

        return goalMatch || projectMatch || employeeMatch;
      });
    }

    console.log('Filtered goals:', filteredGoals.length);

    const newNodes: ObjectiveNode[] = [];
    const newEdges: Edge[] = [];

    // NEW - proper spacing
    const LEVEL_HEIGHT = 400; // Vertical spacing between levels
    const GOAL_HORIZONTAL_SPACING = 600; // Horizontal spacing for goals
    const PROJECT_HORIZONTAL_SPACING = 280; // Spacing for projects
    const EMPLOYEE_HORIZONTAL_SPACING = 240; // Spacing for employees

    // Calculate total width needed and center the tree
    const totalGoals = filteredGoals.length;
    const totalWidth = Math.max(1, totalGoals - 1) * GOAL_HORIZONTAL_SPACING;
    const startX = -totalWidth / 2; // Center the tree

    filteredGoals.forEach((goal, goalIndex) => {
      // Level 1: Goal nodes (TOP of tree)
      const goalNodeId = `goal-${goal.id}`;
      const goalX = startX + (goalIndex * GOAL_HORIZONTAL_SPACING);

      newNodes.push({
        id: goalNodeId,
        type: 'goalNode',
        position: { x: goalX, y: 0 }, // Y=0 for top level
        data: {
          id: goal.id,
          type: 'goal',
          level: 1,
          title: goal.title,
          status: goal.status,
          priority: goal.priority,
          department: goal.department,
          startDate: goal.startDate,
          endDate: goal.endDate,
          progress: goal.progress,
          details: goal
        }
      });

      // Level 2: Main projects (directly assigned to goal)
      let mainProjects = projects.filter(p => {
        // Check if project is directly assigned to this goal
        return goal.assignedProjects.some(ap => {
          const projectId = typeof ap === 'string' ? ap : ap.projectId;
          return projectId === p._id || projectId === p._id.toString();
        });
      });

      // If no projects found through assignedProjects, try alternative matching
      if (mainProjects.length === 0) {
        // Try matching by goal ID in project data or other relationships
        mainProjects = projects.filter(p => {
          // Check if project mentions this goal in any way
          return p.project_title.toLowerCase().includes(goal.title.toLowerCase().split(' ')[0]) ||
                 p.project_description.toLowerCase().includes(goal.title.toLowerCase().split(' ')[0]) ||
                 p.department === goal.department;
        }).slice(0, 3); // Limit to 3 projects per goal to avoid clutter
      }

      console.log(`Goal "${goal.title}" has ${mainProjects.length} main projects:`, mainProjects.map(p => p.project_title));

      // Calculate horizontal positioning for main projects (Level 2)
      // NEW - proper distributionÏ
      const projectSpacing = PROJECT_HORIZONTAL_SPACING;
      const totalProjectWidth = Math.max(0, mainProjects.length - 1) * projectSpacing;
      let currentProjectX = goalX - (totalProjectWidth / 2);

      mainProjects.forEach((project) => {
        const projectNodeId = `project-main-${project._id}`;

        newNodes.push({
          id: projectNodeId,
          type: 'projectNode',
          position: { x: currentProjectX, y: LEVEL_HEIGHT }, // Level 2 - below goals
          data: {
            id: project._id,
            type: 'project',
            level: 2,
            title: project.project_title,
            status: project.status,
            priority: project.priority,
            department: project.department,
            startDate: project.start_date,
            endDate: project.end_date,
            details: project
          }
        });

        // Connect goal to main project
        // NEW - visible edges
        const goalToProjectEdge = {
          id: `${goalNodeId}-${projectNodeId}`,
          source: goalNodeId,
          target: projectNodeId,
          type: 'default',
          style: { 
            strokeWidth: 3, 
            stroke: '#8B5CF6',
            strokeDasharray: 'none'
          },
          animated: false,
          markerEnd: {
            type: 'arrow',
            color: '#8B5CF6'
          }
        };
        newEdges.push(goalToProjectEdge);
        console.log('Added goal-to-project edge:', goalToProjectEdge);

        // Level 3: Employees from main projects + Linked projects
        let level3Items: Array<{type: 'employee' | 'project', data: any, id: string}> = [];

        // Add employees from main project (direct employees)
        let projectEmployees = project.employee_contributions || project.employees || [];

        // If no employees found in project, try to find employees from the general employee list
        if (projectEmployees.length === 0) {
          // Find employees that might be working on this project and convert to project employee format
          const matchingEmployees = employees.filter(emp =>
            emp.department === project.department ||
            emp.email.includes(project.department.toLowerCase())
          ).slice(0, 2); // Limit to 2 employees per project

          // Convert Employee type to project employee format
          projectEmployees = matchingEmployees.map(emp => ({
            employee_id: emp.email, // Use email as ID since Employee type doesn't have id
            name: emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.email,
            email: emp.email,
            department: emp.department || 'Unknown',
            role: emp.jobTitle || 'Team Member',
            hours_per_week: 40,
            tasks: emp.jobResponsibilities?.map(r => r.duty || '').filter(Boolean) || ['General duties'],
            tools_used: ['Various tools']
          }));
        }

        projectEmployees.forEach((emp, empIndex) => {
          level3Items.push({
            type: 'employee',
            data: emp,
            id: `emp-direct-${project._id}-${empIndex}`
          });
        });

        // Add linked projects (projects linked to this main project)
        let linkedProjects = projects.filter(p => {
          return project.linkedProjects?.some((lpId: any) => {
            const linkedId = typeof lpId === 'string' ? lpId : (lpId.projectId || lpId._id || '');
            return linkedId === p._id || linkedId === p._id.toString();
          });
        });

        // If no linked projects found through direct links, find projects that might be related
        if (linkedProjects.length === 0) {
          linkedProjects = projects.filter(p =>
            p._id !== project._id && // Don't include the same project
            p.department === project.department && // Same department
            p.project_title.toLowerCase().includes('support') ||
            p.project_title.toLowerCase().includes('assist') ||
            p.project_description.toLowerCase().includes(project.project_title.toLowerCase().split(' ')[0])
          ).slice(0, 1); // Limit to 1 linked project per main project
        }



        linkedProjects.forEach(linkedProject => {
          level3Items.push({
            type: 'project',
            data: linkedProject,
            id: `project-linked-${linkedProject._id}`
          });
        });

        console.log(`Project "${project.project_title}" has ${projectEmployees.length} direct employees and ${linkedProjects.length} linked projects`);

        // Position level 3 items (direct employees and linked projects)
        if (level3Items.length > 0) {
          const employeeSpacing = EMPLOYEE_HORIZONTAL_SPACING; // Use employee spacing
          const totalLevel3Width = level3Items.length * employeeSpacing;
          let level3StartX = currentProjectX - (totalLevel3Width / 2) + (employeeSpacing / 2);

          level3Items.forEach((item, index) => {
            const itemX = level3StartX + (index * employeeSpacing);

            if (item.type === 'employee') {
              // Direct employee from main project (Level 3)
              const empNodeId = item.id;

              newNodes.push({
                id: empNodeId,
                type: 'employeeNode',
                position: { x: itemX, y: LEVEL_HEIGHT * 2 }, // Level 3
                data: {
                  id: item.data.email || item.data.employee_id || empNodeId,
                  type: 'employee',
                  level: 3,
                  title: item.data.name || `${item.data.firstName || ''} ${item.data.lastName || ''}`.trim() || 'Unknown Employee',
                  role: item.data.role || item.data.jobTitle,
                  email: item.data.email,
                  department: item.data.department,
                  details: item.data
                }
              });

              const projectToEmpEdge = {
                id: `${projectNodeId}-${empNodeId}`,
                source: projectNodeId,
                target: empNodeId,
                type: 'smoothstep',
                style: { strokeWidth: 2, stroke: '#10B981' }
              };
              newEdges.push(projectToEmpEdge);
              console.log('Added project-to-employee edge:', projectToEmpEdge);
            } else if (item.type === 'project') {
              // Linked project (Level 3)
              const linkedProjectNodeId = item.id;

              newNodes.push({
                id: linkedProjectNodeId,
                type: 'projectNode',
                position: { x: itemX, y: LEVEL_HEIGHT * 2 }, // Level 3
                data: {
                  id: item.data._id,
                  type: 'project',
                  level: 3,
                  title: item.data.project_title,
                  status: item.data.status,
                  priority: item.data.priority,
                  department: item.data.department,
                  startDate: item.data.start_date,
                  endDate: item.data.end_date,
                  details: item.data
                }
              });

              const projectToLinkedEdge = {
                id: `${projectNodeId}-${linkedProjectNodeId}`,
                source: projectNodeId,
                target: linkedProjectNodeId,
                type: 'smoothstep',
                style: { strokeWidth: 2, stroke: '#3B82F6' }
              };
              newEdges.push(projectToLinkedEdge);
              console.log('Added project-to-linked edge:', projectToLinkedEdge);

              // Level 4: Employees from linked projects (indirect employees)
              let linkedEmployees = item.data.employee_contributions || item.data.employees || [];

              // If no employees found in linked project, find some from the general employee list
              if (linkedEmployees.length === 0) {
                const matchingEmployees = employees.filter(emp =>
                  emp.department === item.data.department ||
                  emp.email.includes('support') ||
                  emp.email.includes('assist')
                ).slice(0, 1); // Limit to 1 indirect employee per linked project

                // Convert to project employee format
                linkedEmployees = matchingEmployees.map(emp => ({
                  employee_id: emp.email,
                  name: emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.email,
                  email: emp.email,
                  department: emp.department || 'Unknown',
                  role: emp.jobTitle || 'Support Staff',
                  hours_per_week: 20, // Part-time for indirect employees
                  tasks: ['Support tasks'],
                  tools_used: ['Support tools']
                }));
              }

              if (linkedEmployees.length > 0) {
                const indirectSpacing = EMPLOYEE_HORIZONTAL_SPACING * 0.8; // Smaller spacing for indirect employees
                const totalEmpWidth = linkedEmployees.length * indirectSpacing;
                let empStartX = itemX - (totalEmpWidth / 2) + (indirectSpacing / 2);

                linkedEmployees.forEach((emp: any, empIndex: number) => {
                  const empNodeId = `emp-indirect-${linkedProjectNodeId}-${empIndex}`;
                  const empX = empStartX + (empIndex * indirectSpacing);

                  newNodes.push({
                    id: empNodeId,
                    type: 'employeeNode',
                    position: { x: empX, y: LEVEL_HEIGHT * 3 }, // Level 4
                    data: {
                      id: emp.email || emp.employee_id || empNodeId,
                      type: 'employee',
                      level: 4,
                      title: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown Employee',
                      role: emp.role || emp.jobTitle,
                      email: emp.email,
                      department: emp.department,
                      details: emp
                    }
                  });

                  const linkedToEmpEdge = {
                    id: `${linkedProjectNodeId}-${empNodeId}`,
                    source: linkedProjectNodeId,
                    target: empNodeId,
                    type: 'smoothstep',
                    style: { strokeWidth: 1.5, stroke: '#10B981', strokeDasharray: '5,5' }
                  };
                  newEdges.push(linkedToEmpEdge);
                  console.log('Added linked-to-employee edge:', linkedToEmpEdge);
                });
              }
            }
          });
        }

        // Move to next project position
        currentProjectX += projectSpacing;
      });

      // If no main projects, still show the goal
      if (mainProjects.length === 0) {
        console.log(`Goal "${goal.title}" has no assigned projects`);
        // Still create the goal node even without projects
      }
    });

    // If no nodes were created, add some helpful information
    if (newNodes.length === 0) {
      console.log('No nodes created. Check data:', { goals: goals.length, projects: projects.length, employees: employees.length });
    }

    console.log(`Built visualization with ${newNodes.length} nodes and ${newEdges.length} edges`);
    console.log('Nodes by type:', {
      goals: newNodes.filter(n => n.data.type === 'goal').length,
      projects: newNodes.filter(n => n.data.type === 'project').length,
      employees: newNodes.filter(n => n.data.type === 'employee').length
    });
    console.log('Sample edges:', newEdges.slice(0, 3));
    console.log('All edge IDs:', newEdges.map(e => e.id));

    setNodes(newNodes as any);
    setEdges(newEdges);

    console.log('Nodes and edges set successfully');

    // Auto-fit view after a short delay to ensure proper rendering
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 1.5
        });
      }
    }, 200);
  };

  // Rebuild visualization when dependencies change
  useEffect(() => {
    if (goals.length > 0) {
      buildVisualization(goals, projects, employees);
    }
  }, [selectedGoal, selectedDepartment, selectedStatus, selectedPriority, searchQuery, goals, projects, employees]);

  // Handle node clicks
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: ObjectiveNode) => {
    setSelectedDetail(node.data);
    setShowDetailModal(true);
  }, []);

  // Handle screenshot
  const handleScreenshot = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `objective-visualization-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success('Screenshot saved successfully!');
    } catch (err) {
      console.error('Screenshot failed:', err);
      toast.error('Failed to save screenshot');
    }
  }, []);



  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle window resize for responsive spacing
  useEffect(() => {
    const handleResize = () => {
      if (goals.length > 0) {
        // Debounce the rebuild to avoid excessive re-renders
        const timeoutId = setTimeout(() => {
          buildVisualization(goals, projects, employees);
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [goals, projects, employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <span className="ml-3 text-lg text-gray-700">Loading objective visualization...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Alert variant="destructive" className="max-w-md m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="mt-4 flex space-x-2">
            <Button onClick={loadData} variant="outline" size="sm">
              <FaSyncAlt className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header - exact copy from org-chart */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 mr-2"
            onClick={() => window.history.back()}
            title="Close"
          >
            <FaTimes className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={loadData}
          >
            <FaSyncAlt className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={handleScreenshot}
          >
            <FaCamera className="w-4 h-4 mr-2" />
            Screenshot
          </Button>

          <div className="relative">
            <Input
              placeholder="Search objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-black placeholder:text-gray-500 border border-gray-300 w-60"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full text-gray-600 hover:bg-transparent"
            >
              <FaSearch className="w-4 h-4" />
            </Button>
          </div>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="bg-white/10 text-white border-white/20 w-44">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Visualization */}
      <div className="flex-1 relative" ref={containerRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-lg">Loading...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedGoal !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'No goals match your current filters. Try adjusting your search criteria.'
                  : 'No goals have been created yet. Create your first goal to start visualizing your objectives.'}
              </p>
              <div className="flex justify-center space-x-3">
                {(searchQuery || selectedGoal !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all') && (
                  <Button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGoal('all');
                      setSelectedDepartment('all');
                      setSelectedStatus('all');
                      setSelectedPriority('all');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <FaUndo className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
                <Button onClick={loadData} variant="outline" size="sm">
                  <FaSyncAlt className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <ReactFlowProvider>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-lg">Loading objective visualization...</span>
              </div>
            }>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                key={`${nodes.length}-${edges.length}`} // Force re-render when data changes
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={(instance: ReactFlowInstance) => {
                  setReactFlowInstance(instance);
                  console.log('ReactFlow initialized with nodes:', nodes.length, 'edges:', edges.length);
                  setTimeout(() => {
                    instance.fitView({ padding: 0.2, duration: 800 });
                    console.log('Fit view applied');
                  }, 1000);
                }}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                  includeHiddenNodes: false,
                  minZoom: 0.1,
                  maxZoom: 1.5
                }}
                attributionPosition="bottom-left"
                minZoom={0.1}
                maxZoom={2.5}
                defaultEdgeOptions={{
                  type: 'default',
                  style: { strokeWidth: 3, stroke: '#888' },
                  markerEnd: { type: 'arrow', color: '#888' }
                }}
                className="bg-gray-50 w-full h-full"
                nodesDraggable={true}
                elementsSelectable={true}
                panOnScroll={true}
                zoomOnScroll={true}
                panOnDrag={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                preventScrolling={true}
                selectNodesOnDrag={false}
                tabIndex={0}
                proOptions={{
                  hideAttribution: true
                }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={16}
                  size={1}
                  color="#aaa"
                />
                <Controls />
                <MiniMap
                  nodeColor="#8B5CF6"
                  maskColor="rgba(255, 255, 255, 0.8)"
                  style={{
                    height: 120,
                    width: 200,
                  }}
                />

              </ReactFlow>
            </Suspense>
          </ReactFlowProvider>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDetail && (
        <DetailModal
          data={selectedDetail}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
};

// Detail Modal Component
const DetailModal = ({ data, onClose }: { data: any; onClose: () => void }): JSX.Element => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'team' | 'tasks'>('overview');

  const renderGoalContent = (goal: Goal) => {
    const statusColors = {
      planning: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800'
    };

    const priorityColors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{goal.title}</h2>
            <p className="text-gray-600 mt-1">{goal.description}</p>
            <div className="flex items-center space-x-3 mt-3">
              <Badge className={`${statusColors[goal.status]} font-medium`}>
                {goal.status.replace('-', ' ').toUpperCase()}
              </Badge>
              <Badge className={`${priorityColors[goal.priority]} font-medium`}>
                {goal.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="outline" className="text-gray-700">
                {goal.department}
              </Badge>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {goal.progress !== undefined && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold text-gray-900">{goal.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'details', 'team'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Start:</span>
                    <span className="ml-2 font-medium">{new Date(goal.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">End:</span>
                    <span className="ml-2 font-medium">{new Date(goal.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Assignments</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Projects:</span>
                    <span className="font-medium">{goal.assignedProjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Employees:</span>
                    <span className="font-medium">{goal.assignedEmployees.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">KPIs:</span>
                    <span className="font-medium">{goal.kpis.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {goal.kpis.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Key Performance Indicators</h4>
                  <div className="space-y-3">
                    {goal.kpis.map((kpi, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">{kpi.name}</h5>
                          <Badge variant="outline" className="text-xs">
                            {kpi.current || 0} / {kpi.target} {kpi.unit}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{kpi.description}</p>
                        {kpi.target && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, ((kpi.current || 0) / kpi.target) * 100)}%` }}
                            />
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Goal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created By</label>
                    <p className="text-gray-900">{goal.createdByRole || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Visibility</label>
                    <p className="text-gray-900">{goal.visibleToAll ? 'All Employees' : 'Restricted'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Management Goal</label>
                    <p className="text-gray-900">{goal.isManagementGoal ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              {goal.assignedEmployees.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Assigned Employees</h4>
                  <div className="space-y-2">
                    {goal.assignedEmployees.map((emp, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{emp.name || 'Unknown Employee'}</p>
                            <p className="text-sm text-gray-600">{emp.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {emp.role || 'Employee'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {goal.assignedProjects.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Assigned Projects</h4>
                  <div className="space-y-2">
                    {goal.assignedProjects.map((project, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">Project ID: {project.projectId}</p>
                            {project.assignedAt && (
                              <p className="text-sm text-gray-600">
                                Assigned: {new Date(project.assignedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProjectContent = (project: Project) => {
    const statusColors = {
      planning: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800'
    };

    const priorityColors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    const teamMembers = project.employee_contributions || project.employees || [];
    const isMainProject = data.level === 2;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{project.project_title}</h2>
            <p className="text-gray-600 mt-1">{project.project_description}</p>
            <div className="flex items-center space-x-3 mt-3">
              <Badge className={`${statusColors[project.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} font-medium`}>
                {project.status.replace('-', ' ').toUpperCase()}
              </Badge>
              <Badge className={`${priorityColors[project.priority as keyof typeof priorityColors]} font-medium`}>
                {project.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="outline" className="text-gray-700">
                {project.department}
              </Badge>
              <Badge variant={isMainProject ? "default" : "outline"} className="text-xs">
                {isMainProject ? 'MAIN PROJECT' : 'LINKED PROJECT'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'details', 'team'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Start:</span>
                    <span className="ml-2 font-medium">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">End:</span>
                    <span className="ml-2 font-medium">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Resources</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium">${project.total_budget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Team Size:</span>
                    <span className="font-medium">{teamMembers.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Linked Projects:</span>
                    <span className="font-medium">{project.linkedProjects?.length || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Project Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project ID</label>
                    <p className="text-gray-900 font-mono text-sm">{project._id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="text-gray-900">{project.department || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-gray-900 capitalize">{project.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <p className="text-gray-900 capitalize">{project.priority}</p>
                  </div>
                </div>
              </div>

              {project.linkedProjects && project.linkedProjects.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Linked Projects</h4>
                  <div className="space-y-2">
                    {project.linkedProjects.map((linkedId, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-mono text-sm text-gray-700">{linkedId}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              {teamMembers.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Team Members</h4>
                  <div className="space-y-3">
                    {teamMembers.map((emp: any, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Users className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown Employee'}
                              </p>
                              <p className="text-sm text-gray-600">{emp.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs mb-1">
                              {emp.role || emp.jobTitle || 'Employee'}
                            </Badge>
                            {emp.hours_per_week && (
                              <p className="text-xs text-gray-500">{emp.hours_per_week}h/week</p>
                            )}
                          </div>
                        </div>
                        {emp.tasks && emp.tasks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 mb-1">Tasks:</p>
                            <div className="flex flex-wrap gap-1">
                              {emp.tasks.slice(0, 3).map((task: string, taskIndex: number) => (
                                <Badge key={taskIndex} variant="outline" className="text-xs">
                                  {task}
                                </Badge>
                              ))}
                              {emp.tasks.length > 3 && (
                                <span className="text-xs text-gray-500">+{emp.tasks.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No team members assigned to this project</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEmployeeContent = (employee: any) => {
    const name = employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee';
    const isDirectEmployee = data.level === 3;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
            <p className="text-gray-600 mt-1">{employee.role || employee.jobTitle || 'Employee'}</p>
            <div className="flex items-center space-x-3 mt-3">
              <Badge variant="outline" className="text-gray-700">
                {employee.department || 'Unknown Dept'}
              </Badge>
              <Badge variant={isDirectEmployee ? "default" : "outline"} className="text-xs">
                {isDirectEmployee ? 'DIRECT EMPLOYEE' : 'INDIRECT EMPLOYEE'}
              </Badge>
              {employee.hours_per_week && (
                <Badge variant="outline" className="text-xs">
                  {employee.hours_per_week}h/week
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'details', 'tasks'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-16">Email:</span>
                    <span className="font-medium">{employee.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-16">Role:</span>
                    <span className="font-medium">{employee.role || employee.jobTitle || 'Employee'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Work Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-20">Department:</span>
                    <span className="font-medium">{employee.department || 'Unknown'}</span>
                  </div>
                  {employee.hours_per_week && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-20">Hours/Week:</span>
                      <span className="font-medium">{employee.hours_per_week}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Employee Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employee ID</label>
                    <p className="text-gray-900 font-mono text-sm">{employee._id || employee.employee_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{employee.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="text-gray-900">{employee.department || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <p className="text-gray-900">{employee.role || employee.jobTitle || 'Employee'}</p>
                  </div>
                </div>
              </div>

              {employee.tools_used && employee.tools_used.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Tools & Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    {employee.tools_used.map((tool: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {employee.tasks && employee.tasks.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Assigned Tasks</h4>
                  <div className="space-y-3">
                    {employee.tasks.map((task: string, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <p className="text-gray-900">{task}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No tasks assigned to this employee</p>
                </div>
              )}

              {employee.jobResponsibilities && employee.jobResponsibilities.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Job Responsibilities</h4>
                  <div className="space-y-3">
                    {employee.jobResponsibilities.map((resp: any, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start">
                          <p className="text-gray-900 flex-1">{resp.duty}</p>
                          <Badge variant="outline" className="text-xs ml-3">
                            {resp.hours}h
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (data.type) {
      case 'goal':
        return renderGoalContent(data.details as Goal);
      case 'project':
        return renderProjectContent(data.details as Project);
      case 'employee':
        return renderEmployeeContent(data.details);
      default:
        return <div className="text-center text-gray-500">Unknown item type</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {data.type === 'goal' && <Target className="w-6 h-6 text-purple-600" />}
            {data.type === 'project' && <Briefcase className="w-6 h-6 text-blue-600" />}
            {data.type === 'employee' && <Users className="w-6 h-6 text-green-600" />}
            <h1 className="text-xl font-bold text-gray-900">
              {data.type === 'goal' ? 'Goal Details' :
               data.type === 'project' ? 'Project Details' : 'Employee Profile'}
            </h1>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="hover:bg-gray-200">
            <FaTimes className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ObjectiveVisualizationPage;