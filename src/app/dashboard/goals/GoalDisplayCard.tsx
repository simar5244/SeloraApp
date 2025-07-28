"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaCalendarAlt, FaFlag } from 'react-icons/fa';
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
    status = 'planning',
    priority = 'medium',
    startDate,
    endDate,
    department
  } = goal;

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

  // Card class - consistent styling for all goals
  const cardClass = "hover:shadow-md transition-shadow duration-300 bg-white border border-gray-200";

  return (
    <Card className={`${cardClass} flex flex-col min-h-[200px]`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center flex-wrap">
            <CardTitle className="text-lg line-clamp-1 text-gray-900">{title}</CardTitle>
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
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-700">
            <FaCalendarAlt className="mr-2 text-gray-500" />
            <span>
              {formatDate(startDate)}
              {normalizedStatus === 'completed' && endDate
                ? ` - ${formatDate(endDate)}`
                : ''}
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
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex justify-end w-full space-x-2">
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