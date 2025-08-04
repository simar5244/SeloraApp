'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  BackgroundVariant,
  MiniMap,
  Node,
  Edge,
  ReactFlowInstance,
  MarkerType,
  Handle,
  Position,
  EdgeProps,
  getStraightPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import './styles.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaSearch, FaFilter, FaTimes, FaCamera, FaSyncAlt, FaUndo, FaExpandAlt, FaSpinner } from 'react-icons/fa';
import { Target, Users, Briefcase, Calendar, AlertCircle, CheckCircle, Clock, Pause, ChevronRight } from 'lucide-react';
import Link from 'next/link';
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
    title?: string;
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
    high: 'border-amber-100 bg-amber-50 hover:bg-amber-100',
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
    <div className="relative">
      {/* Output handle for connecting to projects */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="goal-output"
        style={{ background: '#8B5CF6', border: '2px solid #ffffff' }}
      />
      
      <Card className={`w-80 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${priorityColors[goal.priority]} border-2 shadow-md flex flex-col h-full`}>
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
        <CardContent className="pt-0 mt-auto">
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Start: {new Date(goal.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1 justify-end">
                <span>End: {new Date(goal.endDate).toLocaleDateString()}</span>
                <Calendar className="w-3 h-3 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Badge variant="outline" className={`text-xs font-medium ${
                goal.priority === 'critical' ? 'border-red-400 bg-red-100 text-red-700' :
                goal.priority === 'high' ? 'border-amber-400 bg-amber-100 text-amber-700' :
                goal.priority === 'medium' ? 'border-yellow-400 bg-yellow-100 text-yellow-700' :
                'border-green-400 bg-green-100 text-green-700'
              }`}>
                {goal.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
                {goal.department}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProjectNode = ({ data }: { data: ObjectiveNode['data'] }) => {
  const project = data.details as Project;
  const isMainProject = data.level === 2;

  const priorityColors = {
    low: 'border-green-400 bg-green-50 hover:bg-green-100',
    medium: 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100',
    high: 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100',
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
    <div className="relative">
      {/* Input handle for connections from goals or other projects */}
      <Handle
        type="target"
        position={Position.Top}
        id="project-input"
        style={{ background: '#3B82F6', border: '2px solid #ffffff' }}
      />
      
      {/* Output handle for connecting to employees or linked projects */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="project-output"
        style={{ background: '#3B82F6', border: '2px solid #ffffff' }}
      />
      
      <Card className={`w-96 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 shadow-md ${priorityColors[project.priority as keyof typeof priorityColors] || 'border-gray-400 bg-gray-50 hover:bg-gray-100'} flex flex-col h-full`} style={{
        backgroundColor: project.priority === 'high' ? '#FFEDD5' : undefined,
        borderLeft: project.priority === 'high' ? '2px solid #EA580C' : undefined,
        borderColor: project.priority === 'high' ? '#EA580C' : undefined
      }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Briefcase className={`${isMainProject ? 'w-5 h-5' : 'w-4 h-4'} text-blue-600`} />
              <Badge variant={isMainProject ? "default" : "outline"} className={`text-xs font-semibold ${
                isMainProject ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700'
              }`}>
                {isMainProject ? 'MAIN PROJECT' : 'LINKED PROJECT'}
              </Badge>
            </div>
            <Badge className={`text-xs font-medium capitalize ${statusColors[project.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
              {project.status.replace('-', ' ')}
            </Badge>
          </div>
          <div className="mt-2">
            <CardTitle className={`${isMainProject ? 'text-base' : 'text-sm'} font-bold text-gray-900 line-clamp-2 leading-tight`}>
              {project.project_title}
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 line-clamp-2 mt-1">
              {project.project_description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-2">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1 justify-end">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>End: {new Date(project.end_date).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="text-xs font-medium mb-2">
              Budget: <span className="text-green-600">${project.total_budget > 0 ? project.total_budget.toLocaleString() : 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Badge variant="outline" className={`text-xs font-medium ${
                project.priority === 'critical' ? 'border-red-400 bg-red-50 text-red-700' :
                project.priority === 'high' ? 'border-amber-400 bg-amber-50 text-amber-700' :
                project.priority === 'medium' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                'border-green-400 bg-green-50 text-green-700'
              }`}>
                {project.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
              </Badge>
              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
                {project.department || 'Unknown'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
    <div className="relative">
      {/* Input handle for connections from projects */}
      <Handle
        type="target"
        position={Position.Top}
        id="employee-input"
        style={{ background: '#10B981', border: '2px solid #ffffff' }}
      />
      
      <Card className={`${isHighLevel ? 'w-64' : 'w-60'} cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 shadow-md ${levelColors[data.level as keyof typeof levelColors] || 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Users className={`${isHighLevel ? 'w-4 h-4' : 'w-3 h-3'} text-green-600`} />
              <Badge variant="outline" className={`text-xs font-semibold ${levelBadgeColors[data.level as keyof typeof levelBadgeColors] || 'bg-gray-100 text-gray-700'}`}>
                {isHighLevel ? 'DIRECT' : 'INDIRECT'}
              </Badge>
            </div>
          </div>
        <div className="mb-3">
          <CardTitle className={`${isHighLevel ? 'text-sm' : 'text-xs'} font-bold text-gray-900 line-clamp-1 leading-tight`}>
            {name || 'Unknown Employee'}
          </CardTitle>
          <CardDescription className="text-xs text-gray-600 line-clamp-1 mt-1">
            {role}
          </CardDescription>
        </div>
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
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

// Custom Edge Component - Only horizontal and vertical lines like org-chart
const CustomObjectiveEdge: React.FC<EdgeProps> = (props) => {
  const { sourceX, sourceY, targetX, targetY, id, style } = props;
  
  // Force solid line by creating a new style object that overrides any dash patterns
  const edgeStyle = {
    ...style,
    strokeDasharray: '0',
    strokeDashoffset: '0',
  };
  
  // Calculate path with only horizontal and vertical lines - improved version
  // Use source and target handle positions for better alignment
  const midY = sourceY + Math.abs(targetY - sourceY) / 2;
  
  // Create clean step-path: down from source, horizontal to target X, down to target
  // This ensures proper horizontal and vertical only connections
  const path = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
  
  // Debug: Log the style to check for any overrides
  console.log('Edge styles:', { id, style, edgeStyle });
  
  return (
    <g>
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        stroke={edgeStyle.stroke || '#374151'}
        strokeWidth={edgeStyle.strokeWidth || 2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0"
        strokeDashoffset="0"
        markerEnd={props.markerEnd}
      />
      {/* Add connection points for better visual clarity */}
      <circle
        cx={sourceX}
        cy={midY}
        r="2"
        fill={style?.stroke || '#374151'}
        opacity="0.6"
      />
      <circle
        cx={targetX}
        cy={midY}
        r="2"
        fill={style?.stroke || '#374151'}
        opacity="0.6"
      />
    </g>
  );
};

// Custom node types
const nodeTypes = {
  goalNode: GoalNode,
  projectNode: ProjectNode,
  employeeNode: EmployeeNode,
};

// Custom edge types
const edgeTypes = {
  customObjective: CustomObjectiveEdge,
};

// Layout constants - optimized for symmetrical heap layout
const LEVEL_HEIGHT = 450; // Increased by 15% from 300
const NODE_WIDTH = 200;
const NODE_PADDING = 50;
const HORIZONTAL_GAP = 10; // Reduced by 25% from 100
const MIN_NODE_SPACING = 10; // Minimum space between nodes to prevent overlap

// Heap sort utility for symmetrical arrangement
const heapSort = (arr: any[], compareFn: (a: any, b: any) => number): any[] => {
  const sorted = [...arr].sort(compareFn);
  
  // Arrange in heap-like symmetrical structure
  if (sorted.length <= 1) return sorted;
  
  const result: any[] = [];
  const queue = [...sorted];
  
  // Place center item first
  const centerIndex = Math.floor(queue.length / 2);
  result.push(queue.splice(centerIndex, 1)[0]);
  
  // Alternate left and right placement for symmetry
  let left = true;
  while (queue.length > 0) {
    if (left && queue.length > 0) {
      result.unshift(queue.shift()!);
    }
    if (!left && queue.length > 0) {
      result.push(queue.pop()!);
    }
    left = !left;
  }
  
  return result;
};

// Enhanced layout utility functions with heap symmetry and abnormal data handling
const calculateSubtreeWidth = (nodeId: string, graph: Record<string, string[]>, subtreeWidths: Record<string, number>): number => {
  const children = graph[nodeId] || [];
  
  // Handle abnormal case: no children
  if (children.length === 0) {
    const width = NODE_WIDTH + NODE_PADDING;
    subtreeWidths[nodeId] = width;
    return width;
  }
  
  // Handle abnormal case: too many children (> 10)
  const maxChildren = Math.min(children.length, 10); // Limit for visual clarity
  const activeChildren = children.slice(0, maxChildren);
  
  // Recursively calculate children widths
  const childrenWidths = activeChildren.map(childId => 
    calculateSubtreeWidth(childId, graph, subtreeWidths)
  );
  
  const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0);
  const spacingWidth = Math.max(0, (activeChildren.length - 1) * HORIZONTAL_GAP);
  
  // Ensure minimum width and symmetric distribution
  const calculatedWidth = totalChildrenWidth + spacingWidth;
  const minimumWidth = NODE_WIDTH + NODE_PADDING;
  const width = Math.max(minimumWidth, calculatedWidth);
  
  subtreeWidths[nodeId] = width;
  return width;
};

const applySymmetricalLayout = (nodes: ObjectiveNode[], edges: Edge[]): ObjectiveNode[] => {
  if (!nodes.length) return [];
  
  // Build graph structure with validation
  const graph: Record<string, string[]> = {};
  const parentMap: Record<string, string> = {};
  const nodeMap: Record<string, ObjectiveNode> = {};
  
  // Initialize graph and validate nodes
  nodes.forEach(node => {
    if (!node || !node.id) {
      console.warn('Invalid node detected, skipping:', node);
      return;
    }
    graph[node.id] = [];
    nodeMap[node.id] = node;
  });
  
  // Fill graph with connections and validate edges
  edges.forEach(edge => {
    if (!edge || !edge.source || !edge.target) {
      console.warn('Invalid edge detected, skipping:', edge);
      return;
    }
    
    // Only add edge if both nodes exist
    if (graph[edge.source] && nodeMap[edge.target]) {
      graph[edge.source].push(edge.target);
      parentMap[edge.target] = edge.source;
    }
  });
  
  // Find root nodes (goals without parents) - handle abnormal case of no roots
  const rootNodes = nodes.filter(node => !parentMap[node.id]).map(node => node.id);
  if (rootNodes.length === 0) {
    console.warn('No root nodes found, using first node as root');
    rootNodes.push(nodes[0].id);
  }
  
  // Calculate levels with heap-like distribution
  const levels: Record<string, number> = {};
  rootNodes.forEach(nodeId => {
    levels[nodeId] = 0;
  });
  
  const queue = [...rootNodes];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const children = graph[nodeId] || [];
    
    children.forEach(childId => {
      levels[childId] = levels[nodeId] + 1;
      queue.push(childId);
    });
  }
  
  // Group nodes by level
  const nodesByLevel: Record<number, string[]> = {};
  Object.keys(levels).forEach(nodeId => {
    const level = levels[nodeId];
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(nodeId);
  });
  
  const maxLevel = Math.max(...Object.keys(nodesByLevel).map(Number));
  
  // Calculate subtree widths for heap-like symmetry
  const subtreeWidths: Record<string, number> = {};
  
  // Process from bottom to top
  for (let level = maxLevel; level >= 0; level--) {
    const levelNodes = nodesByLevel[level] || [];
    for (const nodeId of levelNodes) {
      calculateSubtreeWidth(nodeId, graph, subtreeWidths);
    }
  }
  
  // Position nodes with symmetrical arrangement
  const nodePositions: Record<string, { x: number, y: number }> = {};
  
  // Position root nodes symmetrically
  let currentX = 0;
  const totalRootWidth = rootNodes.reduce((sum, rootId) => sum + subtreeWidths[rootId], 0) + 
                        (rootNodes.length - 1) * HORIZONTAL_GAP;
  
  let startX = -totalRootWidth / 2;
  
  for (const rootId of rootNodes) {
    nodePositions[rootId] = {
      x: startX + subtreeWidths[rootId] / 2 - NODE_WIDTH / 2,
      y: 0
    };
    startX += subtreeWidths[rootId] + HORIZONTAL_GAP;
  }
  
  // Position children recursively with heap symmetry
  const positionChildren = (parentId: string, parentLevel: number) => {
    const children = graph[parentId] || [];
    if (children.length === 0) return;
    
    // Sort children for heap-like symmetrical arrangement
    const sortedChildren = heapSort(children, (a, b) => {
      const nodeA = nodeMap[a];
      const nodeB = nodeMap[b];
      
      // Sort by type (projects before employees), then by priority, then by title
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }; // unchanged
      const typeOrder = { goal: 0, project: 1, employee: 2 };
      
      const aPriority = priorityOrder[nodeA?.data?.priority as keyof typeof priorityOrder] ?? 2;
      const bPriority = priorityOrder[nodeB?.data?.priority as keyof typeof priorityOrder] ?? 2;
      
      // Compare by type first to group projects together
      const aType = typeOrder[nodeA?.data?.type as keyof typeof typeOrder] ?? 2;
      const bType = typeOrder[nodeB?.data?.type as keyof typeof typeOrder] ?? 2;
      if (aType !== bType) return aType - bType;
      // Then compare by priority
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      
      
      return (nodeA?.data?.title || '').localeCompare(nodeB?.data?.title || '');
    });
    
    // Get parent position
    const parentPos = nodePositions[parentId];
    if (!parentPos) return;
    
    const parentX = parentPos.x + NODE_WIDTH / 2; // Center of parent
    const childLevel = parentLevel + 1;
    const childY = childLevel * LEVEL_HEIGHT;
    
    // Calculate total width needed for all children
    const totalWidth = sortedChildren.reduce((sum, childId) => sum + subtreeWidths[childId], 0) +
                      Math.max(0, (sortedChildren.length - 1) * HORIZONTAL_GAP);
    
    // Start positioning from left edge of the available space
    let currentX = parentX - totalWidth / 2;
    
    sortedChildren.forEach(childId => {
      const childWidth = subtreeWidths[childId];
      const childX = currentX + childWidth / 2 - NODE_WIDTH / 2;
      
      // Ensure minimum spacing to prevent overlap
      const adjustedX = Math.max(currentX, childX);
      
      nodePositions[childId] = {
        x: adjustedX,
        y: childY
      };
      
      currentX += childWidth + HORIZONTAL_GAP;
      
      // Recursively position this child's children
      positionChildren(childId, childLevel);
    });
  };
  
  // Apply positioning to all root nodes and their descendants
  rootNodes.forEach(rootId => {
    positionChildren(rootId, 0);
  });
  
  // Return nodes with updated positions
  return nodes.map(node => {
    const position = nodePositions[node.id];
    return position ? {
      ...node,
      position: {
        x: position.x,
        y: position.y
      },
      style: {
        ...node.style,
        width: NODE_WIDTH,
        height: 'auto'
      }
    } : node;
  });
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
  
  // Handler for new connections (maintain edge type consistency)
  const onConnect = useCallback((params: any) => {
    const newEdge = {
      ...params,
      id: `${params.source}-${params.target}`,
      type: 'customObjective',
      style: { 
        strokeWidth: 2, 
        stroke: '#374151',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    };
    setEdges(eds => [...eds, newEdge]);
  }, [setEdges]);
  
  // Force relayout function similar to org-chart
  const forceRelayout = useCallback(() => {
    if (nodes.length > 0 && edges.length > 0) {
      const relayoutedNodes = applySymmetricalLayout(nodes as unknown as ObjectiveNode[], edges).map(node => ({
        ...node,
        draggable: true,
        focusable: true,
        style: {
          ...node.style,
          cursor: 'grab'
        }
      }));
      setNodes(relayoutedNodes as any);
      
      // Fit view after relayout
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({
            padding: 0.2,
            includeHiddenNodes: false,
            minZoom: 0.1,
            maxZoom: 1.5,
            duration: 800
          });
        }
      }, 100);
    }
  }, [nodes, edges, reactFlowInstance, setNodes]);

  // Data states
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);
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
      buildVisualization(
        processedGoals, 
        processedProjects, 
        processedEmployees,
        selectedGoal,
        selectedDepartment,
        selectedStatus,
        selectedPriority,
        searchQuery
      );

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
  const buildVisualization = useCallback((goals: Goal[], projects: Project[], employees: Employee[], 
    selectedGoal?: string, selectedDepartment?: string, selectedStatus?: string, 
    selectedPriority?: string, searchQuery?: string) => {
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
    
    // Proper tree layout algorithm to prevent branch crossings
    // First pass: calculate the width each subtree needs
    const calculateSubtreeWidth = (goalId: string, goalProjects: any[]): number => {
      let totalWidth = 0;
      
      goalProjects.forEach(project => {
        // Count direct employees for this project
        const directEmployees = project.employee_contributions?.length || 0;
        
        // Count linked projects (limit to 1 per main project)
        const linkedProjectsCount = 1; // We limit to 1 linked project per main project
        
        // Each project needs space for its employees and linked projects
        // Use consistent spacing based on our spacing constants
        const projectSubtreeWidth = Math.max(
          NODE_WIDTH, // Minimum width for the project itself
          (directEmployees + linkedProjectsCount) * EMPLOYEE_HORIZONTAL_SPACING
        );
        
        totalWidth += projectSubtreeWidth + PROJECT_HORIZONTAL_SPACING;
      });
      
      return Math.max(totalWidth - HORIZONTAL_GAP, NODE_WIDTH); // Remove last gap
    };
    
    // Track allocated areas for each goal to prevent crossings
    const goalAreas: Record<string, {start: number, end: number}> = {};
    
    // Track nodes by level and their positions to ensure proper tree layout
    const levelNodes: Record<number, { id: string, width: number, position: {x: number, y: number} }[]> = {
      1: [], // Goals (level 1)
      2: [], // Projects (level 2)
      3: [], // Direct employees and linked projects (level 3)
      4: []  // Indirect employees (level 4)
    };
    
    // Track employee IDs to prevent duplicates and ensure they're properly positioned
    const employeeTracker: Record<string, { 
      nodeIds: string[], // IDs of nodes representing this employee
      parentIds: string[], // IDs of parent nodes (projects) this employee is connected to
      positions: {x: number, y: number}[] // Positions of each instance of this employee
    }> = {};

    // Layout constants for tree visualization
    const NODE_WIDTH = 320; // Width of node cards
    const NODE_HEIGHT = 180; // Approximate height of node cards
    const LEVEL_HEIGHT = 400; // Vertical space between levels
    const HORIZONTAL_GAP = 240; // Minimum horizontal gap between nodes (increased for better spacing)
    
    // Calculate spacing based on node dimensions and gap
    const GOAL_HORIZONTAL_SPACING = NODE_WIDTH + HORIZONTAL_GAP * 2; // Spacing for goals
    const PROJECT_HORIZONTAL_SPACING = NODE_WIDTH + HORIZONTAL_GAP * 2; // Spacing for projects
    const EMPLOYEE_HORIZONTAL_SPACING = NODE_WIDTH + HORIZONTAL_GAP; // Consistent spacing for employees
    
    // Helper function to create marker end for edges
    const createMarkerEnd = (color: string | undefined) => {
      return {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: color || '#888888' // Default color if undefined
      };
    };

    // Calculate total width needed and center the tree
    const totalGoals = filteredGoals.length;
    const totalWidth = Math.max(1, totalGoals - 1) * GOAL_HORIZONTAL_SPACING;
    const startX = -totalWidth / 2; // Center the tree

    // First pass: calculate areas for each goal
    let currentX = startX;
    filteredGoals.forEach((goal, goalIndex) => {
      const goalNodeId = `goal-${goal.id}`;
      
      // Get projects for this goal
      let mainProjects = projects.filter(p => {
        return goal.assignedProjects.some(ap => {
          const projectId = typeof ap === 'string' ? ap : ap.projectId;
          return projectId === p._id || projectId === p._id.toString();
        });
      });
      
      if (mainProjects.length === 0) {
        mainProjects = projects.filter(p => {
          return p.project_title.toLowerCase().includes(goal.title.toLowerCase().split(' ')[0]) ||
                 p.project_description.toLowerCase().includes(goal.title.toLowerCase().split(' ')[0]) ||
                 p.department === goal.department;
        }).slice(0, 3);
      }
      
      // Calculate the width this goal's subtree needs
      const subtreeWidth = calculateSubtreeWidth(goal.id, mainProjects);
      
      // Allocate area for this goal
      const goalX = currentX + (subtreeWidth / 2); // Center the goal in its allocated area
      goalAreas[goal.id] = {
        start: currentX,
        end: currentX + subtreeWidth
      };
      
      currentX += subtreeWidth + HORIZONTAL_GAP * 2; // Move to next area

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
      
      // Track this goal node in level 1
      levelNodes[1].push({
        id: goalNodeId,
        width: NODE_WIDTH,
        position: { x: goalX, y: 0 }
      });

      // Level 2: Main projects (directly assigned to goal) - use the projects we already calculated
      console.log(`Goal "${goal.title}" has ${mainProjects.length} main projects:`, mainProjects.map(p => p.project_title));

      // Position projects symmetrically within this goal's allocated area
      const goalArea = goalAreas[goal.id];
      const availableWidth = goalArea.end - goalArea.start;
      
      // Ensure minimum width for proper spacing
      const effectiveWidth = Math.max(availableWidth, mainProjects.length * PROJECT_HORIZONTAL_SPACING);
      
      mainProjects.forEach((project, projectIndex) => {
        const projectNodeId = `project-main-${goal.id}-${project._id}`;
        
        // Center projects symmetrically under the goal
        let projectX;
        if (mainProjects.length === 1) {
          // Single project: center it under the goal
          projectX = goalX;
        } else {
          // Multiple projects: distribute them symmetrically with consistent spacing
          const projectSpacing = PROJECT_HORIZONTAL_SPACING; // Use consistent spacing
          const totalProjectsWidth = (mainProjects.length - 1) * projectSpacing;
          const startX = goalX - (totalProjectsWidth / 2);
          projectX = startX + (projectIndex * projectSpacing);
        }

        newNodes.push({
          id: projectNodeId,
          type: 'projectNode',
          position: { x: projectX, y: LEVEL_HEIGHT }, // Level 2 - below goals
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
        
        // Track this project node in level 2
        levelNodes[2].push({
          id: projectNodeId,
          width: NODE_WIDTH,
          position: { x: projectX, y: LEVEL_HEIGHT }
        });

        // Connect goal to main project with custom edge type
        // Get goal priority to determine edge color
        const goalPriority = goal.priority || 'medium';
        const goalEdgeColor = {
          low: '#10B981',      // green
          medium: '#F59E0B',   // yellow
          high: '#10B981',     // orange
          critical: '#EF4444'  // red
        }[goalPriority];
        
        const goalToProjectEdge: Edge = {
          id: `goal-${goal.id}-project-${project._id}`,
          source: goalNodeId,
          target: projectNodeId,
          type: 'customObjective',
          style: { 
            strokeWidth: 3, 
            stroke: goalEdgeColor
          },
          animated: false,
          markerEnd: createMarkerEnd(goalEdgeColor)
        };
        newEdges.push(goalToProjectEdge);
        console.log('Added goal-to-project edge:', goalToProjectEdge);

        // Level 3: Employees from main projects + Goal-assigned employees + Linked projects
        let level3Items: Array<{type: 'employee' | 'project', data: any, id: string, isGoalEmployee?: boolean}> = [];

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

        // Add project employees to level 3 items
        projectEmployees.forEach((emp, empIndex) => {
          level3Items.push({
            type: 'employee',
            data: emp,
            id: `emp-direct-${goal.id}-${project._id}-${empIndex}`,
            isGoalEmployee: false
          });
        });

        // Add employees directly assigned to the goal (but only once per goal, not per project)
        if (projectIndex === 0) { // Only add goal employees once per goal
          const goalEmployees = goal.assignedEmployees || [];
          
          goalEmployees.forEach((emp, empIndex) => {
            // Only add if not already in project employees (avoid duplicates)
            const email = emp.email || emp.employeeId || '';
            const isDuplicate = level3Items.some(item => 
              item.type === 'employee' && 
              (item.data.email === email || item.data.employee_id === email)
            );
            
            if (!isDuplicate && email) {
              level3Items.push({
                type: 'employee',
                data: {
                  ...emp,
                  employee_id: email,
                  name: emp.name || email,
                  email: email,
                  role: emp.role || 'Team Member',
                  department: selectedDepartment || goal.department,
                  hours_per_week: 40,
                  tasks: ['Goal-specific tasks'],
                  tools_used: ['Various tools']
                },
                id: `emp-goal-${goal.id}-${empIndex}`,
                isGoalEmployee: true
              });
            }
          });
        }

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
            (p.project_title.toLowerCase().includes('support') ||
            p.project_title.toLowerCase().includes('assist') ||
            p.project_description.toLowerCase().includes(project.project_title.toLowerCase().split(' ')[0]))
          ).slice(0, 1); // Limit to 1 linked project per main project
        }

        linkedProjects.forEach(linkedProject => {
          level3Items.push({
            type: 'project',
            data: linkedProject,
            id: `project-linked-${goal.id}-${linkedProject._id}`
          });
        });

        console.log(`Project "${project.project_title}" has ${projectEmployees.length} direct employees and ${linkedProjects.length} linked projects`);

        // Ensure projects are grouped together before employees
        const sortedLevel3 = [...level3Items].sort((a, b) => {
          if (a.type === b.type) {
            const titleA = (a.type === 'project' ? a.data.project_title : (a.data.name || '')).toLowerCase();
            const titleB = (b.type === 'project' ? b.data.project_title : (b.data.name || '')).toLowerCase();
            return titleA.localeCompare(titleB);
          }
          return a.type === 'project' ? -1 : 1; // projects first (left)
        });

        // Calculate grouped positioning: projects to the left, employees to the right
        const projectsOnly = sortedLevel3.filter(it => it.type === 'project');
        const employeesOnly = sortedLevel3.filter(it => it.type === 'employee');

        const itemSpacing = EMPLOYEE_HORIZONTAL_SPACING;
        const groupGap = itemSpacing * 2; // extra gap between project and employee groups

        const projectsWidth = Math.max(0, (projectsOnly.length - 1) * itemSpacing);
        const employeesWidth = Math.max(0, (employeesOnly.length - 1) * itemSpacing);
        const totalWidth = projectsWidth + groupGap + employeesWidth;

        const startXBase = projectX - totalWidth / 2;

        const itemPosMap: Record<string, number> = {};
        // Place project group (left)
        projectsOnly.forEach((it, idx) => {
          itemPosMap[it.id] = startXBase + idx * itemSpacing;
        });
        // Place employee group (right)
        const employeesStart = startXBase + projectsWidth + groupGap;
        employeesOnly.forEach((it, idx) => {
          itemPosMap[it.id] = employeesStart + idx * itemSpacing;
        });

        // Position level 3 items now using computed map
        if (sortedLevel3.length > 0) {
          sortedLevel3.forEach((item, itemIndex) => {
            // Center items symmetrically under the project
            const itemX = itemPosMap[item.id] ?? projectX;
            const itemY = LEVEL_HEIGHT * 2; // Level 3

            if (item.type === 'employee') {
              // Direct employee from main project (Level 3)
              const empNodeId = item.id;

              // Generate a consistent employee ID for tracking duplicates
              const employeeId = item.data.email || item.data.employee_id || '';
              
              // Check if this employee has already been added
              let empX = itemX;
              let empY = itemY;
              
              if (employeeId && employeeTracker[employeeId]) {
                // This is a duplicate employee - find a new position in the tree
                const parentId = projectNodeId;
                
                // If we've seen this employee before, place it in a new position
                // that maintains the tree structure but avoids overlap
                if (!employeeTracker[employeeId].parentIds.includes(parentId)) {
                  // Add this parent to the employee's parent list
                  employeeTracker[employeeId].parentIds.push(parentId);
                  employeeTracker[employeeId].nodeIds.push(empNodeId);
                  
                  // Find the index of this project among level 2 nodes
                  const projectIndex = levelNodes[2].findIndex(n => n.id === parentId);
                  if (projectIndex !== -1) {
                    // Position this instance of the employee under its parent project
                    empX = levelNodes[2][projectIndex].position.x;
                  }
                  
                  // Store this position
                  employeeTracker[employeeId].positions.push({ x: empX, y: empY });
                  
                  console.log(`Positioned employee ${employeeId} under project ${parentId}: x=${empX}, y=${empY}`);
                }
              } else if (employeeId) {
                // First time seeing this employee
                employeeTracker[employeeId] = {
                  nodeIds: [empNodeId],
                  parentIds: [projectNodeId],
                  positions: [{ x: empX, y: empY }]
                };
              }
              
              // Add this node to level tracking
              levelNodes[3].push({
                id: empNodeId,
                width: NODE_WIDTH,
                position: { x: empX, y: empY }
              });
              
              newNodes.push({
                id: empNodeId,
                type: 'employeeNode',
                position: { x: empX, y: empY },
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

              // Connect to project or goal based on employee type
              let sourceId = projectNodeId;
              
              // Get project priority to determine edge color
              const projectPriority = project.priority || 'medium';
              const projectEdgeColor = {
                low: '#10B981',      // green
                medium: '#F59E0B',   // yellow
                high: '#10B981',     // orange
                critical: '#EF4444'  // red
              }[projectPriority];
              
              let edgeStyle = { 
                strokeWidth: 2, 
                stroke: projectEdgeColor,
                strokeDasharray: undefined // Ensure solid line
              };
              
              // If this is a goal employee, connect directly to the goal
              if (item.isGoalEmployee) {
                sourceId = goalNodeId;
                // Get goal priority to determine edge color
                const goalPriority = goal.priority || 'medium';
                const goalEdgeColor = {
                  low: '#10B981',      // green
                  medium: '#F59E0B',   // yellow
                  high: '#10B981',     // orange
                  critical: '#EF4444'  // red
                }[goalPriority];
                
                edgeStyle = {
                  ...edgeStyle,
                  stroke: goalEdgeColor,
                  strokeDasharray: undefined // Make solid line
                };
              }
              
              const projectToItemEdge: Edge = {
                id: `${sourceId}-${empNodeId}`,
                source: sourceId,
                target: empNodeId,
                type: 'customObjective',
                style: edgeStyle,
                animated: false,
                markerEnd: createMarkerEnd(edgeStyle.stroke)
              };
              newEdges.push(projectToItemEdge);
              console.log('Added project-to-employee edge:', projectToItemEdge);
            } else if (item.type === 'project') {
              // Linked project (Level 3)
              const linkedProjectNodeId = item.id;

              newNodes.push({
                id: linkedProjectNodeId,
                type: 'projectNode',
                position: { x: itemX, y: itemY },
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
              
              // Track this linked project node in level 3
              levelNodes[3].push({
                id: linkedProjectNodeId,
                width: NODE_WIDTH,
                position: { x: itemX, y: itemY }
              });
              
              // Connect project to linked project with smooth edge and arrow
              // Use project priority to determine edge color
              const projectPriority = project.priority || 'medium';
              const projectEdgeColor = {
                low: '#10B981',      // green
                medium: '#F59E0B',   // yellow
                high: '#10B981',     // orange
                critical: '#EF4444'  // red
              }[projectPriority];
              
              const projectToLinkedEdge: Edge = {
                id: `${projectNodeId}-${linkedProjectNodeId}`,
                source: projectNodeId,
                target: linkedProjectNodeId,
                type: 'straight',
                style: { 
                  strokeWidth: 2, 
                  stroke: projectEdgeColor
                  // Solid line for linked projects (removed strokeDasharray)
                },
                markerEnd: createMarkerEnd(projectEdgeColor)
              };
              newEdges.push(projectToLinkedEdge);
              console.log('Added project-to-linked-project edge:', projectToLinkedEdge);

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

              // Position level 4 employees symmetrically under the linked project
              linkedEmployees.forEach((emp: any, empIndex: number) => {
                const empNodeId = `emp-indirect-${linkedProjectNodeId}-${empIndex}`;
                
                // Center employees symmetrically under the linked project
                let empX;
                if (linkedEmployees.length === 1) {
                  // Single employee: center it under the linked project
                  empX = itemX;
                } else {
                  // Multiple employees: distribute them symmetrically with consistent spacing
                  const empSpacing = EMPLOYEE_HORIZONTAL_SPACING; // Use consistent spacing
                  const totalEmpsWidth = (linkedEmployees.length - 1) * empSpacing;
                  const startX = itemX - (totalEmpsWidth / 2);
                  empX = startX + (empIndex * empSpacing);
                }
                const empY = LEVEL_HEIGHT * 3; // Level 4

                // Generate a consistent employee ID for tracking duplicates
                const employeeId = emp.email || emp.employee_id || '';
                
                // Check if this employee has already been added
                let finalEmpX = empX;
                let finalEmpY = empY;
                
                if (employeeId && employeeTracker[employeeId]) {
                  // This is a duplicate employee - find a new position in the tree
                  const parentId = linkedProjectNodeId;
                  
                  // If we've seen this employee before, place it in a new position
                  // that maintains the tree structure but avoids overlap
                  if (!employeeTracker[employeeId].parentIds.includes(parentId)) {
                    // Add this parent to the employee's parent list
                    employeeTracker[employeeId].parentIds.push(parentId);
                    employeeTracker[employeeId].nodeIds.push(empNodeId);
                    
                    // Find the index of this linked project among level 3 nodes
                    const projectIndex = levelNodes[3].findIndex(n => n.id === parentId);
                    if (projectIndex !== -1) {
                      // Position this instance of the employee under its parent project
                      finalEmpX = levelNodes[3][projectIndex].position.x;
                    }
                    
                    // Store this position
                    employeeTracker[employeeId].positions.push({ x: finalEmpX, y: finalEmpY });
                    
                    console.log(`Positioned employee ${employeeId} under linked project ${parentId}: x=${finalEmpX}, y=${finalEmpY}`);
                  }
                } else if (employeeId) {
                  // First time seeing this employee
                  employeeTracker[employeeId] = {
                    nodeIds: [empNodeId],
                    parentIds: [linkedProjectNodeId],
                    positions: [{ x: finalEmpX, y: finalEmpY }]
                  };
                }
                
                // Add this node to level tracking
                levelNodes[4].push({
                  id: empNodeId,
                  width: NODE_WIDTH,
                  position: { x: finalEmpX, y: finalEmpY }
                });
                
                newNodes.push({
                  id: empNodeId,
                  type: 'employeeNode',
                  position: { x: finalEmpX, y: finalEmpY },
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

                const linkedToEmpEdge: Edge = {
                  id: `${linkedProjectNodeId}-${empNodeId}`,
                  source: linkedProjectNodeId,
                  target: empNodeId,
                  type: 'straight',
                  style: { 
                    strokeWidth: 1.5, 
                    stroke: '#10B981'
                    // Solid line (removed strokeDasharray)
                  },
                  markerEnd: createMarkerEnd('#10B981')
                };
                newEdges.push(linkedToEmpEdge);
                console.log('Added linked-to-employee edge:', linkedToEmpEdge);
              });
            }
          });
        }
      });

      // Level 2.5: Employees directly assigned to goal
      // Treated as direct employees under the goal node
      const goalEmployees = goal.assignedEmployees || [];
      if (goalEmployees.length > 0) {
        goalEmployees.forEach((emp, empIndex) => {
          const empX = goalX + (empIndex - (goalEmployees.length - 1) / 2) * EMPLOYEE_HORIZONTAL_SPACING;
          const empY = LEVEL_HEIGHT * 2; // same level as projects
          const empNodeId = `emp-goal-${goal.id}-${empIndex}`;
          // Add goal employee node
          // Normalize employee data to match Employee type requirements
          // Create a safe copy of employee data with proper type checking
          const empData = {
            employeeId: emp.employeeId as string | undefined,
            email: emp.email as string | undefined,
            name: emp.name as string | undefined,
            role: emp.role as string | undefined,
            department: (emp as any).department as string | undefined
          };
          
          const normalizedEmp: Employee = {
            _id: empData.employeeId || empData.email || empNodeId,
            email: empData.email || `employee-${empIndex}@example.com`,
            firstName: empData.name || 'Team',
            lastName: 'Member',
            jobTitle: empData.role || 'Team Member',
            department: empData.department || goal.department || 'General'
          };
          
          newNodes.push({
            id: empNodeId,
            type: 'employeeNode',
            position: { x: empX, y: empY },
            data: {
              id: normalizedEmp._id,
              type: 'employee',
              level: 3,
              title: normalizedEmp.firstName + (normalizedEmp.lastName ? ` ${normalizedEmp.lastName}` : ''),
              role: normalizedEmp.jobTitle,
              email: normalizedEmp.email,
              department: normalizedEmp.department,
              details: normalizedEmp
            }
          });
          // Track node in level 3
          levelNodes[3].push({ id: empNodeId, width: NODE_WIDTH, position: { x: empX, y: empY } });
          // Connect goal to goal-assigned employee
          // Use the same color as goal-to-project edges based on goal priority
          const goalPriority = goal.priority || 'medium';
          const goalEdgeColor = {
            low: '#10B981',      // green
            medium: '#F59E0B',   // yellow
            high: '#10B981',     // orange
            critical: '#EF4444'  // red
          }[goalPriority];
          
          newEdges.push({
            id: `goal-${goal.id}-emp-goal-${empIndex}`,
            source: goalNodeId,
            target: empNodeId,
            type: 'customObjective',
            style: { strokeWidth: 2, stroke: goalEdgeColor, strokeDasharray: undefined }, // Make solid line
            animated: false,
            markerEnd: createMarkerEnd(goalEdgeColor)
          });
        });
      }

      // If no main projects, still show the goal
      if (mainProjects.length === 0) {
        console.log(`Goal "${goal.title}" has no assigned projects`);
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
    console.log('All edge IDs:', newEdges.map(e => e.id));

    // Apply symmetrical layout with heap sort logic and draggable capability
    const layoutedNodes = applySymmetricalLayout(newNodes as ObjectiveNode[], newEdges).map(node => ({
      ...node,
      draggable: true, // Enable dragging for all nodes
      focusable: true, // Enable focus for better interaction
      style: {
        ...node.style,
        cursor: 'grab' // Show grab cursor
      }
    }));

    setNodes(layoutedNodes as any);
    setEdges(newEdges.map(edge => ({
      ...edge,
      type: 'customObjective', // Ensure all edges use the custom horizontal/vertical type
      style: {
        ...edge.style,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    })));

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
  }, [selectedGoal, selectedDepartment, selectedStatus, selectedPriority, searchQuery, reactFlowInstance]);

  // Rebuild visualization when dependencies change
  useEffect(() => {
    if (goals.length > 0) {
      buildVisualization(
        goals, 
        projects, 
        employees,
        selectedGoal,
        selectedDepartment,
        selectedStatus,
        selectedPriority,
        searchQuery
      );
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
          buildVisualization(
            goals, 
            projects, 
            employees,
            selectedGoal,
            selectedDepartment,
            selectedStatus,
            selectedPriority,
            searchQuery
          );
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [goals, projects, employees]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="mb-4">
          <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 flex items-center justify-between shadow-md z-10">
        <div className="flex-1">
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative w-64">
            <Input
              placeholder="Search objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 text-white placeholder:text-white/70 border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 w-4 h-4" />
          </div>
          
          {/* Department Filter */}
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="bg-white/10 text-white border-white/20 w-48">
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
          
          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="bg-white/10 text-white border-white/20 w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Priority Filter */}
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="bg-white/10 text-white border-white/20 w-32">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleScreenshot}
              title="Screenshot"
            >
              <FaCamera className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullScreen}
              title="Full Screen"
            >
              <FaExpandAlt className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <Select value={selectedGoal} onValueChange={setSelectedGoal}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Goals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                {goals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorities.map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
              <FaTimes className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      )}

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
                onConnect={onConnect}
                onInit={(instance: ReactFlowInstance) => {
                  setReactFlowInstance(instance);
                  console.log('ReactFlow initialized with nodes:', nodes.length, 'edges:', edges.length);
                  console.log('Sample edges:', edges.slice(0, 3));
                  setTimeout(() => {
                    instance.fitView({ padding: 0.2, duration: 800 });
                    console.log('Fit view applied');
                  }, 100);
                }}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                  padding: 0.1,
                  includeHiddenNodes: false,
                  minZoom: 0.05,
                  maxZoom: 1.5
                }}
                attributionPosition="bottom-left"
                minZoom={0.05}
                maxZoom={2.0}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: false,
                  style: { 
                    strokeWidth: 2, 
                    stroke: '#6b7280'
                  }
                }}
                nodeExtent={[
                  [-10000, -100],
                  [10000, 10000]
                ]}
                className="bg-white w-full h-full"
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                edgesFocusable={false}
                nodesFocusable={true}
                panOnScroll={true}
                zoomOnScroll={true}
                panOnDrag={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                preventScrolling={false}
                selectNodesOnDrag={false}
                deleteKeyCode={null}
                panActivationKeyCode={null}
                selectionKeyCode={null}
                multiSelectionKeyCode={null}
                snapToGrid={false}
                snapGrid={[15, 15]}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={16}
                  size={1}
                  color="#aaa"
                />
                
                {/* Zoom controls */}
                <div className="absolute right-8 top-1/4 transform -translate-y-1/2 flex flex-col gap-2 z-10">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="rounded-full bg-white shadow-lg hover:bg-gray-100 border border-gray-300 text-black h-10 w-10 flex items-center justify-center"
                    onClick={() => reactFlowInstance?.zoomIn()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="rounded-full bg-white shadow-lg hover:bg-gray-100 border border-gray-300 text-black h-10 w-10 flex items-center justify-center"
                    onClick={() => reactFlowInstance?.zoomOut()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </Button>
                </div>
                
                
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
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'team' | 'projects'>('overview');

  const renderGoalContent = (goal: Goal) => {
    const statusColors = {
      planning: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      active: 'bg-green-100 text-green-800 hover:bg-green-200',
      completed: 'bg-green-100 text-green-800 hover:bg-green-200',
      'on-hold': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      canceled: 'bg-red-100 text-red-800 hover:bg-red-200'
    };
    //this is useless, no impact on anything
    const priorityColors = {
      low: 'bg-green-100 text-green-800 hover:bg-green-200',
      medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      high: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-l-4 border-amber-500',
      critical: 'bg-red-100 text-red-800 hover:bg-red-200'
    };

    // Get all projects and employees from the component's state
    const { projects = [], employees: allEmployees = [] } = data?.state || { projects: [], employees: [] };
    
    // Find all projects linked to this goal (directly or indirectly)
    const linkedProjectIds = new Set<string>();
    const linkedEmployeeIds = new Set<string>();
    
    // Helper function to extract ID from various object shapes
    const getId = (item: any, idFields: string[] = ['id', '_id', 'projectId', 'employeeId']): string | null => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      for (const field of idFields) {
        if (item[field]) return String(item[field]);
      }
      return null;
    };
    
    // Add directly assigned projects and employees
    if (goal.assignedProjects && Array.isArray(goal.assignedProjects)) {
      goal.assignedProjects.forEach((projectRef) => {
        const projectId = getId(projectRef);
        if (!projectId) return;
        
        linkedProjectIds.add(projectId);
        
        // Find employees in these projects
        const project = projects.find((p: any) => {
          const pId = getId(p);
          return pId === projectId;
        });
        
        if (project) {
          // Add employees from the project's employee_contributions
          if (project.employee_contributions && Array.isArray(project.employee_contributions)) {
            project.employee_contributions.forEach((emp: any) => {
              const empId = getId(emp, ['id', '_id', 'employeeId']);
              if (empId) linkedEmployeeIds.add(empId);
            });
          }
          
          // Add employees from the project's employees array
          if (project.employees && Array.isArray(project.employees)) {
            project.employees.forEach((emp: any) => {
              const empId = getId(emp, ['id', '_id', 'employeeId']);
              if (empId) linkedEmployeeIds.add(empId);
            });
          }
        }
      });
    }
    
    // Add directly assigned employees
    if (goal.assignedEmployees && Array.isArray(goal.assignedEmployees)) {
      goal.assignedEmployees.forEach((empRef) => {
        const empId = getId(empRef, ['id', '_id', 'employeeId']);
        if (empId) linkedEmployeeIds.add(empId);
      });
    }
    
    // Count unique projects and employees
    const projectCount = linkedProjectIds.size;
    const employeeCount = linkedEmployeeIds.size;

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
              <Badge variant="outline" className={`text-xs font-medium ${
                goal.priority === 'critical' ? 'border-red-400 bg-red-100 text-red-700' :
                goal.priority === 'high' ? 'border-amber-400 bg-amber-100 text-amber-700' :
                goal.priority === 'medium' ? 'border-yellow-400 bg-yellow-100 text-yellow-700' :
                'border-green-400 bg-green-100 text-green-700'
              }`}>
                {goal.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="outline" className="text-gray-700">
                {goal.department}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'details'].map((tab) => (
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
                    <span className="font-medium">{projectCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Employees:</span>
                    <span className="font-medium">{employeeCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">KPIs:</span>
                    <span className="font-medium">{goal.kpis?.length || 0}</span>
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
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProjectContent = (project: Project) => {
    const statusColors = {
      planning: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      ongoing: 'bg-green-100 text-green-800 hover:bg-green-200',
      active: 'bg-green-100 text-green-800 hover:bg-green-200',
      completed: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      'on-hold': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      canceled: 'bg-red-100 text-red-800 hover:bg-red-200',
      default: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    };

    const priorityColors = {
      low: 'bg-green-100 text-green-800 hover:bg-green-200',
      medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      high: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
      critical: 'bg-red-100 text-red-800 hover:bg-red-200'
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
              <Badge variant="outline" className={`text-xs font-medium ${
                project.priority === 'critical' ? 'border-red-400 bg-red-50 text-red-700' :
                project.priority === 'high' ? 'border-amber-400 bg-amber-50 text-amber-700' :
                project.priority === 'medium' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                'border-green-400 bg-green-50 text-green-700'
              }`}>
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
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">End:</span>
                    <span className="ml-2 font-medium">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'No date'}
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
                              {emp.tasks.map((task: string, taskIndex: number) => (
                                <Badge key={taskIndex} variant="outline" className="text-xs">
                                  {task}
                                </Badge>
                              ))}
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
    const isLinkedEmployee = data.level === 4;

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
                {isDirectEmployee ? 'DIRECT EMPLOYEE' : isLinkedEmployee ? 'LINKED EMPLOYEE' : 'INDIRECT EMPLOYEE'}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
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

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveVisualizationPage;