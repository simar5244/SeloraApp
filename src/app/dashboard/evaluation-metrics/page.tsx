'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FaSpinner, FaSearch, FaUser, FaEnvelope, FaBuilding, FaBriefcase,
  FaChartBar, FaStar, FaUsers, FaArrowUp, FaArrowDown, FaEye, FaCalendarAlt,
  FaUserTie, FaWeight, FaBalanceScale, FaSort, FaChevronUp, FaChevronDown, FaSyncAlt, FaPencilAlt, FaFilePdf
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { EvaluationMetricsTourLauncher } from '@/components/tour/EvaluationMetricsTourLauncher';

// Types
interface EmployeeMetrics {
  id: string;
  salary?: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  feedbackMetrics: {
    received: {
      count: number;
      averageRating: number;
      weightedAverageRating: number;
    };
  };
}

interface FeedbackDetail {
  evaluatorName: string;
  evaluatorEmail: string;
  evaluatorJobTitle?: string;
  evaluatorInternalRole?: string;
  relationshipType: string;
  averageRating: number;
  weightedRating: number;
  quarter: string;
  ratings: {
    accountability: string;
    teamContribution: string;
    adaptability: string;
    communication: string;
    confidence: string;
  };
  topSkills: string;
}

interface EmployeeProfile extends EmployeeMetrics {
  feedbackDetails: FeedbackDetail[];
  attritionScore?: number;
  attritionRisk?: string;
  utilization_score?: number;
  strengths?: string[];
  developmentAreas?: string[];
}

export default function EvaluationMetricsPage() {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<EmployeeMetrics[]>([]);
  const [sortBy, setSortBy] = useState<'highest' | 'lowest'>('highest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeMetrics | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('rankings');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showEmployeeProfile, setShowEmployeeProfile] = useState(false);
  // Cache for preloaded employee data
  const [employeeDataCache, setEmployeeDataCache] = useState<{
    [email: string]: {
      profileData?: any;
      feedbackData?: EmployeeProfile;
      isLoadingProfile?: boolean;
      isLoadingFeedback?: boolean;
    }
  }>({});

  // Monitor cache updates and update selected employee when data becomes available
  useEffect(() => {
    if (selectedEmployee && employeeDataCache[selectedEmployee.email]) {
      const cachedData = employeeDataCache[selectedEmployee.email];

      // If we're showing employee details and feedback data is now available
      if (showEmployeeDetails && cachedData.feedbackData && !cachedData.isLoadingFeedback) {
        console.log('[EvaluationMetrics] Updating selected employee with cached feedback data');
        setSelectedEmployee(cachedData.feedbackData);
      }

      // If we're showing employee profile and profile data is now available
      if (showEmployeeProfile && cachedData.profileData && !cachedData.isLoadingProfile) {
        console.log('[EvaluationMetrics] Updating selected employee with cached profile data');
        setSelectedEmployee(cachedData.profileData);
      }
    }
  }, [employeeDataCache, selectedEmployee, showEmployeeDetails, showEmployeeProfile]);
  const [showAllFeedback, setShowAllFeedback] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Fetch all employees on component mount - IMMEDIATELY
  useEffect(() => {
    console.log('[EvaluationMetrics] Component mounted, fetching initial data IMMEDIATELY...');

    // Call immediately without any delay
    const loadInitialData = async () => {
      console.log('[EvaluationMetrics] Starting immediate data load...');
      await fetchAllEmployees();
      console.log('[EvaluationMetrics] Initial data load completed');
    };

    loadInitialData();
  }, []);

  const fetchAllEmployees = async () => {
    console.log('[EvaluationMetrics] Starting fetchAllEmployees...');
    console.log('[EvaluationMetrics] Current timestamp:', new Date().toISOString());
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[EvaluationMetrics] No authentication token found');
        toast.error('Authentication required. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('[EvaluationMetrics] Token found, making API call to fetch all employees...');
      console.log('[EvaluationMetrics] API URL: /api/evaluation-metrics/top-bottom');

      const startTime = Date.now();
      const response = await fetch('/api/evaluation-metrics/top-bottom', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      console.log('[EvaluationMetrics] API call completed in:', endTime - startTime, 'ms');
      console.log('[EvaluationMetrics] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EvaluationMetrics] API error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch performance data');
      }

      const data = await response.json();
      console.log('[EvaluationMetrics] Received data:', data);

      // Combine top and bottom performers and any additional employees
      const allEmployeesList = [
        ...(data.topPerformers || []),
        ...(data.bottomPerformers || [])
      ];

      // Remove duplicates based on email
      const uniqueEmployees = allEmployeesList.filter((employee, index, self) =>
        index === self.findIndex(e => e.email === employee.email)
      );

      setAllEmployees(uniqueEmployees);

      console.log('[EvaluationMetrics] Successfully loaded all employees');
      console.log('[EvaluationMetrics] Total unique employees:', uniqueEmployees.length);

      // IMMEDIATELY start preloading detailed data for all employees in rankings
      if (uniqueEmployees.length > 0) {
        console.log('[EvaluationMetrics] Starting to preload detailed data for all ranking employees...');
        preloadAllEmployeesData(uniqueEmployees, token);
      }

    } catch (error: any) {
      console.error('[EvaluationMetrics] Error fetching employees:', error);
      toast.error(error.message || 'Failed to load performance data');
    } finally {
      setIsLoading(false);
      console.log('[EvaluationMetrics] fetchAllEmployees completed');
    }
  };

  // Sort employees based on selected criteria
  const sortedEmployees = useMemo(() => {
    const sorted = [...allEmployees].sort((a, b) => {
      const ratingA = a.feedbackMetrics?.received?.averageRating || 0;
      const ratingB = b.feedbackMetrics?.received?.averageRating || 0;

      if (sortBy === 'highest') {
        return ratingB - ratingA; // Descending
      } else {
        return ratingA - ratingB; // Ascending
      }
    });

    console.log('[EvaluationMetrics] Sorted employees by:', sortBy, 'Count:', sorted.length);
    return sorted;
  }, [allEmployees, sortBy]);

  // Preload detailed data for all employees in rankings (silently in background)
  const preloadAllEmployeesData = async (employees: EmployeeMetrics[], token: string) => {
    console.log('[EvaluationMetrics] Silently preloading detailed data for', employees.length, 'employees');

    // Preload data for all employees in parallel (but limit concurrency to avoid overwhelming the server)
    const batchSize = 3; // Process 3 employees at a time

    for (let i = 0; i < employees.length; i += batchSize) {
      const batch = employees.slice(i, i + batchSize);
      console.log('[EvaluationMetrics] Processing batch', Math.floor(i / batchSize) + 1, 'of', Math.ceil(employees.length / batchSize));

      // Process batch in parallel
      await Promise.all(
        batch.map(employee => preloadEmployeeData(employee, token))
      );

      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < employees.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('[EvaluationMetrics] Completed silent preloading of data for all employees');
  };

  // Preload employee profile and feedback data
  const preloadEmployeeData = async (employee: EmployeeMetrics, token: string) => {
    const email = employee.email;

    // Check if data is already cached or loading
    const existingCache = employeeDataCache[email];
    if (existingCache?.profileData && existingCache?.feedbackData) {
      console.log('[EvaluationMetrics] Employee data already fully cached for:', email);
      return;
    }

    // Initialize cache entry if it doesn't exist
    if (!employeeDataCache[email]) {
      setEmployeeDataCache(prev => ({
        ...prev,
        [email]: {
          isLoadingProfile: true,
          isLoadingFeedback: true
        }
      }));
    }

    // Preload succession planning profile data
    const loadProfileData = async () => {
      try {
        console.log('[EvaluationMetrics] Preloading succession planning profile for:', email);
        const profileResponse = await fetch(`/api/succession/search?query=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('[EvaluationMetrics] Preloaded succession planning profile successfully');
          setEmployeeDataCache(prev => ({
            ...prev,
            [email]: {
              ...prev[email],
              profileData,
              isLoadingProfile: false
            }
          }));
        } else {
          console.warn('[EvaluationMetrics] Failed to preload succession planning profile');
          setEmployeeDataCache(prev => ({
            ...prev,
            [email]: {
              ...prev[email],
              isLoadingProfile: false
            }
          }));
        }
      } catch (error) {
        console.error('[EvaluationMetrics] Error preloading succession planning profile:', error);
        setEmployeeDataCache(prev => ({
          ...prev,
          [email]: {
            ...prev[email],
            isLoadingProfile: false
          }
        }));
      }
    };

    // Preload detailed feedback data
    const loadFeedbackData = async () => {
      try {
        console.log('[EvaluationMetrics] Preloading detailed feedback data for:', email);
        const feedbackResponse = await fetch(`/api/evaluation-metrics/employee-profile?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          console.log('[EvaluationMetrics] Preloaded detailed feedback data successfully');
          setEmployeeDataCache(prev => ({
            ...prev,
            [email]: {
              ...prev[email],
              feedbackData,
              isLoadingFeedback: false
            }
          }));
        } else {
          console.warn('[EvaluationMetrics] Failed to preload detailed feedback data');
          setEmployeeDataCache(prev => ({
            ...prev,
            [email]: {
              ...prev[email],
              isLoadingFeedback: false
            }
          }));
        }
      } catch (error) {
        console.error('[EvaluationMetrics] Error preloading detailed feedback data:', error);
        setEmployeeDataCache(prev => ({
          ...prev,
          [email]: {
            ...prev[email],
            isLoadingFeedback: false
          }
        }));
      }
    };

    // Load both data sets in parallel
    await Promise.all([loadProfileData(), loadFeedbackData()]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    console.log('[EvaluationMetrics] Starting employee search for:', searchQuery);
    setIsSearching(true);
    setSearchResults(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[EvaluationMetrics] No authentication token found for search');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      console.log('[EvaluationMetrics] Making API call to search employee...');
      const response = await fetch(`/api/evaluation-metrics/search?query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[EvaluationMetrics] Search API response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[EvaluationMetrics] Employee not found');
          toast.error('No employee found matching your search criteria');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('[EvaluationMetrics] Search API error:', errorData);
        throw new Error(errorData.message || 'Failed to search for employee');
      }

      const employee = await response.json();
      console.log('[EvaluationMetrics] Search results:', employee);

      setSearchResults(employee);
      setActiveTab('search-results');

      // Immediately start preloading employee profile and feedback data (if not already cached)
      const cachedData = employeeDataCache[employee.email];
      if (!cachedData || (!cachedData.profileData && !cachedData.feedbackData)) {
        console.log('[EvaluationMetrics] Starting to preload employee data...');
        preloadEmployeeData(employee, token);
      } else {
        console.log('[EvaluationMetrics] Employee data already cached or loading');
      }

      console.log('[EvaluationMetrics] Employee search completed successfully');

    } catch (error: any) {
      console.error('[EvaluationMetrics] Error searching for employee:', error);
      toast.error(error.message || 'Failed to search for employee');
    } finally {
      setIsSearching(false);
      console.log('[EvaluationMetrics] handleSearch completed');
    }
  };

  const openEmployeeDetails = async (employee: EmployeeMetrics) => {
    console.log('[EvaluationMetrics] Opening employee feedback details for:', employee.email);
    console.log('[EvaluationMetrics] Employee basic info:', {
      name: employee.name,
      jobTitle: employee.jobTitle,
      department: employee.department,
      feedbackCount: employee.feedbackMetrics?.received?.count,
      averageRating: employee.feedbackMetrics?.received?.averageRating
    });

    setShowEmployeeDetails(true);
    setShowAllFeedback(false);

    // Check if we have cached feedback data
    const cachedData = employeeDataCache[employee.email];
    if (cachedData?.feedbackData) {
      console.log('[EvaluationMetrics] Using cached detailed employee profile');
      setSelectedEmployee(cachedData.feedbackData);
      return;
    }

    // Set basic employee data - useEffect will update with cached data when available
    setSelectedEmployee(employee as EmployeeProfile);

    // If data is not cached or still loading, show basic data and let useEffect handle updates
    if (cachedData?.isLoadingFeedback) {
      console.log('[EvaluationMetrics] Feedback data is still loading, useEffect will update when ready');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[EvaluationMetrics] No authentication token found for employee details');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      console.log('[EvaluationMetrics] Fetching detailed employee profile (fallback)...');
      const response = await fetch(`/api/evaluation-metrics/employee-profile?email=${encodeURIComponent(employee.email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[EvaluationMetrics] Employee profile API response status:', response.status);

      if (response.ok) {
        const detailedProfile = await response.json();
        console.log('[EvaluationMetrics] Received detailed employee profile:', detailedProfile);
        console.log('[EvaluationMetrics] Profile details:', {
          feedbackDetailsCount: detailedProfile.feedbackDetails?.length || 0,
          performanceAnalytics: detailedProfile.performanceAnalytics ? 'Present' : 'Missing',
          attritionRisk: detailedProfile.attritionRisk,
          utilizationScore: detailedProfile.utilization_score
        });
        setSelectedEmployee(detailedProfile);
        console.log('[EvaluationMetrics] Employee profile successfully loaded and set');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EvaluationMetrics] Failed to fetch detailed employee profile:', errorData);
        toast.error('Failed to load detailed employee profile');
      }
    } catch (error) {
      console.error('[EvaluationMetrics] Error fetching employee details:', error);
      toast.error('Error loading employee details');
    }
  };

  const openEmployeeProfile = async (employee: EmployeeMetrics) => {
    console.log('[EvaluationMetrics] Opening employee succession planning profile for:', employee.email);

    setShowEmployeeProfile(true);

    // Check if we have cached profile data
    const cachedData = employeeDataCache[employee.email];
    if (cachedData?.profileData) {
      console.log('[EvaluationMetrics] Using cached succession planning profile');
      setSelectedEmployee(cachedData.profileData);
      return;
    }

    // Set basic employee data - useEffect will update with cached data when available
    setSelectedEmployee(employee as EmployeeProfile);

    // If data is not cached or still loading, show basic data and let useEffect handle updates
    if (cachedData?.isLoadingProfile) {
      console.log('[EvaluationMetrics] Profile data is still loading, useEffect will update when ready');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[EvaluationMetrics] No authentication token found for employee profile');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      console.log('[EvaluationMetrics] Fetching succession planning style profile (fallback)...');
      const response = await fetch(`/api/succession/search?query=${encodeURIComponent(employee.email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[EvaluationMetrics] Succession planning profile API response status:', response.status);

      if (response.ok) {
        const searchData = await response.json();
        console.log('[EvaluationMetrics] Received succession planning profile:', searchData);

        // Extract employee data from search response
        const successionProfile = searchData.employee || searchData;
        setSelectedEmployee(successionProfile);
        console.log('[EvaluationMetrics] Succession planning profile successfully loaded');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EvaluationMetrics] Failed to fetch succession planning profile:', errorData);
        toast.error('Failed to load employee profile');
      }
    } catch (error) {
      console.error('[EvaluationMetrics] Error fetching succession planning profile:', error);
      toast.error('Error loading employee profile');
    }
  };

  const getRatingColor = (rating: number) => {
    // Using consistent purple styling for all ratings
    return 'text-purple-800 bg-purple-100 border-purple-200';
  };

  const formatRating = (rating: number) => {
    return rating ? rating.toFixed(2) : 'N/A';
  };

  // Export employee profile to PDF using the same system as reports
  const exportEmployeeProfileToPDF = async () => {
    if (!selectedEmployee) return;

    setIsExportingPDF(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      console.log('[PDF Export] Full employee data:', selectedEmployee);

      // Get ALL the data that's displayed in the UI - EVERYTHING
      const overallRating = selectedEmployee.averageRating || selectedEmployee.overallRating || 0;
      const weightedRating = selectedEmployee.weightedAverageRating || selectedEmployee.weightedRating || 0;
      const receivedCount = selectedEmployee.feedbackMetrics?.received?.count || selectedEmployee.feedbackDetails?.length || 0;
      const givenCount = selectedEmployee.feedbackMetrics?.given?.count || 0;
      const givenAverage = selectedEmployee.feedbackMetrics?.given?.averageRating || 0;

      // Get skill ratings from the actual data structure - try multiple sources
      const skillRatings = selectedEmployee.skillAverages || selectedEmployee.skillRatings || selectedEmployee.performanceCategories || {};

      // Get feedback details with actual data
      const feedbackDetails = selectedEmployee.feedbackDetails || [];

      // Get ALL additional data fields - try multiple field names
      const workMode = selectedEmployee.workMode || selectedEmployee.workingMode || 'Not specified';
      const officeLocation = selectedEmployee.officeLocation || selectedEmployee.location || selectedEmployee.office || 'Not specified';
      const utilizationScore = selectedEmployee.utilizationScore || selectedEmployee.utilization || 0;
      const attritionScore = selectedEmployee.attritionScore || selectedEmployee.attrition || 0;

      // Get tools and skills from multiple possible sources
      let toolsProficient = [];
      let skillsMentioned = [];

      // Try multiple field names for tools
      if (selectedEmployee.toolsProficient && Array.isArray(selectedEmployee.toolsProficient)) {
        toolsProficient = selectedEmployee.toolsProficient;
      } else if (selectedEmployee.tools && Array.isArray(selectedEmployee.tools)) {
        toolsProficient = selectedEmployee.tools;
      } else if (selectedEmployee.technicalSkills && Array.isArray(selectedEmployee.technicalSkills)) {
        toolsProficient = selectedEmployee.technicalSkills;
      } else if (typeof selectedEmployee.toolsProficient === 'string') {
        toolsProficient = selectedEmployee.toolsProficient.split(',').map(s => s.trim());
      } else if (typeof selectedEmployee.tools === 'string') {
        toolsProficient = selectedEmployee.tools.split(',').map(s => s.trim());
      }

      // Extract skills mentioned across all feedback entries
      const allSkillsMentioned = new Set();

      // Check feedback entries for skills
      feedbackDetails.forEach(feedback => {
        // Check various skill fields in feedback
        if (feedback.topSkills && Array.isArray(feedback.topSkills)) {
          feedback.topSkills.forEach(skill => allSkillsMentioned.add(skill));
        }
        if (feedback.skills && Array.isArray(feedback.skills)) {
          feedback.skills.forEach(skill => allSkillsMentioned.add(skill));
        }
        if (feedback.skillsHighlighted && Array.isArray(feedback.skillsHighlighted)) {
          feedback.skillsHighlighted.forEach(skill => allSkillsMentioned.add(skill));
        }
        // Check if skills are in string format
        if (typeof feedback.topSkills === 'string') {
          feedback.topSkills.split(',').forEach(skill => allSkillsMentioned.add(skill.trim()));
        }
        if (typeof feedback.skills === 'string') {
          feedback.skills.split(',').forEach(skill => allSkillsMentioned.add(skill.trim()));
        }
      });

      // Try employee-level skills from multiple sources
      if (selectedEmployee.skillsMentioned && Array.isArray(selectedEmployee.skillsMentioned)) {
        selectedEmployee.skillsMentioned.forEach(skill => allSkillsMentioned.add(skill));
      } else if (selectedEmployee.skills && Array.isArray(selectedEmployee.skills)) {
        selectedEmployee.skills.forEach(skill => allSkillsMentioned.add(skill));
      } else if (selectedEmployee.topSkills && Array.isArray(selectedEmployee.topSkills)) {
        selectedEmployee.topSkills.forEach(skill => allSkillsMentioned.add(skill));
      } else if (typeof selectedEmployee.skillsMentioned === 'string') {
        selectedEmployee.skillsMentioned.split(',').forEach(skill => allSkillsMentioned.add(skill.trim()));
      }

      const finalSkillsMentioned = Array.from(allSkillsMentioned).filter(skill => skill && skill.length > 0);

      console.log('[PDF Export] Complete employee object:', selectedEmployee);
      console.log('[PDF Export] Skills data extraction:', {
        toolsProficient,
        finalSkillsMentioned,
        employeeToolsField: selectedEmployee.toolsProficient,
        employeeSkillsField: selectedEmployee.skillsMentioned,
        feedbackSkills: feedbackDetails.map(f => ({
          topSkills: f.topSkills,
          skills: f.skills,
          skillsHighlighted: f.skillsHighlighted
        }))
      });

      // Calculate rating distribution
      const ratings = feedbackDetails.map(f => f.averageRating || f.rating || 0).filter(r => r > 0);
      const outstanding = ratings.filter(r => r >= 4.5).length;
      const excellent = ratings.filter(r => r >= 4.0 && r < 4.5).length;
      const veryGood = ratings.filter(r => r >= 3.5 && r < 4.0).length;
      const good = ratings.filter(r => r >= 3.0 && r < 3.5).length;
      const average = ratings.filter(r => r < 3.0).length;
      const total = ratings.length || 1;

      // Get relationship breakdown
      const relationshipBreakdown = {};
      feedbackDetails.forEach(feedback => {
        const rel = feedback.relationshipType || 'Unknown';
        if (!relationshipBreakdown[rel]) {
          relationshipBreakdown[rel] = { count: 0, totalRating: 0, ratings: [] };
        }
        relationshipBreakdown[rel].count++;
        const rating = feedback.averageRating || feedback.rating || 0;
        relationshipBreakdown[rel].totalRating += rating;
        relationshipBreakdown[rel].ratings.push(rating);
      });

      // Create COMPREHENSIVE formatted content with ALL data from the UI
      const profileContent = `


## Employee Information

**Name:** ${selectedEmployee.name}
**Email:** ${selectedEmployee.email}
**Job Title:** ${selectedEmployee.jobTitle}
**Department:** ${selectedEmployee.department}
**Location:** ${officeLocation}
**Work Mode:** ${workMode}
${selectedEmployee.salary ? `**Salary:** ${selectedEmployee.salary}` : ''}

## Performance Overview

**Total Reviews:** ${receivedCount}
**Average Rating:** ${overallRating > 0 ? overallRating.toFixed(2) : '0.00'}
**Weighted Rating:** ${weightedRating > 0 ? weightedRating.toFixed(2) : '0.00'}
**Feedback Entries:** ${feedbackDetails.length}

## Rating Distribution

**Outstanding:** ${outstanding} (${total > 0 ? ((outstanding/total)*100).toFixed(0) : 0}%)
**Excellent:** ${excellent} (${total > 0 ? ((excellent/total)*100).toFixed(0) : 0}%)
**Very Good:** ${veryGood} (${total > 0 ? ((veryGood/total)*100).toFixed(0) : 0}%)
**Good:** ${good} (${total > 0 ? ((good/total)*100).toFixed(0) : 0}%)
**Average:** ${average} (${total > 0 ? ((average/total)*100).toFixed(0) : 0}%)

## Performance Categories

${Object.keys(skillRatings).length > 0 ? Object.entries(skillRatings).map(([skill, rating]) => {
  const skillName = skill.charAt(0).toUpperCase() + skill.slice(1).replace(/([A-Z])/g, ' $1');
  const ratingValue = typeof rating === 'number' ? rating : 0;
  const count = feedbackDetails.filter(f => f.skillRatings && f.skillRatings[skill]).length || feedbackDetails.length;
  return `**${skillName}:** ${ratingValue.toFixed(1)}/5 (${count})`;
}).join('\n') : 'Performance categories not available'}

## Weighted vs Normal Ratings

**Standard:** ${overallRating.toFixed(1)}/5.0
Simple average of all ratings

**Weighted:** ${weightedRating.toFixed(1)}/5.0
Adjusted for evaluator seniority

Weighted ratings give more importance to feedback from senior team members and direct reports.

## Feedback by Relationship


${Object.entries(relationshipBreakdown).map(([relationship, data]) => {
  const avgRating = data.totalRating / data.count;
  const relationshipName = relationship.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return `${relationshipName}
${data.count} rating${data.count !== 1 ? 's' : ''}
${avgRating.toFixed(1)} / 5.0`;
}).join('\n\n')}

### Performance by Relationship
${Object.entries(relationshipBreakdown).map(([relationship, data]) => {
  const avgRating = data.totalRating / data.count;
  const relationshipName = relationship.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return `**${relationshipName}:** ${avgRating.toFixed(1)} / 5.0 • ${data.count} rating${data.count !== 1 ? 's' : ''}`;
}).join('\n')}

## Rating Consistency

${(() => {
  if (ratings.length < 2) {
    return `Insufficient data for consistency analysis
Need at least 2 feedback records`;
  }

  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - avg, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  return `**Standard Deviation:** ${stdDev.toFixed(3)}
**Consistency Level:** ${stdDev < 0.5 ? 'Very Consistent' : stdDev < 1.0 ? 'Moderately Consistent' : 'Variable'}
**Rating Range:** ${Math.min(...ratings).toFixed(2)} - ${Math.max(...ratings).toFixed(2)}`;
})()}

## Feedback Given

**Total Reviews Given:** ${givenCount}
**Average Rating Given:** ${givenAverage > 0 ? givenAverage.toFixed(1) : 'N/A'}

### Rating Tendency
${givenAverage >= 4.5 ? 'Very positive evaluator' :
  givenAverage >= 4.0 ? 'Generally positive in evaluations' :
  givenAverage >= 3.5 ? 'Balanced evaluator' :
  givenAverage >= 3.0 ? 'Conservative rater' :
  givenAverage > 0 ? 'More critical in evaluations' :
  'No evaluation history'
}

## Skills & Tools Analysis

**Skills Mentioned in Feedback:** ${finalSkillsMentioned.length > 0 ? finalSkillsMentioned.join(', ') : 'No specific skills mentioned'}

**Tools Proficient:** ${Array.isArray(toolsProficient) && toolsProficient.length > 0 ? toolsProficient.join(', ') : 'No tools specified'}



### Feedback from Colleagues (${feedbackDetails.length} total)

${feedbackDetails.map((feedback, index) => {
  const rating = feedback.averageRating || feedback.rating || 0;
  const evaluator = feedback.evaluatorName || 'Unknown';
  const relationship = feedback.relationshipType || 'Unknown';
  const email = feedback.evaluatorEmail || 'Email not available';
  const jobTitle = feedback.evaluatorJobTitle || 'Title not available';
  const quarter = feedback.quarter || 'Quarter not specified';
  const date = feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'Date unknown';

  // Get individual skill ratings if available
  const skillDetails = feedback.skillRatings ? Object.entries(feedback.skillRatings).map(([skill, skillRating]) => {
    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1).replace(/([A-Z])/g, ' $1');
    const level = skillRating >= 4.5 ? 'Outstanding' :
                  skillRating >= 4.0 ? 'Excellent' :
                  skillRating >= 3.5 ? 'Very Good' :
                  skillRating >= 3.0 ? 'Good' : 'Average';
    return `**${skillName}:** ${level}`;
  }).join('\n') : 'Individual skill ratings not available';

  const skills = Array.isArray(feedback.topSkills) ? feedback.topSkills : 
                 Array.isArray(feedback.skills) ? feedback.skills : [];

  return `**${evaluator}**
${relationship.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
${email}
${jobTitle}
**Rating:** ${rating.toFixed(2)}
**Quarter:** ${quarter}
**Date:** ${date}

${skillDetails}

${skills.length > 0 ? `**Skills Highlighted:** ${skills.join(', ')}` : ''}
`;
}).join('\n\n')}

## Additional Information

**Work Mode:** ${workMode}
**Office Location:** ${officeLocation}
**Utilization Score:** ${utilizationScore}%
**Attrition Score:** ${attritionScore}%

**Report Generated:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}


      `;

      // Call the same API endpoint used by reports
      const response = await fetch('/api/report-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          operation: 'export',
          exportFormat: 'pdf',
          reportContent: profileContent,
          reportTitle: `Employee Performance Profile - ${selectedEmployee.name}`,
          visualizations: [],
          pdfOptions: {
            fontFamily: 'Times New Roman',
            fontSize: '11pt',
            lineHeight: 1.4,
            preserveTextFormatting: true,
            includeTableOfContents: false,
            margins: {
              top: '0.75in',
              bottom: '0.75in',
              left: '0.75in',
              right: '0.75in'
            },
            headerFooter: {
              includeHeader: true,
              includeFooter: true,
              headerText: `Employee Performance Profile - ${selectedEmployee.name}`,
              footerText: 'Confidential - Internal Use Only'
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export employee profile as PDF');
      }

      // Create a blob from the response and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Employee_Profile_${selectedEmployee.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error exporting employee profile as PDF:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center" data-tour="metrics-dashboard">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <FaChartBar className="text-purple-700 mr-3" />
              <span className="text-purple-700">Evaluation</span> <span className="ml-1">Metrics</span>
            </h1>
            <p className="text-lg text-gray-600">
              Analyze employee performance based on supervisor and peer-to-peer feedback analytics
            </p>
          </div>
        </div>

        {/* Search and Tabs Container */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {/* Search Input - Takes remaining space */}
              <div className="flex-1 relative" data-tour="employee-search">
                <Input
                  type="text"
                  placeholder="Search employee by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 bg-white text-gray-900 border-gray-300 placeholder:text-gray-500"
                />
              </div>

              {/* Search Button - Fixed width */}
              <div className="w-full md:w-auto">
                <Button
                  type="submit"
                  disabled={isSearching}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                >
                  {isSearching ? <FaSpinner className="animate-spin mr-2" /> : <FaSearch className="mr-2" />}
                  Search
                </Button>
              </div>

              {/* Sort Dropdown - Fixed width */}
              <div className="w-full md:w-48" data-tour="sort-filter">
                <Select value={sortBy} onValueChange={(value: 'highest' | 'lowest') => setSortBy(value)}>
                  <SelectTrigger className="w-full bg-white text-gray-900 border-gray-300">
                    <SelectValue placeholder="Sort by rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 shadow-lg">
                    <SelectItem value="highest" className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">Highest Ratings</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="lowest" className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">Lowest Ratings</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`w-full ${searchResults ? 'grid grid-cols-2' : 'flex justify-center'}`}>
              <TabsTrigger
                value="rankings"
                className={`text-gray-800 ${!searchResults ? 'w-auto' : ''}`}
              >
                Employee Rankings
              </TabsTrigger>
              {searchResults && (
                <TabsTrigger value="search-results" className="text-gray-800">
                  Search Results
                </TabsTrigger>
              )}
            </TabsList>

            {/* Employee Rankings Tab */}
            <TabsContent value="rankings" className="space-y-6">
              {/* Employee List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-purple-600 text-2xl mr-3" />
                  <span className="text-lg text-gray-900">Loading performance data...</span>
                </div>
              ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-tour="employee-rankings">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {sortBy === 'highest' ? 'Highest Rated Employees' : 'Lowest Rated Employees'}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {sortedEmployees.length} {sortedEmployees.length === 1 ? 'employee' : 'employees'} found
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {sortedEmployees.length > 0 ? (
                  sortedEmployees.map((employee, index) => (
                    <div
                      key={employee.id}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openEmployeeDetails(employee)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-semibold text-lg">
                          {employee.name.charAt(0)}
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-medium text-gray-900 truncate">
                              {employee.name}
                            </h3>
                            <div className="ml-2 flex-shrink-0 flex">
                              <Badge variant="outline" className={getRatingColor(employee.feedbackMetrics?.received?.averageRating || 0)}>
                                {formatRating(employee.feedbackMetrics?.received?.averageRating || 0)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{employee.jobTitle}</p>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <FaBuilding className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{employee.department}</span>
                            <span className="mx-1">•</span>
                            <FaStar className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-yellow-400" />
                            <span>{employee.feedbackMetrics?.received?.count || 0} reviews</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                      <FaSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No employees match your search criteria or there are no employees with sufficient feedback data.
                    </p>
                  </div>
                )}
                </div>
              </div>
              )}
            </TabsContent>

            {/* Search Results Tab */}
            <TabsContent value="search-results" className="custom-scrollbar overflow-y-auto max-h-[70vh]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <FaSearch className="text-purple-600 mr-2" />
                    Search Results
                  </h2>
                </div>

                {isSearching && (
                <div className="mt-6 text-center">
                  <FaSpinner className="animate-spin h-8 w-8 mx-auto text-purple-600" />
                  <p className="mt-2 text-sm text-gray-500">Searching for employees...</p>
                </div>
              )}
              {!isSearching && searchResults && (
                <div
                  className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => openEmployeeDetails(searchResults)}
                  title="Click to view feedback metrics and performance analysis"
                >
                  
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-semibold text-lg">
                        {searchResults?.name?.charAt(0) || '?'}
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-purple-700">{searchResults?.name || 'Unknown Employee'}</h3>
                        <p className="text-sm text-gray-500">{searchResults?.jobTitle || 'No title'}</p>
                        <p className="text-sm text-gray-500">{searchResults?.email || 'No email'}</p>
                        <p className="text-sm text-gray-500">{searchResults?.department || 'No department'}</p>
                        <div className="mt-2">
                          <Badge className={`${getRatingColor(searchResults?.feedbackMetrics?.received?.averageRating || 0)}`}>
                            {formatRating(searchResults?.feedbackMetrics?.received?.averageRating || 0)} average rating
                          </Badge>
                          <span className="ml-2 text-sm text-gray-500">
                            • {searchResults?.feedbackMetrics?.received?.count || 0} reviews
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto flex flex-col gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            searchResults && openEmployeeProfile(searchResults);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-purple-700 border-purple-300 hover:bg-purple-50"
                          title="View detailed employee profile (succession planning style)"
                        >
                          <FaUser className="mr-1" />
                          Employee Profile
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            searchResults && openEmployeeDetails(searchResults);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          size="sm"
                          title="View feedback metrics and performance analysis"
                        >
                          <FaChartBar className="mr-1" />
                          Feedback Metrics
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!isSearching && searchQuery && !searchResults && (
                <div className="mt-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                    <FaSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No employees match your search criteria.
                  </p>
                </div>
              )}
              {!isSearching && !searchQuery && !searchResults && (
                <div className="mt-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                    <FaSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Search for employees</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter a name or email address to search for employees.
                  </p>
                </div>
              )}
            </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Employee Details Modal - Enhanced */}
      {showEmployeeDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEmployeeDetails(false)} />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FaUser className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">Employee Evaluation</h2>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowEmployeeDetails(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6 bg-white employee-profile-content">
                {selectedEmployee && (
                  <div className="space-y-6">
                    <EmployeeProfileContent
                      employee={selectedEmployee}
                      showAllFeedback={showAllFeedback}
                      setShowAllFeedback={setShowAllFeedback}
                    />
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => exportEmployeeProfileToPDF()}
                  disabled={isExportingPDF}
                  className="px-5 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
                >
                  {isExportingPDF ? (
                    <FaSpinner className="animate-spin h-4 w-4" />
                  ) : (
                    'Export'
                  )}
                </button>
                <button
                  onClick={() => setShowEmployeeDetails(false)}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile Modal - Enhanced */}
      {showEmployeeProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEmployeeProfile(false)} />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FaUserTie className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">Employee Profile</h2>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowEmployeeProfile(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6 bg-white">
                {selectedEmployee && (
                  <div className="space-y-6">
                    <SuccessionPlanningProfileContent employee={selectedEmployee} />
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <button 
                  onClick={() => setShowEmployeeProfile(false)}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EvaluationMetricsTourLauncher />
    </div>
  );
}

// Comprehensive Employee Profile Content Component
interface EmployeeProfileContentProps {
  employee: EmployeeProfile;
  showAllFeedback: boolean;
  setShowAllFeedback: (show: boolean) => void;
}

function EmployeeProfileContent({ employee, showAllFeedback, setShowAllFeedback }: EmployeeProfileContentProps) {
  console.log('[EmployeeProfileContent] Rendering profile for:', employee.name);
  console.log('[EmployeeProfileContent] Employee data:', {
    feedbackDetailsCount: employee.feedbackDetails?.length || 0,
    showAllFeedback,
    hasPerformanceAnalytics: !!employee.performanceAnalytics,
    attritionRisk: employee.attritionRisk,
    utilizationScore: employee.utilization_score
  });

  const formatRating = (rating: number) => {
    return rating ? rating.toFixed(2) : 'N/A';
  };

  const getRatingColor = (rating: number) => {
    // Using consistent purple styling for all ratings
    return 'text-purple-800 bg-purple-100 border-purple-200';
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship?.toLowerCase()) {
      case 'direct-reporting': return 'bg-blue-100 text-blue-800';
      case 'project-collaboration': return 'bg-green-100 text-green-800';
      case 'no-connection': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const feedbackToShow = showAllFeedback ? employee.feedbackDetails : employee.feedbackDetails?.slice(0, 5);

  console.log('[EmployeeProfileContent] Feedback to show:', {
    totalFeedback: employee.feedbackDetails?.length || 0,
    showingCount: feedbackToShow?.length || 0,
    showAllFeedback
  });

  return (
    <div className="space-y-8">
      {/* Employee Basic Information */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-base font-medium text-gray-700">Employee Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
            <p className="text-base text-gray-800">{employee.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
            <p className="text-base text-gray-800">{employee.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</p>
            <p className="text-base text-gray-800">{employee.jobTitle}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Department</p>
            <p className="text-base text-gray-800">{employee.department}</p>
          </div>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-base font-medium text-gray-700">Performance Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-900 uppercase tracking-wider">Total Reviews</p>
            <p className="text-base text-gray-800">{employee.feedbackMetrics?.received?.count || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Rating</p>
            <p className="text-base text-gray-800">{formatRating(employee.feedbackMetrics?.received?.averageRating || 0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weighted Rating</p>
            <p className="text-base text-gray-800">{formatRating(employee.feedbackMetrics?.received?.weightedAverageRating || 0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback Entries</p>
            <p className="text-base text-gray-800">{employee.feedbackDetails?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Performance Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Rating Distribution */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaChartBar className="w-5 h-5 text-purple-600" />
            Rating Distribution
          </h3>
          <RatingDistributionChart feedbackDetails={employee.feedbackDetails || []} />
        </div>

        {/* 2. Performance Categories */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaUsers className="w-5 h-5 text-purple-600" />
            Performance Categories
          </h3>
          <PerformanceCategoriesChart feedbackDetails={employee.feedbackDetails || []} />
        </div>
      </div>

      {/* Performance Charts Section - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Weighted vs Normal Ratings */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaBalanceScale className="w-5 h-5 text-purple-600" />
            Weighted vs Normal Ratings
          </h3>
          <WeightedVsNormalChart employee={employee} />
        </div>

        {/* 4. Feedback by Relationship */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaUserTie className="w-5 h-5 text-purple-600" />
            Feedback by Relationship
          </h3>
          <RelationshipAnalysisChart feedbackDetails={employee.feedbackDetails || []} />
        </div>
      </div>

      {/* Performance Charts Section - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Rating Consistency */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaChartBar className="w-5 h-5 text-purple-600" />
            Rating Consistency
          </h3>
          <RatingConsistencyChart feedbackDetails={employee.feedbackDetails || []} />
        </div>

        {/* 6. Feedback Given */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaPencilAlt className="w-5 h-5 text-purple-600" />
            Feedback Given
          </h3>
          <FeedbackGivenChart employee={employee} />
        </div>
      </div>

      {/* Creative Visualizations Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Skills Word Cloud */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaStar className="w-5 h-5 text-purple-600" />
            Word Cloud
          </h3>
          <SkillsWordCloud feedbackDetails={employee.feedbackDetails || []} skillsFeedback={employee.skillsFeedback} />
        </div>
      </div>

      {/* Feedback Timeline */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaCalendarAlt className="w-5 h-5 text-purple-600" />
          Feedback Timeline
        </h3>
        <FeedbackTimeline feedbackDetails={employee.feedbackDetails || []} />
      </div>

      {/* Detailed Feedback from Different People */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaUsers className="w-5 h-5" />
            Feedback from Colleagues ({employee.feedbackDetails?.length || 0} total)
          </h3>
          {employee.feedbackDetails && employee.feedbackDetails.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllFeedback(!showAllFeedback)}
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              {showAllFeedback ? 'Show Less' : 'Show All'}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {feedbackToShow && feedbackToShow.length > 0 ? (
            feedbackToShow.map((feedback, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{feedback.evaluatorName}</h4>
                      <Badge className={getRelationshipColor(feedback.relationshipType)}>
                        {feedback.relationshipType?.replace('-', ' ') || 'Unknown'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{feedback.evaluatorEmail}</p>
                    <p className="text-sm text-gray-600">{feedback.evaluatorJobTitle}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getRatingColor(feedback.averageRating)}>
                      {formatRating(feedback.averageRating)}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{feedback.quarter}</p>
                  </div>
                </div>

                {/* Individual Rating Categories */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  {Object.entries(feedback.ratings || {}).map(([category, rating]) => (
                    <div key={category} className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600 capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-sm font-medium text-gray-900">{rating}</p>
                    </div>
                  ))}
                </div>

                {/* Skills Feedback */}
                {feedback.topSkills && (
                  <div className="mt-3 p-3 bg-purple-50 rounded">
                    <p className="text-sm font-medium text-gray-700 mb-1">Skills Highlighted:</p>
                    <p className="text-sm text-gray-900">{feedback.topSkills}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No feedback data available</p>
          )}
        </div>
      </div>

      {/* Additional Employee Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Work Mode:</span>
              <span className="text-sm text-gray-900">{employee.workMode || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Office Location:</span>
              <span className="text-sm text-gray-900">{employee.officeLocation || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Utilization Score:</span>
              <span className="text-sm text-gray-900">{employee.utilization_score ? `${(employee.utilization_score * 10).toFixed(0)}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Attrition Score:</span>
              <span className="text-sm text-gray-900">{employee.attritionScore ? `${(employee.attritionScore * 100).toFixed(0)}%` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills & Tools</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Tools Proficient:</p>
              <p className="text-sm text-gray-900">{employee.toolsProficient || 'Not specified'}</p>
            </div>
            {employee.skillsFeedback && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Skills Mentioned in Feedback:</p>
                <div className="flex flex-wrap gap-2">
                  {employee.skillsFeedback.received?.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions for rating display
const getRatingColor = (rating: number): string => {
  // Using consistent purple styling for all ratings
  return 'text-purple-600';
};

const getRatingLabel = (rating: number): string => {
  if (rating >= 4.5) return 'Outstanding';
  if (rating >= 4.0) return 'Exceeds Expectations';
  if (rating >= 3.5) return 'Strong';
  if (rating >= 3.0) return 'Meets Expectations';
  if (rating >= 2.0) return 'Needs Improvement';
  return 'Unsatisfactory';
};

// Gauge utility functions
const getGaugeRotation = (rating: number): number => {
  // Convert rating (0-5) to degrees (-90 to 90)
  // 0 = -90° (far left), 2.5 = 0° (middle), 5 = 90° (far right)
  return (rating / 5) * 180 - 90;
};

const getGaugeColor = (rating: number): string => {
  if (rating >= 4) return 'from-green-400 to-green-600';
  if (rating >= 3) return 'from-blue-400 to-blue-600';
  if (rating >= 2) return 'from-yellow-400 to-yellow-600';
  return 'from-red-400 to-red-600';
};

// Visual Chart Components
function RatingDistributionChart({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  console.log('[RatingDistributionChart] Processing', feedbackDetails.length, 'feedback records');

  const ratingCounts = { Outstanding: 0, Excellent: 0, 'Very Good': 0, Good: 0, Average: 0 };
  
  // Count ratings from all feedback
  feedbackDetails.forEach(feedback => {
    if (feedback.ratings) {
      Object.values(feedback.ratings).forEach(rating => {
        if (rating && ratingCounts.hasOwnProperty(rating)) {
          ratingCounts[rating as keyof typeof ratingCounts]++;
        }
      });
    }
  });

  const totalRatings = Object.values(ratingCounts).reduce((sum, count) => sum + count, 0);
  const hasData = totalRatings > 0;

  return (
    <div className="space-y-4">
      {hasData ? (
        <div className="space-y-4">
          {Object.entries(ratingCounts).map(([rating, count]) => {
            const percentage = totalRatings ? Math.round((count / totalRatings) * 100) : 0;
            const barWidth = Math.max(10, (count / Math.max(...Object.values(ratingCounts))) * 100);

            return (
              <div key={rating} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{rating}</span>
                  <span className="text-gray-600">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No rating data available</p>
          <p className="text-sm text-gray-400 mt-1">Employee needs feedback to display rating distribution</p>
        </div>
      )}
    </div>
  );
}

function PerformanceCategoriesChart({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  const categories = ['accountability', 'teamContribution', 'adaptability', 'communication', 'confidence'];
  const categoryNames = {
    accountability: 'Accountability',
    teamContribution: 'Team Contribution',
    adaptability: 'Adaptability',
    communication: 'Communication',
    confidence: 'Confidence'
  };

  const categoryAverages = categories.map(category => {
    const ratings = feedbackDetails
      .map(f => f.ratings?.[category as keyof typeof f.ratings])
      .filter(Boolean)
      .map(rating => {
        switch (rating) {
          case 'Outstanding': return 5;
          case 'Excellent': return 4;
          case 'Very Good': return 3;
          case 'Good': return 2;
          case 'Average': return 1;
          default: return 0;
        }
      });

    const average = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
      : 0;

    return {
      category,
      name: categoryNames[category as keyof typeof categoryNames],
      average,
      count: ratings.length
    };
  }).filter(cat => cat.count > 0);

  const maxAverage = Math.max(...categoryAverages.map(c => c.average), 5);
  const hasData = categoryAverages.length > 0;

  return (
    <div className="space-y-4">
      {hasData ? (
        <div className="space-y-4">
          {categoryAverages.map(({ category, name, average, count }) => {
            const scorePercentage = (average / maxAverage) * 100;
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{name}</span>
                  <span className="text-gray-600">{average.toFixed(1)}/5 ({count})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-500"
                    style={{ width: `${scorePercentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No category data available</p>
          <p className="text-sm text-gray-400 mt-1">Employee needs feedback to display performance categories</p>
        </div>
      )}
    </div>
  );
}

function QuarterlyTrendsChart({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  console.log('[QuarterlyTrendsChart] Processing', feedbackDetails.length, 'feedback records');

  // Group feedback by quarter
  const quarterlyData = feedbackDetails.reduce((acc, feedback) => {
    const quarter = feedback.quarter || 'Unknown';
    if (!acc[quarter]) {
      acc[quarter] = [];
    }
    acc[quarter].push(feedback);
    return acc;
  }, {} as Record<string, FeedbackDetail[]>);

  const quarters = Object.keys(quarterlyData).filter(q => q !== 'Unknown').sort();
  console.log('[QuarterlyTrendsChart] Found quarters:', quarters);

  return (
    <div className="space-y-4">
      {quarters.length > 0 ? (
        <div className="space-y-4">
          {/* Visual Chart */}
          <div className="relative h-40 bg-gradient-to-b from-gray-50 to-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-end justify-between h-full gap-2">
              {quarters.map((quarter, index) => {
                const quarterFeedback = quarterlyData[quarter];
                const avgRating = quarterFeedback.reduce((sum, f) => sum + (f.averageRating || 0), 0) / quarterFeedback.length;
                const height = Math.max(10, (avgRating / 5) * 100); // Ensure minimum height for visibility

                return (
                  <div key={quarter} className="flex flex-col items-center flex-1 group">
                    <div className="w-full max-w-16 relative">
                      <div 
                        className="w-full bg-gradient-to-t from-purple-700 to-purple-500 rounded-t-lg transition-all duration-300 group-hover:opacity-90"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent rounded-t-lg"></div>
                      </div>
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-full text-center">
                        <span className="text-xs text-gray-700 font-medium">{avgRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-6 text-center font-medium">{quarter}</span>
                  </div>
                );
              })}
            </div>
          </div>

         
 
        </div>
      ) : (
        <div className="text-center py-8 bg-white/50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-500">No quarterly data available</p>
          <p className="text-sm text-gray-400 mt-1">Feedback across multiple quarters will appear here</p>
        </div>
      )}
    </div>
  );
}

function RelationshipAnalysisChart({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  // Group feedback by relationship type
  const relationshipData = feedbackDetails.reduce((acc, feedback) => {
    const relationship = feedback.relationshipType || 'Unknown';
    if (!acc[relationship]) {
      acc[relationship] = [];
    }
    acc[relationship].push(feedback);
    return acc;
  }, {} as Record<string, FeedbackDetail[]>);

  const relationships = Object.keys(relationshipData).filter(r => r !== 'Unknown');
  const maxCount = Math.max(...Object.values(relationshipData).map(arr => arr.length));

  // Define consistent purple shades for different relationship types
  const getRelationshipColor = (rel: string) => {
    const colors = {
      'direct-reporting': 'from-purple-700 to-purple-800',
      'project-collaboration': 'from-purple-600 to-purple-700',
      'no-connection': 'from-purple-500 to-purple-600',
      'peer': 'from-purple-400 to-purple-500',
      'manager': 'from-purple-800 to-purple-900',
      'cross-functional': 'from-purple-300 to-purple-400'
    };
    
    const defaultColor = 'from-purple-400 to-purple-500';
    const relLower = rel.toLowerCase();
    return colors[relLower as keyof typeof colors] || defaultColor;
  };

  // Format relationship name for display
  const formatRelationshipName = (rel: string) => {
    return rel
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      {relationships.length > 0 ? (
        <div className="space-y-4">
          {/* Visual Relationship Distribution */}
          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {relationships.map((relationship) => {
                const relationshipFeedback = relationshipData[relationship];
                const avgRating = relationshipFeedback.reduce((sum, f) => sum + (f.averageRating || 0), 0) / relationshipFeedback.length;
                const count = relationshipFeedback.length;
                const percentageOfTotal = (count / feedbackDetails.length) * 100;
                const heightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                  <div key={relationship} className="group">
                    <div className="flex items-end h-24 mb-2 relative">
                      <div className="w-full flex flex-col items-center">
                        <div 
                          className={`w-3/4 rounded-t-lg bg-gradient-to-t ${getRelationshipColor(relationship)} transition-all duration-300 group-hover:opacity-90`}
                          style={{ height: `${Math.max(heightPercentage, 10)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent rounded-t-lg"></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-700">{formatRelationshipName(relationship)}</p>
                      <p className="text-xs text-gray-500">{count} {count === 1 ? 'rating' : 'ratings'}</p>
                      <div className="mt-1 flex items-center justify-center">
                        <span className="text-xs font-medium text-purple-700">{avgRating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400 mx-1">/ 5.0</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Performance by Relationship</h4>
            <div className="space-y-3">
              {relationships.map(relationship => {
                const relationshipFeedback = relationshipData[relationship];
                const avgRating = relationshipFeedback.reduce((sum, f) => sum + (f.averageRating || 0), 0) / relationshipFeedback.length;
                const percentage = (avgRating / 5) * 100;
                const count = relationshipFeedback.length;

                return (
                  <div key={relationship} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getRelationshipColor(relationship).split(' ')[0].replace('from-', 'bg-')}`}></div>
                        <span className="text-sm font-medium text-gray-800 capitalize">
                          {formatRelationshipName(relationship)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-purple-700">{avgRating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400 ml-1">/ 5.0</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{count} {count === 1 ? 'rating' : 'ratings'}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${getRelationshipColor(relationship)} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-white/50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-500">No relationship data available</p>
          <p className="text-sm text-gray-400 mt-1">Feedback from different relationships will appear here</p>
        </div>
      )}
    </div>
  );
}

function WeightedVsNormalChart({ employee }: { employee: EmployeeProfile }) {
  const normalRating = employee.feedbackMetrics?.received?.averageRating || 0;
  const weightedRating = employee.feedbackMetrics?.received?.weightedAverageRating || 0;
  const difference = weightedRating - normalRating;

  const RatingBar = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value.toFixed(1)}/5.0</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color}`}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        {label === 'Standard' ? 'Simple average of all ratings' : 'Adjusted for evaluator seniority'}
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
      
      <div className="space-y-6">
        <RatingBar 
          value={normalRating} 
          label="Standard" 
          color="bg-purple-500" 
        />
        
        <RatingBar 
          value={weightedRating} 
          label="Weighted" 
          color="bg-indigo-500" 
        />
        
        {Math.abs(difference) > 0.1 && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            difference > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            <div className="flex items-center justify-center gap-2">
              {difference > 0 ? (
                <FaArrowUp className="text-green-500" />
              ) : (
                <FaArrowDown className="text-amber-500" />
              )}
              <span>
                Weighted rating is <span className="font-semibold">{Math.abs(difference).toFixed(1)} points</span> {
                  difference > 0 ? 'higher' : 'lower'
                }
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        Weighted ratings give more importance to feedback from senior team membersdback from senior evaluators and direct reports
      </div>
    </div>
  );
}

function EvaluatorSeniorityChart({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  // Group feedback by evaluator role/seniority
  const seniorityData = feedbackDetails.reduce((acc, feedback) => {
    const role = feedback.evaluatorInternalRole || 'Unknown';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(feedback);
    return acc;
  }, {} as Record<string, FeedbackDetail[]>);

  const roles = Object.keys(seniorityData);

  const getRoleLevel = (role: string) => {
    if (role.includes('admin') || role.includes('top_mgmt')) return 'Senior';
    if (role.includes('employee_tier_1')) return 'Senior Employee';
    if (role.includes('employee_tier_2')) return 'Mid-level Employee';
    if (role.includes('employee_tier_3')) return 'Junior Employee';
    return 'Unknown';
  };

  const getRoleColor = (role: string) => {
    const level = getRoleLevel(role);
    switch (level) {
      case 'Senior': return 'bg-purple-600';
      case 'Senior Employee': return 'bg-blue-600';
      case 'Mid-level Employee': return 'bg-green-600';
      case 'Junior Employee': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {roles.length > 0 ? (
        roles.map(role => {
          const roleFeedback = seniorityData[role];
          const avgRating = roleFeedback.reduce((sum, f) => sum + (f.averageRating || 0), 0) / roleFeedback.length;
          const percentage = (avgRating / 5) * 100;
          const roleLevel = getRoleLevel(role);

          return (
            <div key={role} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{roleLevel}</span>
                <span className="text-sm text-gray-600">{avgRating.toFixed(2)} ({roleFeedback.length})</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getRoleColor(role)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-gray-500 text-sm">No seniority data available</p>
      )}
    </div>
  );
}

// Creative Visualization Components
function SkillsWordCloud({ feedbackDetails, skillsFeedback }: { feedbackDetails: FeedbackDetail[], skillsFeedback?: any }) {
  // Extract skills from feedback and skills feedback
  const skillsText = [];

  // From feedback details
  feedbackDetails.forEach(feedback => {
    if (feedback.topSkills) {
      skillsText.push(feedback.topSkills);
    }
  });

  // From skills feedback
  if (skillsFeedback?.received) {
    skillsText.push(...skillsFeedback.received);
  }

  // Create word frequency map
  const words = skillsText.join(' ').toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'then', 'them', 'well', 'were'].includes(word));

  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const sortedWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20);

  return (
    <div className="space-y-4">
      {sortedWords.length > 0 ? (
        <div className="flex flex-wrap gap-2 justify-center">
          {sortedWords.map(([word, freq], index) => {
            const size = Math.max(12, Math.min(24, 12 + (freq * 2)));
            const opacity = Math.max(0.4, Math.min(1, 0.4 + (freq * 0.2)));
            const colors = ['text-purple-600', 'text-blue-600', 'text-green-600', 'text-orange-600', 'text-red-600'];
            const color = colors[index % colors.length];

            return (
              <span
                key={word}
                className={`font-semibold ${color} hover:scale-110 transition-transform cursor-default`}
                style={{
                  fontSize: `${size}px`,
                  opacity: opacity
                }}
                title={`Mentioned ${freq} times`}
              >
                {word}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No skills data available</p>
          <p className="text-sm text-gray-400 mt-1">Skills will appear here when feedback contains skill mentions</p>
        </div>
      )}

      {sortedWords.length > 0 && (
        <div className="text-xs text-gray-600 text-center mt-4">
          Word cloud based on {skillsText.length} feedback entries • Larger words appear more frequently
        </div>
      )}
    </div>
  );
}

function FeedbackTimeline({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  const sortedFeedback = [...feedbackDetails]
    .filter(f => f.createdAt)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  if (sortedFeedback.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No timeline data available</p>
        <p className="text-sm text-gray-400 mt-1">Feedback timeline will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-purple-200"></div>

        {/* Timeline items */}
        <div className="space-y-4">
          {sortedFeedback.slice(-6).map((feedback, index) => (
            <div key={index} className="relative flex items-start">
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {feedback.averageRating?.toFixed(1) || 'N/A'}
              </div>

              {/* Content */}
              <div className="ml-4 flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-gray-900">{feedback.evaluatorName}</span>
                    <span className="text-xs text-gray-500">{feedback.quarter}</span>
                  </div>
                  <p className="text-xs text-gray-600">{feedback.evaluatorJobTitle}</p>
                  {feedback.topSkills && (
                    <p className="text-xs text-purple-600 mt-1 italic">"{feedback.topSkills}"</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sortedFeedback.length > 6 && (
        <div className="text-xs text-gray-500 text-center">
          Showing latest 6 feedback entries • {sortedFeedback.length} total
        </div>
      )}
    </div>
  );
}

function RatingDistributionPie({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  const ratingCounts = { Outstanding: 0, Excellent: 0, 'Very Good': 0, Good: 0, Average: 0 };

  feedbackDetails.forEach(feedback => {
    if (feedback.ratings) {
      Object.values(feedback.ratings).forEach(rating => {
        if (rating && ratingCounts.hasOwnProperty(rating)) {
          ratingCounts[rating as keyof typeof ratingCounts]++;
        }
      });
    }
  });

  const total = Object.values(ratingCounts).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No rating data available</p>
        <p className="text-sm text-gray-400 mt-1">Rating distribution will appear here</p>
      </div>
    );
  }

  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
  const ratings = Object.entries(ratingCounts).filter(([, count]) => count > 0);

  return (
    <div className="space-y-4">
      {/* Visual pie representation using stacked bars */}
      <div className="space-y-2">
        {ratings.map(([rating, count], index) => {
          const percentage = (count / total) * 100;
          return (
            <div key={rating} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-600">{rating}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className={`h-4 rounded-full ${colors[index]} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-center text-xs text-gray-600 bg-gray-50 p-2 rounded">
        Total ratings analyzed: {total} across {feedbackDetails.length} feedback entries
      </div>
    </div>
  );
}

function EvaluatorNetwork({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  const evaluators = feedbackDetails.map(f => ({
    name: f.evaluatorName,
    jobTitle: f.evaluatorJobTitle,
    relationship: f.relationshipType,
    rating: f.averageRating || 0
  }));

  if (evaluators.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No evaluator data available</p>
        <p className="text-sm text-gray-400 mt-1">Evaluator network will appear here</p>
      </div>
    );
  }

  const getRelationshipColor = (relationship: string) => {
    switch (relationship?.toLowerCase()) {
      case 'direct-reporting': return 'bg-blue-500';
      case 'project-collaboration': return 'bg-green-500';
      case 'no-connection': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Network visualization */}
      <div className="relative bg-gray-50 rounded-lg p-4 h-32">
        <div className="flex items-center justify-center h-full">
          {/* Central employee node */}
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            ME
          </div>

          {/* Evaluator nodes arranged in circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            {evaluators.slice(0, 6).map((evaluator, index) => {
              const angle = (index * 60) * (Math.PI / 180); // 60 degrees apart
              const radius = 40;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={index}
                  className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${getRelationshipColor(evaluator.relationship)}`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`
                  }}
                  title={`${evaluator.name} - ${evaluator.rating.toFixed(1)}/5`}
                >
                  {evaluator.name.charAt(0)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-700">Evaluator Relationships:</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Direct Report</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Collaboration</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>No Connection</span>
          </div>
        </div>
      </div>

      {evaluators.length > 6 && (
        <div className="text-xs text-gray-500 text-center">
          Showing 6 of {evaluators.length} evaluators
        </div>
      )}
    </div>
  );
}

function FeedbackGivenChart({ employee }: { employee: EmployeeProfile }) {
  const [feedbackGivenData, setFeedbackGivenData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get feedback given metrics from employee data
  const feedbackGiven = employee.feedbackMetrics?.given || {};
  const averageGivenRating = feedbackGiven.averageRating || 0;
  const totalGiven = feedbackGiven.count || 0;

  // Fetch feedback given by this employee using the SAME API as feedback page
  useEffect(() => {
    const fetchFeedbackGiven = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('[FeedbackGivenChart] No token found');
          setIsLoading(false);
          return;
        }

        console.log('[FeedbackGivenChart] Fetching feedback given by:', employee.email);

        // Use the EXACT same API call as the feedback page
        const response = await fetch('/api/feedback?type=given', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[FeedbackGivenChart] API Response:', data);

          // The API returns { feedback: [...], metrics: {...} }
          const feedbackArray = data.feedback || [];
          setFeedbackGivenData(feedbackArray);

          console.log('[FeedbackGivenChart] Set feedback data:', feedbackArray.length, 'entries');
        } else {
          console.error('[FeedbackGivenChart] API call failed:', response.status, response.statusText);
          setFeedbackGivenData([]);
        }
      } catch (error) {
        console.error('[FeedbackGivenChart] Error fetching feedback given:', error);
        setFeedbackGivenData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedbackGiven();
  }, [employee.email]);

  // Get last 5 feedback entries given - sort by date
  const recentFeedbackGiven = feedbackGivenData
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    })
    .slice(0, 5);

  console.log('[FeedbackGivenChart] Final data:', {
    totalGiven,
    averageGivenRating,
    fetchedDataLength: feedbackGivenData.length,
    recentFeedbackLength: recentFeedbackGiven.length,
    sampleFeedback: recentFeedbackGiven[0]
  });
  const hasFeedback = totalGiven > 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-900">{totalGiven}</div>
          <div className="text-sm text-gray-600">Total Reviews Given</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-900">
            {hasFeedback ? averageGivenRating.toFixed(1) : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Average Rating</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading feedback given data...</p>
        </div>
      ) : recentFeedbackGiven.length > 0 ? (
        <>
          {/* Recent Feedback Given */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Recent Feedback Given (Last {recentFeedbackGiven.length})</h4>



            <div className="space-y-3">
              {recentFeedbackGiven.map((feedback: any, index: number) => {
                // Use the correct field names from the API response
                const recipientEmail = feedback.evaluatedEmail || 'Unknown Email';
                const relationship = feedback.relationshipType || 'Unknown';
                const rating = feedback.averageRating || 0;
                const quarter = feedback.quarter || '';
                const date = feedback.createdAt || '';
                const topSkills = feedback.topSkills || [];

                // Format relationship for display
                const relationshipDisplay = relationship
                  .split('-')
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');

                return (
                  <div key={feedback._id || index} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-black text-base">
                          {recipientEmail}
                        </div>
                        
                        {/* Relationship */}
                        <div className="text-xs text-gray-600 mt-1">
                          {relationshipDisplay}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-bold text-black">
                          {rating > 0 ? rating.toFixed(1) : 'N/A'}
                        </div>
                        {quarter && (
                          <div className="text-xs text-gray-500">{quarter}</div>
                        )}
                        {date && (
                          <div className="text-xs text-gray-500">
                            {new Date(date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Skills */}
                    {topSkills && Array.isArray(topSkills) && topSkills.length > 0 && (
                      <div className="mt-3 text-sm text-gray-700 bg-white p-3 rounded border-l-4 border-purple-400">
                        <div className="font-medium text-xs text-gray-500 mb-1">TOP SKILLS IDENTIFIED:</div>
                        <div className="flex flex-wrap gap-1">
                          {topSkills.slice(0, 5).map((skill: string, skillIndex: number) => (
                            <span key={skillIndex} className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}


                  </div>
                );
              })}
            </div>

            {totalGiven > 5 && (
              <div className="text-xs text-gray-500 text-center">
                Showing latest 5 of {totalGiven} feedback entries
              </div>
            )}
          </div>

          {/* Rating Tendency */}
          {averageGivenRating > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Rating Tendency</h4>
              <div className="text-sm text-gray-600">
                {averageGivenRating >= 4.5
                  ? 'Consistently gives high ratings'
                  : averageGivenRating >= 4.0
                  ? 'Generally positive in evaluations'
                  : averageGivenRating >= 3.5
                  ? 'Balanced evaluation approach'
                  : averageGivenRating >= 3.0
                  ? 'Tends toward average scores'
                  : 'More critical in evaluations'}
              </div>
              <div className="mt-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full"
                    style={{ width: `${(averageGivenRating / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <div className="text-gray-500 mb-4">
            <div className="text-lg font-medium">No Feedback Details Available</div>
            <div className="text-sm mt-2">
              {totalGiven > 0 ?
                `Metrics show ${totalGiven} reviews given (avg: ${averageGivenRating.toFixed(1)}), but detailed feedback records are not available in the current data structure.` :
                'This employee has not provided any feedback yet.'
              }
            </div>
          </div>


        </div>
      )}
    </div>
  );
}

// Succession Planning Style Profile Component
function SuccessionPlanningProfileContent({ employee }: { employee: EmployeeProfile }) {
  console.log('[SuccessionPlanningProfile] Rendering profile for:', employee.name);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold">
            {employee.name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{employee.name}</h2>
            <p className="text-purple-100">{employee.jobTitle}</p>
            <p className="text-purple-100">{employee.department}</p>
            <p className="text-purple-100">{employee.email}</p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaUser className="w-5 h-5 text-purple-600" />
            Personal Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Work Mode</p>
              <p className="font-medium text-gray-900">{employee.workMode || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Office Location</p>
              <p className="font-medium text-gray-900">{employee.officeLocation || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Salary</p>
              <p className="font-medium text-gray-900">{employee.salary || 'Not disclosed'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaChartBar className="w-5 h-5 text-purple-600" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Utilization Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (employee.utilization_score || 0) * 10)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{employee.utilization_score ? `${(employee.utilization_score * 10).toFixed(0)}%` : 'N/A'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Attrition Risk</p>
              <Badge className={`${
                employee.attritionRisk === 'Low' ? 'bg-green-100 text-green-800' :
                employee.attritionRisk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                employee.attritionRisk === 'High' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {employee.attritionRisk || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Attrition Score</p>
              <p className="font-medium text-gray-900">{employee.attritionScore ? `${(employee.attritionScore * 100).toFixed(0)}%` : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaStar className="w-5 h-5 text-purple-600" />
            Feedback Summary
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-900">Total Reviews</p>
              <p className="text-lg font-semibold text-gray-900">{employee.feedbackMetrics?.received?.count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-lg font-semibold text-gray-900">{employee.feedbackMetrics?.received?.averageRating?.toFixed(2) || 'N/A'}/5</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Weighted Rating</p>
              <p className="text-lg font-semibold text-gray-900">{employee.feedbackMetrics?.received?.weightedAverageRating?.toFixed(2) || 'N/A'}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills & Expertise and Additional Information Side by Side - Reversed with Additional Info taking more space */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Skills & Expertise - Takes 2/5 width */}
        <div className="lg:col-span-2 bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaBriefcase className="w-5 h-5 text-purple-600" />
            Skills & Expertise
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Tools Proficient</p>
              <p className="text-gray-900">{employee.toolsProficient || 'Not specified'}</p>
            </div>

            {employee.strengths && employee.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Strengths</p>
                <div className="flex flex-wrap gap-2">
                  {employee.strengths.map((strength, index) => (
                    <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {employee.developmentAreas && employee.developmentAreas.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Development Areas</p>
                <div className="flex flex-wrap gap-2">
                  {employee.developmentAreas.map((area, index) => (
                    <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information - Takes 3/5 width */}
        <div className="lg:col-span-3 bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaBuilding className="w-5 h-5 text-purple-600" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-medium text-gray-900">{employee.department || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Job Title</p>
                <p className="font-medium text-gray-900">{employee.jobTitle || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Work Mode</p>
                <p className="font-medium text-gray-900">{employee.workMode || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">{employee.officeLocation || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

function RatingConsistencyChart({ feedbackDetails }: { feedbackDetails: FeedbackDetail[] }) {
  if (feedbackDetails.length < 2) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Insufficient data for consistency analysis</p>
        <p className="text-sm text-gray-400 mt-1">Need at least 2 feedback records</p>
      </div>
    );
  }

  const ratings = feedbackDetails.map(f => f.averageRating || 0);
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - average, 2), 0) / ratings.length;
  const standardDeviation = Math.sqrt(variance);

  const consistencyScore = Math.max(0, 5 - standardDeviation); // Higher score = more consistent
  const consistencyPercentage = (consistencyScore / 5) * 100;

  // Create visual representation of rating spread
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const ratingRange = maxRating - minRating;

  return (
    <div className="space-y-6">
      {/* Visual Consistency Gauge */}
      <div className="relative h-20 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-center h-full">
          <div className="relative w-32 h-4 bg-gray-200 rounded-full">
            <div
              className="absolute h-4 bg-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${consistencyPercentage}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white mix-blend-difference">
                {consistencyScore.toFixed(1)}/5
              </span>
            </div>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-gray-600">Consistency Score</span>
        </div>
      </div>

      {/* Rating Distribution Visualization */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Rating Distribution</h4>
        <div className="relative h-12 bg-gray-100 rounded">
          {ratings.map((rating, index) => {
            const position = ((rating - 1) / 4) * 100; // Scale 1-5 to 0-100%
            return (
              <div
                key={index}
                className="absolute w-2 h-8 bg-purple-600 rounded-full top-2 transform -translate-x-1"
                style={{ left: `${position}%` }}
                title={`Rating: ${rating.toFixed(2)}`}
              ></div>
            );
          })}
          {/* Scale markers */}
          <div className="absolute bottom-0 left-0 text-xs text-gray-500">1</div>
          <div className="absolute bottom-0 left-1/4 text-xs text-gray-500">2</div>
          <div className="absolute bottom-0 left-1/2 text-xs text-gray-500">3</div>
          <div className="absolute bottom-0 left-3/4 text-xs text-gray-500">4</div>
          <div className="absolute bottom-0 right-0 text-xs text-gray-500">5</div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-sm text-gray-600">Average Rating</div>
          <div className="text-lg font-bold text-purple-600">{average.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Rating Range</div>
          <div className="text-lg font-bold text-gray-900">{ratingRange.toFixed(2)}</div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
        <strong>Interpretation:</strong> {
          consistencyScore >= 4 ? 'Very consistent ratings across evaluators - strong agreement on performance level.' :
          consistencyScore >= 3 ? 'Moderately consistent ratings - general agreement with some variation.' :
          consistencyScore >= 2 ? 'Some variation in ratings - mixed feedback from different evaluators.' :
          'High variation in ratings - significant disagreement among evaluators about performance.'
        }
      </div>
    </div>
  );
}
