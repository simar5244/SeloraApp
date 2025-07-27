"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaCalendarAlt, FaFlag, FaShieldAlt, FaTarget, FaProjectDiagram, FaUsers } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface GoalDisplayCardProps {
  goal: {
    id: string;
    title: string;
    description?: string;
    status: 'planning' | 'active' | 'completed' | 'canceled' | 'on-hold';
    priority: 'low' | 'medium' | 'high' | 'critical';
    startDate: string;
    endDate?: string;
    department?: string;
    progress?: number;
    createdByRole?: string;
    isManagementGoal?: boolean;
    assignedEmployees?: any[];
    assignedProjects?: any[];
    kpis?: any[];
  };
  onClick?: () => void;
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

const GoalDisplayCard: React.FC<GoalDisplayCardProps> = ({ goal, onClick }) => {
  const router = useRouter();
  
  const { 
    id,
    title,
    description,
    status = 'planning',
    priority = 'medium',
    startDate,
    endDate,
    department,
    progress = 0,
    createdByRole,
    isManagementGoal,
    assignedEmployees = [],
    assignedProjects = [],
    kpis = []
  } = goal;

  console.log(`Rendering card for goal: ${title}, Management: ${isManagementGoal ? 'YES' : 'NO'}, Role: ${createdByRole || 'unknown'}`);

  // Check if created by management or has a management label
  const isTopManagementCreated = 
    isManagementGoal || // Use the dedicated flag if available
    (createdByRole && ['top_management_tier_3', 'top_management_tier_2', 'top_management_tier_1', 'admin'].includes(createdByRole));
  
  // Show the management badge if it's a management goal
  const showManagementBadge = isTopManagementCreated;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Normalize status to match our status colors
  const normalizeStatus = (status: string): keyof typeof StatusColors => {
    if (!status) return 'planning';
    
    // Convert to lowercase and handle common variations
    const s = status.toLowerCase();
    
    if (s.includes('plan') || s === 'draft') return 'planning';
    if (s.includes('active') || s === 'in-progress' || s === 'ongoing') return 'active';
    if (s.includes('complet') || s === 'done' || s === 'finished') return 'completed';
    if (s.includes('cancel') || s === 'terminated') return 'canceled';
    if (s.includes('hold') || s === 'paused' || s === 'suspended') return 'on-hold';
    
    // Default to planning if no match
    return 'planning';
  };
  
  const normalizedStatus = normalizeStatus(status);
  
  // Normalize priority to match our priority colors
  const normalizePriority = (priority: string): keyof typeof PriorityColors => {
    if (!priority) return 'medium';
    
    const p = priority.toLowerCase();
    
    if (p.includes('critical') || p.includes('urgent') || p === 'highest') return 'critical';
    if (p.includes('high')) return 'high';
    if (p.includes('med') || p === 'normal') return 'medium';
    if (p.includes('low')) return 'low';
    
    return 'medium';
  };
  
  const normalizedPriority = normalizePriority(String(priority));

  // Card class based on whether it's a management goal or not
  const cardClass = showManagementBadge 
    ? "hover:shadow-md transition-shadow duration-300 bg-white border-2 border-purple-600"
    : "hover:shadow-md transition-shadow duration-300 bg-white border border-gray-200";

  // Progress bar color based on progress
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <Card className={`${cardClass} flex flex-col min-h-[250px]`}>
      <CardHeader className={showManagementBadge ? "pb-2 bg-white" : "pb-2"}>
        <div className="flex justify-between items-start">
          <div className="flex items-center flex-wrap">
            <CardTitle className="text-lg line-clamp-1 text-gray-900 flex items-center">
              <FaTarget className="mr-2 text-purple-600" />
              {title}
            </CardTitle>
            {showManagementBadge && (
              <Badge className="ml-2 bg-purple-700 text-white text-xs font-semibold flex items-center">
                <FaShieldAlt className="mr-1" /> Management
              </Badge>
            )}
          </div>
          <Badge className={StatusColors[normalizedStatus as keyof typeof StatusColors] || ''}>
            {normalizedStatus === 'on-hold'
              ? 'On Hold'
              : normalizedStatus
                  .charAt(0)
                  .toUpperCase() + normalizedStatus.slice(1).replace('-', ' ')}
          </Badge>
        </div>
        {department && (
          <div className="text-sm text-gray-600 mb-2">{department}</div>
        )}
        {description && (
          <div className="text-sm text-gray-700 line-clamp-2 mt-2">{description}</div>
        )}
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Date and Priority Row */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700">
              <FaCalendarAlt className="mr-2 text-gray-500" />
              <span>
                {formatDate(startDate)}
                {endDate && ` - ${formatDate(endDate)}`}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-gray-700">
              <FaFlag className="mr-2 text-gray-500" />
              <span className="mr-1 text-gray-700 font-medium">Priority:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${PriorityColors[normalizedPriority as keyof typeof PriorityColors] || ''}`}>
                {normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1)}
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <FaProjectDiagram className="mr-1 text-purple-500" />
                <span>{assignedProjects.length} Projects</span>
              </div>
              <div className="flex items-center">
                <FaUsers className="mr-1 text-blue-500" />
                <span>{assignedEmployees.length} Assigned</span>
              </div>
              <div className="flex items-center">
                <FaTarget className="mr-1 text-green-500" />
                <span>{kpis.length} KPIs</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex justify-end w-full space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => router.push(`/dashboard/goals/${goal.id}/edit`)}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => router.push(`/dashboard/goals/${goal.id}`)}
          >
            Open
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default GoalDisplayCard;