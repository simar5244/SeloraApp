'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaSearch, FaCamera, FaSyncAlt, FaUndo, FaSpinner, FaTimes } from 'react-icons/fa';
import { Target, Users, Briefcase, CheckCircle, Clock, Pause, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  assignedProjects: Array<{ projectId: string; assignedAt?: string; }>;
  assignedEmployees: Array<{ employeeId?: string; name?: string; email?: string; role?: string; }>;
  kpis: Array<{ name?: string; description?: string; target?: number; current?: number; unit?: string; dueDate?: string; }>;
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
  jobResponsibilities?: Array<{ duty: string; hours: number; }>;
}

interface OrgNode {
  id: string;
  type: 'goal' | 'project' | 'employee';
  title: string;
  subtitle?: string;
  status?: string;
  priority?: string;
  department?: string;
  progress?: number;
  role?: string;
  email?: string;
  details: Goal | Project | Employee;
  children: OrgNode[];
  level: number;
  x: number;
  y: number;
  width: number;
}

// Node Component
const OrgChartNode = ({ node, onNodeClick, isExpanded, onToggleExpand }: { 
  node: OrgNode; 
  onNodeClick: (node: OrgNode) => void;
  isExpanded: boolean;
  onToggleExpand: (nodeId: string) => void;
}) => {
  const getNodeColor = () => {
    switch (node.type) {
      case 'goal':
        const priorityColors = {
          low: 'bg-green-50 border-green-300 hover:bg-green-100',
          medium: 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100',
          high: 'bg-orange-50 border-orange-300 hover:bg-orange-100',
          critical: 'bg-red-50 border-red-300 hover:bg-red-100'
        };
        return priorityColors[node.priority as keyof typeof priorityColors] || 'bg-purple-50 border-purple-300 hover:bg-purple-100';
      case 'project':
        return 'bg-blue-50 border-blue-300 hover:bg-blue-100';
      case 'employee':
        return 'bg-green-50 border-green-300 hover:bg-green-100';
      default:
        return 'bg-gray-50 border-gray-300 hover:bg-gray-100';
    }
  };

  const getStatusIcon = () => {
    if (!node.status) return null;
    const icons = {
      planning: <Clock className="w-4 h-4 text-blue-500" />,
      active: <CheckCircle className="w-4 h-4 text-green-500" />,
      completed: <CheckCircle className="w-4 h-4 text-green-600" />,
      'on-hold': <Pause className="w-4 h-4 text-yellow-500" />,
      canceled: <AlertCircle className="w-4 h-4 text-red-500" />
    };
    return icons[node.status as keyof typeof icons];
  };

  const getTypeIcon = () => {
    switch (node.type) {
      case 'goal': return <Target className="w-5 h-5 text-purple-600" />;
      case 'project': return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'employee': return <Users className="w-5 h-5 text-green-600" />;
      default: return null;
    }
  };

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 ${getNodeColor()}`}
      style={{ left: node.x, top: node.y, width: node.width, minHeight: '80px' }}
      onClick={() => onNodeClick(node)}
    >
      <Card className="w-full h-full border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getTypeIcon()}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 truncate">{node.title}</h3>
                {node.subtitle && <p className="text-xs text-gray-600 truncate mt-1">{node.subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              {node.children.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            {node.department && <Badge variant="outline" className="text-xs">{node.department}</Badge>}
            {node.progress !== undefined && (
              <div className="flex items-center space-x-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${node.progress}%` }} />
                </div>
                <span className="text-xs text-gray-600">{node.progress}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Connection Lines Component
const ConnectionLines = ({ nodes, expandedNodes }: { nodes: OrgNode[]; expandedNodes: Set<string> }) => {
  const lines: JSX.Element[] = [];

  const drawConnections = (parentNode: OrgNode) => {
    if (!expandedNodes.has(parentNode.id) || parentNode.children.length === 0) return;

    const parentCenterX = parentNode.x + parentNode.width / 2;
    const parentBottomY = parentNode.y + 80;

    parentNode.children.forEach((child) => {
      const childCenterX = child.x + child.width / 2;
      const childTopY = child.y;
      const verticalLineY = parentBottomY + 20;

      lines.push(
        <g key={`connection-${parentNode.id}-${child.id}`}>
          <line x1={parentCenterX} y1={parentBottomY} x2={parentCenterX} y2={verticalLineY} stroke="#94a3b8" strokeWidth="2" />
          <line x1={parentCenterX} y1={verticalLineY} x2={childCenterX} y2={verticalLineY} stroke="#94a3b8" strokeWidth="2" />
          <line x1={childCenterX} y1={verticalLineY} x2={childCenterX} y2={childTopY - 20} stroke="#94a3b8" strokeWidth="2" />
          <line x1={childCenterX} y1={childTopY - 20} x2={childCenterX} y2={childTopY} stroke="#94a3b8" strokeWidth="2" />
        </g>
      );
      drawConnections(child);
    });
  };

  nodes.forEach(rootNode => {
    if (rootNode.level === 0) drawConnections(rootNode);
  });

  return <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>{lines}</svg>;
};

// Detail Modal
const DetailModal = ({ data, onClose }: { data: OrgNode; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {data.type === 'goal' && <Target className="w-6 h-6 text-purple-600" />}
          {data.type === 'project' && <Briefcase className="w-6 h-6 text-blue-600" />}
          {data.type === 'employee' && <Users className="w-6 h-6 text-green-600" />}
          <h1 className="text-xl font-bold text-gray-900">
            {data.type === 'goal' ? 'Goal Details' : data.type === 'project' ? 'Project Details' : 'Employee Profile'}
          </h1>
        </div>
        <Button onClick={onClose} variant="ghost" size="sm"><FaTimes className="w-4 h-4" /></Button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{data.title}</h2>
            {data.subtitle && <p className="text-gray-600 mt-1">{data.subtitle}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {data.department && (
              <div>
                <label className="text-sm font-medium text-gray-500">Department</label>
                <p className="text-gray-900">{data.department}</p>
              </div>
            )}
            {data.status && (
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge className="mt-1">{data.status}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main Component
const InsightView = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsResponse, projectsResponse, employeesResponse] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/projects'),
        fetch('/api/employees')
      ]);

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setGoals(processGoalsData(goalsData));
      }
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(processProjectsData(projectsData));
      }
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(processEmployeesData(employeesData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const processGoalsData = (rawGoals: any[]): Goal[] => {
    return rawGoals.map(goal => ({
      id: goal._id || goal.id,
      title: goal.title || 'Untitled Goal',
      description: goal.description || '',
      department: goal.department || 'General',
      startDate: goal.startDate || goal.start_date || '',
      endDate: goal.endDate || goal.end_date || '',
      priority: goal.priority || 'medium',
      status: goal.status || 'planning',
      progress: goal.progress || 0,
      assignedProjects: goal.assignedProjects || [],
      assignedEmployees: goal.assignedEmployees || [],
      kpis: goal.kpis || [],
      visibleToAll: goal.visibleToAll || false,
      createdByRole: goal.createdByRole || '',
      isManagementGoal: goal.isManagementGoal || false,
    }));
  };

  const processProjectsData = (rawProjects: any[]): Project[] => {
    return rawProjects.map(project => ({
      _id: project._id || project.id,
      project_title: project.project_title || project.title || 'Untitled Project',
      project_description: project.project_description || project.description || '',
      department: project.department || 'General',
      start_date: project.start_date || project.startDate || '',
      end_date: project.end_date || project.endDate || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      total_budget: project.total_budget || project.budget || 0,
      linkedProjects: project.linkedProjects || [],
      employee_contributions: project.employee_contributions || [],
      employees: project.employees || [],
    }));
  };

  const processEmployeesData = (rawEmployees: any[]): Employee[] => {
    return rawEmployees.map(employee => ({
      _id: employee._id || employee.id,
      email: employee.email || '',
      firstName: employee.firstName || employee.first_name || 'Unknown',
      lastName: employee.lastName || employee.last_name || '',
      jobTitle: employee.jobTitle || employee.job_title || 'Employee',
      department: employee.department || 'General',
      officeLocation: employee.officeLocation || employee.office_location || '',
      salary: employee.salary || '',
      toolsProficient: employee.toolsProficient || employee.tools_proficient || '',
      workMode: employee.workMode || employee.work_mode || '',
      jobResponsibilities: employee.jobResponsibilities || employee.job_responsibilities || [],
    }));
  };

  const calculateLayout = useCallback((filteredGoals: Goal[]) => {
    const nodes: OrgNode[] = [];
    const NODE_WIDTH = 280;
    const NODE_HEIGHT = 80;
    const HORIZONTAL_SPACING = 40;
    const VERTICAL_SPACING = 120;
    
    let currentY = 50;
    const totalGoalsWidth = filteredGoals.length * NODE_WIDTH + (filteredGoals.length - 1) * HORIZONTAL_SPACING;
    const containerWidth = Math.max(1200, totalGoalsWidth + 200);
    
    filteredGoals.forEach((goal, goalIndex) => {
      const goalX = (containerWidth - totalGoalsWidth) / 2 + goalIndex * (NODE_WIDTH + HORIZONTAL_SPACING);
      
      const goalNode: OrgNode = {
        id: goal.id,
        type: 'goal',
        title: goal.title,
        subtitle: goal.description,
        status: goal.status,
        priority: goal.priority,
        department: goal.department,
        progress: goal.progress,
        details: goal,
        children: [],
        level: 0,
        x: goalX,
        y: currentY,
        width: NODE_WIDTH
      };

      const goalProjects = projects.filter(project => 
        goal.assignedProjects.some(ap => ap.projectId === project._id)
      );

      if (goalProjects.length > 0) {
        const projectsY = currentY + NODE_HEIGHT + VERTICAL_SPACING;
        const totalProjectsWidth = goalProjects.length * NODE_WIDTH + (goalProjects.length - 1) * HORIZONTAL_SPACING;
        const projectsStartX = goalX + (NODE_WIDTH - totalProjectsWidth) / 2;

        goalProjects.forEach((project, projectIndex) => {
          const projectX = projectsStartX + projectIndex * (NODE_WIDTH + HORIZONTAL_SPACING);
          
          const projectNode: OrgNode = {
            id: project._id,
            type: 'project',
            title: project.project_title,
            subtitle: project.project_description,
            status: project.status,
            priority: project.priority,
            department: project.department,
            details: project,
            children: [],
            level: 1,
            x: projectX,
            y: projectsY,
            width: NODE_WIDTH
          };

          const projectEmployees = project.employees || [];
          
          if (projectEmployees.length > 0) {
            const employeesY = projectsY + NODE_HEIGHT + VERTICAL_SPACING;
            const totalEmployeesWidth = projectEmployees.length * NODE_WIDTH + (projectEmployees.length - 1) * HORIZONTAL_SPACING;
            const employeesStartX = projectX + (NODE_WIDTH - totalEmployeesWidth) / 2;

            projectEmployees.forEach((empData, empIndex) => {
              const employeeX = employeesStartX + empIndex * (NODE_WIDTH + HORIZONTAL_SPACING);
              
              const employeeNode: OrgNode = {
                id: `${project._id}-emp-${empIndex}`,
                type: 'employee',
                title: empData.name,
                subtitle: empData.role,
                department: empData.department,
                email: empData.email,
                details: empData as any,
                children: [],
                level: 2,
                x: employeeX,
                y: employeesY,
                width: NODE_WIDTH
              };

              projectNode.children.push(employeeNode);
              nodes.push(employeeNode);
            });
          }

          goalNode.children.push(projectNode);
          nodes.push(projectNode);
        });
      }

      nodes.push(goalNode);
    });

    return nodes;
  }, [projects]);

  useEffect(() => {
    if (goals.length === 0) return;

    let filteredGoals = goals.filter(goal => {
      const matchesSearch = !searchTerm || 
        goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'All Departments' || goal.department === departmentFilter;
      const matchesStatus = statusFilter === 'All Status' || goal.status === statusFilter;
      const matchesPriority = priorityFilter === 'All Priorities' || goal.priority === priorityFilter;

      return matchesSearch && matchesDepartment && matchesStatus && matchesPriority;
    });

    const newNodes = calculateLayout(filteredGoals);
    setOrgNodes(newNodes);
    
    const allNodeIds = new Set(newNodes.map(node => node.id));
    setExpandedNodes(allNodeIds);
  }, [goals, projects, employees, searchTerm, departmentFilter, statusFilter, priorityFilter, calculateLayout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNodeClick = (node: OrgNode) => setSelectedNode(node);
  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleExportImage = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = 'insight-view.png';
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Chart exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export chart');
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setDepartmentFilter('All Departments');
    setStatusFilter('All Status');
    setPriorityFilter('All Priorities');
    const allNodeIds = new Set(orgNodes.map(node => node.id));
    setExpandedNodes(allNodeIds);
  };

  const departments = ['All Departments', ...new Set(goals.map(g => g.department))];
  const statuses = ['All Status', ...new Set(goals.map(g => g.status))];
  const priorities = ['All Priorities', ...new Set(goals.map(g => g.priority))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading insight view...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">Insight View</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={handleExportImage} variant="outline" size="sm" className="flex items-center space-x-2">
                <FaCamera className="w-4 h-4" />
                <span>Export</span>
              </Button>
              <Button onClick={loadData} variant="outline" size="sm" className="flex items-center space-x-2">
                <FaSyncAlt className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm" className="flex items-center space-x-2">
                <FaUndo className="w-4 h-4" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Search objectives..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map(priority => (
                  <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="relative overflow-auto" style={{ height: 'calc(100vh - 140px)' }}>
        <div 
          ref={containerRef}
          className="relative min-w-full min-h-full"
          style={{ 
            width: Math.max(1200, orgNodes.length > 0 ? Math.max(...orgNodes.map(n => n.x + n.width)) + 100 : 1200),
            height: Math.max(600, orgNodes.length > 0 ? Math.max(...orgNodes.map(n => n.y)) + 200 : 600)
          }}
        >
          <ConnectionLines nodes={orgNodes} expandedNodes={expandedNodes} />
          <div className="relative" style={{ zIndex: 2 }}>
            {orgNodes.map(node => (
              <OrgChartNode
                key={node.id}
                node={node}
                onNodeClick={handleNodeClick}
                isExpanded={expandedNodes.has(node.id)}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedNode && <DetailModal data={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  );
};

export default InsightView;
