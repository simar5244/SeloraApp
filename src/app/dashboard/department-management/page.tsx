'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiUser, FiEdit, FiSearch, FiCheck, FiX, FiInfo, FiUsers, FiEye, FiCheckCircle, FiXCircle, FiStar } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFieldArray } from 'react-hook-form';
import { DepartmentManagementTourLauncher } from '@/components/tour/DepartmentManagementTourLauncher';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  role: string;
  status?: 'active' | 'inactive' | 'pending';
  department?: string;
  phone?: string;
  location?: string;
  hireDate?: string;
  successor?: {
    name: string;
    title: string;
  };
  projects?: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
  }>;
  reportsTo?: string;
  utilization_score?: number;
  feedbackRating?: number;
  feedbackCount?: number;
  profileApproved?: boolean;
  profileApprovedBy?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  profileApprovedAt?: string;
  // Job profile fields
  jobResponsibilities?: { duty: string; hours: number }[];
  toolsProficient?: string;
  salary?: string;
  totalduration?: string;
  currentroleduration?: string;
  workMode?: string;
  officeLocation?: string;
  industry?: string;
}

interface UserDetails {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
  };
  feedback: {
    totalFeedbacks: number;
    averageRating: number;
    recentFeedback: any[];
  };
  successors: {
    successors: any[];
  };
  skillsFeedback: {
    given: string[];
    received: string[];
  };
}

const jobProfileSchema = z.object({
  jobTitle: z.string().min(1, { message: "Job title is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  jobResponsibilities: z.array(
    z.object({
      duty: z.string().min(1, { message: "Duty is required." }),
      hours: z.number().min(0, { message: "Hours must be >= 0." })
    })
  ).min(1, { message: "At least one duty is required." }),
  toolsProficient: z.string().optional(),
  salary: z.string().optional(),
  totalduration: z.string().optional(),
  currentroleduration: z.string().optional(),
  workMode: z.string().optional(),
  officeLocation: z.string().optional(),
  industry: z.string().optional(),
  reportsTo: z.string().optional(),
});

// Define work mode options
const workModeOptions = [
  { label: "Remote", value: "Remote" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "In-Office", value: "In-Office" }
];

// Define industry options
const industryOptions = [
  { label: "Technology", value: "Technology" },
  { label: "Finance", value: "Finance" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "Education", value: "Education" },
  { label: "Retail", value: "Retail" },
  { label: "Manufacturing", value: "Manufacturing" },
  { label: "Media", value: "Media" },
  { label: "Consulting", value: "Consulting" },
  { label: "Legal", value: "Legal" },
  { label: "Real Estate", value: "Real Estate" },
  { label: "Energy", value: "Energy" },
  { label: "Transportation", value: "Transportation" },
  { label: "Hospitality", value: "Hospitality" },
  { label: "Other", value: "Other" }
];

// Define major city options for office locations
const officeLocationOptions = [
  { label: "New York", value: "New York" },
  { label: "San Francisco", value: "San Francisco" },
  { label: "Los Angeles", value: "Los Angeles" },
  { label: "Chicago", value: "Chicago" },
  { label: "Seattle", value: "Seattle" },
  { label: "Boston", value: "Boston" },
  { label: "Austin", value: "Austin" },
  { label: "Denver", value: "Denver" },
  { label: "Atlanta", value: "Atlanta" },
  { label: "Miami", value: "Miami" },
  { label: "London", value: "London" },
  { label: "Toronto", value: "Toronto" },
  { label: "Berlin", value: "Berlin" },
  { label: "Singapore", value: "Singapore" },
  { label: "Remote Only", value: "Remote Only" },
  { label: "Other", value: "Other" }
];

export default function DepartmentManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Additional state for enhanced data fetching
  const [projects, setProjects] = useState<any[]>([]);
  const [successors, setSuccessors] = useState<any[]>([]);
  const [skillsFeedback, setSkillsFeedback] = useState<{given: string[], received: string[]}>({given: [], received: []});
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingSuccessors, setIsLoadingSuccessors] = useState(false);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const usersPerPage = 10;

  const jobProfileForm = useForm<z.infer<typeof jobProfileSchema>>({
    resolver: zodResolver(jobProfileSchema),
    defaultValues: {
      jobTitle: "",
      department: "",
      jobResponsibilities: [{ duty: "", hours: 0 }],
      toolsProficient: "",
      salary: "",
      totalduration: "",
      currentroleduration: "",
      workMode: "",
      officeLocation: "",
      industry: "",
      reportsTo: "",
    },
  });

  const { fields: dutyFields, append: appendDuty, remove: removeDuty } = useFieldArray({ 
    control: jobProfileForm.control, 
    name: 'jobResponsibilities' 
  });



  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchTerm) {
      const matchesSearch =
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.jobTitle && user.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved' && !user.profileApproved) return false;
      if (statusFilter === 'pending' && user.profileApproved) return false;
    }

    // Feedback filter
    if (feedbackFilter !== 'all') {
      const rating = user.feedbackRating || 0;
      if (feedbackFilter === 'high' && rating < 4.0) return false;
      if (feedbackFilter === 'low' && rating >= 4.0) return false;
    }

    // Role filter
    if (roleFilter !== 'all') {
      if (!user.role?.includes(roleFilter)) return false;
    }

    return true;
  });

  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const fetchCurrentUserDepartment = async (token: string): Promise<string | null> => {
    try {
      // First get user info from auth
      const authResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!authResponse.ok) {
        console.error('Failed to fetch current user profile');
        return null;
      }

      const userData = await authResponse.json();
      console.log('Current user profile:', userData);

      // If department is already available, return it
      if (userData.department && userData.department !== 'Unknown') {
        console.log('Department from auth/me:', userData.department);
        return userData.department;
      }

      // If not available, try to fetch from organization hierarchy (like org-chart does)
      try {
        console.log('Department not found in auth/me, trying organization hierarchy...');
        const orgResponse = await fetch('/api/organization/hierarchy');

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          console.log('Organization hierarchy data:', orgData);

          // Find current user in org data
          const currentUserInOrg = orgData.find((emp: any) =>
            emp.email?.toLowerCase() === userData.email?.toLowerCase()
          );

          if (currentUserInOrg?.department) {
            console.log('Department from organization hierarchy:', currentUserInOrg.department);
            return currentUserInOrg.department;
          }
        }
      } catch (orgError) {
        console.warn('Failed to fetch from organization hierarchy:', orgError);
      }

      // Fallback: try to get from profile API
      try {
        console.log('Trying profile API as fallback...');
        const profileResponse = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('Profile data:', profileData);

          if (profileData.department && profileData.department !== 'Unknown') {
            console.log('Department from profile API:', profileData.department);
            return profileData.department;
          }
        }
      } catch (profileError) {
        console.warn('Failed to fetch from profile API:', profileError);
      }

      console.log('No department found from any source');
      return null;
    } catch (error) {
      console.error('Error fetching current user department:', error);
      return null;
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      console.log('Starting to fetch users...');
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const url = new URL('/api/department-management/users', window.location.origin);
      
      if (searchTerm) {
        console.log('Adding search term to query:', searchTerm);
        url.searchParams.set('search', searchTerm);
      }
      
      console.log('Fetching users from:', url.toString());
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Failed to fetch users: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response Data:', data);
      
      if (!data.users) {
        console.error('No users array in response:', data);
        throw new Error('Invalid response format: users array is missing');
      }
      
      console.log('Current user department from API:', data.currentUserDepartment);
      console.log('Total users received:', data.users.length);
      
      let userDepartment = data.currentUserDepartment;
      
      // If department is not provided in the initial response, try to fetch it from the user's profile
      if (!userDepartment) {
        console.log('Department not found in initial response, fetching from user profile...');
        userDepartment = await fetchCurrentUserDepartment(token);
        console.log('Department from user profile:', userDepartment);
      }
      
      // Normalize the department name for consistency
      if (userDepartment) {
        // Helper function to normalize department names
        const normalizeDepartment = (word: string): string => {
          return word
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };
        const formattedDept = userDepartment
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setCurrentUserDepartment(formattedDept);
        userDepartment = formattedDept; // Update the local variable for filtering
      }
      
      // Filter users by department if we have it, otherwise show all users
      const filteredUsers = userDepartment
        ? data.users.filter((user: User) => {
            // Normalize both department names for comparison
            const normalize = (dept: string | undefined) => 
              dept ? dept.toString().toLowerCase().trim() : '';
            
            const userDept = normalize(user.department);
            const targetDept = normalize(userDepartment);
            
            // If either is empty, don't filter
            if (!userDept || !targetDept) {
              console.log(`No department to compare for ${user.email} - showing all`);
              return true;
            }
            
            // Check for partial match (in case of different formats)
            const matches = userDept.includes(targetDept) || targetDept.includes(userDept);
            
            if (!matches) {
              console.log(`User ${user.email} filtered out - department: '${user.department || 'none'}', expected: '${userDepartment}'`);
            } else {
              console.log(`User ${user.email} included - department: '${user.department}'`);
            }
            return matches;
          })
        : data.users; // If we still don't have a department, show all users
      
      console.log('Filtered users count:', filteredUsers.length);
      
      if (filteredUsers.length === 0) {
        console.warn('No users matched the department filter. Showing all users for debugging.');
        setUsers(data.users);
      } else {
        setUsers(filteredUsers);
      }
      
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  // Fetch users when component mounts, search changes, or department changes
  useEffect(() => {
    fetchUsers();
    setCurrentPage(1);
  }, [searchTerm, currentUserDepartment, fetchUsers]);

  const handleApproveProfile = async (user: User, approve: boolean) => {
    const token = localStorage.getItem('token');
    
    const approvePromise = fetch('/api/department-management/users', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user._id,
        action: approve ? 'approve' : 'unapprove'
      })
    });
    
    toast.promise(
      approvePromise.then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || `Failed to ${approve ? 'approve' : 'unapprove'} profile`);
        }
        await fetchUsers();
        return response.json();
      }),
      {
        loading: `${approve ? 'Approving' : 'Unapproving'} profile...`,
        success: (data) => `Profile ${approve ? 'approved' : 'unapproved'} successfully!`,
        error: (err) => {
          console.error('Error updating profile approval:', err);
          return err instanceof Error ? err.message : `An error occurred while ${approve ? 'approving' : 'unapproving'} the profile`;
        },
      }
    );
  };

  // Function to handle re-approval for already approved profiles
  const handleReApproval = async (user: User) => {
    const token = localStorage.getItem('token');

    const reApprovalPromise = fetch(`/api/department-management/users/${user._id}/re-approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    toast.promise(
      reApprovalPromise.then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to submit for re-approval');
        }
        await fetchUsers();
        return response.json();
      }),
      {
        loading: 'Submitting for re-approval...',
        success: 'Profile submitted for re-approval successfully!',
        error: (err) => {
          console.error('Error submitting for re-approval:', err);
          return err instanceof Error ? err.message : 'An error occurred while submitting for re-approval';
        },
      }
    );
  };

  const handleEditUser = async (user: User) => {
    try {
      setSelectedUser(user);
      
      // Populate form with current user data
      jobProfileForm.reset({
        jobTitle: user.jobTitle || "",
        department: user.department || "",
        jobResponsibilities: user.jobResponsibilities?.map(duty => ({ duty: duty.duty, hours: duty.hours })) || [{ duty: "", hours: 0 }],
        toolsProficient: user.toolsProficient || "",
        salary: user.salary || "",
        totalduration: user.totalduration || "",
        currentroleduration: user.currentroleduration || "",
        workMode: user.workMode || "",
        officeLocation: user.officeLocation || "",
        industry: user.industry || "",
        reportsTo: user.reportsTo || "",
      });
      
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error preparing edit modal:', error);
      toast.error('Failed to load user data for editing');
    }
  };

  const handleSaveUser = async (values: z.infer<typeof jobProfileSchema>) => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Convert jobResponsibilities to array of objects
      const jobResponsibilities = values.jobResponsibilities.map(duty => ({
        duty: duty.duty,
        hours: Number(duty.hours)
      }));
      
      const updateData = {
        ...values,
        jobResponsibilities
      };
      
      const response = await fetch(`/api/department-management/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user');
      }
      
      toast.success('User profile updated successfully!');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await fetchUsers();
      
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user profile');
    }
  };

  // Fetch projects data for employee (similar to org-chart)
  const fetchEmployeeProjects = async (email: string) => {
    try {
      setIsLoadingProjects(true);
      const url = `/api/organization/employee/projects?email=${encodeURIComponent(email)}`;
      console.log(`Fetching projects from API: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received projects data:', data);

      if (data.projects && Array.isArray(data.projects)) {
        setProjects(data.projects);
      } else {
        console.warn('No projects found in response');
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch successor data from API (similar to org-chart)
  const fetchSuccessors = async (email: string) => {
    console.log('=== START fetchSuccessors ===');
    console.log('Employee email:', email);

    try {
      setIsLoadingSuccessors(true);

      const url = `/api/organization/employee/successors?email=${encodeURIComponent(email)}`;
      console.log('🔍 Fetching successors from API:', url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Received successor data:', data);

        let successorCandidates = [];

        if (data.successorAnalysis?.successor_candidates) {
          successorCandidates = data.successorAnalysis.successor_candidates;
        } else if (data.successor_candidates) {
          successorCandidates = data.successor_candidates;
        } else if (Array.isArray(data)) {
          successorCandidates = data;
        } else if (data.candidate_email || data.candidateEmail) {
          successorCandidates = [data];
        }

        console.log('🎯 Final successor candidates:', successorCandidates);
        setSuccessors(successorCandidates);
      } else {
        console.warn(`⚠️ API returned ${response.status}: ${response.statusText}`);
        setSuccessors([]);
      }
    } catch (error) {
      console.error('Error fetching successors:', error);
      setSuccessors([]);
    } finally {
      setIsLoadingSuccessors(false);
    }
    console.log('=== END fetchSuccessors ===');
  };

  // Fetch skills feedback (similar to org-chart)
  const fetchSkillsFeedback = async (email: string) => {
    if (!email) return;

    setIsLoadingSkills(true);

    try {
      const response = await fetch(`/api/feedback/skills?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skills feedback');
      }

      const data = await response.json();
      setSkillsFeedback(data);
    } catch (error) {
      console.error('Error fetching skills feedback:', error);
      setSkillsFeedback({given: [], received: []});
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const handleViewDetails = async (user: User) => {
    try {
      // Set the selected user first
      setSelectedUser(user);

      // Fetch additional data in parallel
      if (user.email) {
        await Promise.all([
          fetchEmployeeProjects(user.email),
          fetchSuccessors(user.email),
          fetchSkillsFeedback(user.email)
        ]);
      }
    } catch (error) {
      console.error('Error fetching complete user data:', error);
    }

    setViewModalOpen(true);
    // Reset to first tab when opening modal
    setActiveTab('profile');
  };

  // Helper function to get appropriate badge class for role
  const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'top_management_tier_1':
      case 'top_management_tier_2':
      case 'top_management_tier_3':
        return 'bg-purple-100 text-purple-800';
      case 'employee_tier_1':
      case 'employee_tier_2':
      case 'employee_tier_3':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to display role in a more readable format
  const displayRole = (role: string): string => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'top_management_tier_1': return 'Management Tier 1';
      case 'top_management_tier_2': return 'Management Tier 2';
      case 'top_management_tier_3': return 'Management Tier 3';
      case 'employee_tier_1': return 'Employee Tier 1';
      case 'employee_tier_2': return 'Employee Tier 2';
      case 'employee_tier_3': return 'Employee Tier 3';
      default: return role;
    }
  };

  // Helper function to format role type for table display
  const formatRoleType = (role: string): string => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'top_management_tier_1': return 'Employee T1';
      case 'top_management_tier_2': return 'Employee T2';
      case 'top_management_tier_3': return 'Employee T3';
      case 'employee_tier_1': return 'Employee T1';
      case 'employee_tier_2': return 'Employee T2';
      case 'employee_tier_3': return 'Employee T3';
      case 'employee': return 'Employee';
      default: return role || 'Employee';
    }
  };

  // Star rating display component
  const StarRatingDisplay = ({
    rating = 0,
    count = 0,
    className = ''
  }: {
    rating?: number;
    count?: number;
    className?: string
  }) => (
    <div className={`flex items-center ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar
          key={star}
          className={
            star <= Math.round(rating)
              ? 'text-yellow-400 fill-current h-4 w-4'
              : 'text-gray-300 h-4 w-4'
          }
        />
      ))}
      {count > 0 && (
        <span className="ml-1 text-xs text-gray-500">
          ({count})
        </span>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 bg-gray-50 min-h-screen">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mt-4">
          <span className="text-purple-700">Department</span> Management
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
          Manage employees in your department, edit their job profiles, and approve their information.
        </p>
        {currentUserDepartment && (
          <div className="mt-4">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-sm px-3 py-1">
              Your Department: {currentUserDepartment}
            </Badge>
          </div>
        )}
      </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search employees..."
                className="pl-9 pr-4 py-2.5 w-full text-sm rounded-md border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-tour="search-employees"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3" data-tour="filter-controls">
              {/* Status Filter */}
              <div className="flex flex-col">

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[140px] appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Feedback Filter */}
              <div className="flex flex-col">
                <select
                  value={feedbackFilter}
                  onChange={(e) => setFeedbackFilter(e.target.value)}
                  className="pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[140px] appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="all">All Feedback</option>
                  <option value="high">High (4.0+)</option>
                  <option value="low">Low (&lt;4.0)</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex flex-col">

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[140px] appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="employee">Employee</option>
                  <option value="top_management">Top Management</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]" data-tour="employee-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-[35%] px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                  <th className="w-[18%] px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role Type</th>
                  <th className="w-[20%] px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Feedback</th>
                  <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="w-[12%] px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FaSpinner className="h-8 w-8 text-purple-600 animate-spin" />
                        <p className="text-sm text-gray-600 font-medium">Loading employees...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FiUsers className="h-12 w-12 text-gray-400" />
                        <p className="text-base font-medium text-gray-900">No employees found</p>
                        <p className="text-sm text-gray-500">No employees found in your department.</p>
                        {searchTerm && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => setSearchTerm('')}
                          >
                            Clear search
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="w-[35%] px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center border border-purple-100">
                            <FiUser className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{user.jobTitle || 'No job title'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="w-[18%] px-8 py-4">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                          {formatRoleType(user.role)}
                        </span>
                      </td>
                      <td className="w-[20%] px-6 py-4">
                        <div className="flex items-center">
                          {user.feedbackRating ? (
                            <div className="flex flex-col">
                              <StarRatingDisplay
                                rating={user.feedbackRating}
                                count={user.feedbackCount}
                              />
                              {user.feedbackCount && user.feedbackCount > 0 && user.feedbackRating && (
                                <span className="text-xs text-gray-600 mt-1 font-medium">
                                  {user.feedbackRating.toFixed(1)}/5.0
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">No ratings</span>
                          )}
                        </div>
                      </td>
                      <td className="w-[15%] px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-4 font-semibold rounded-full ${
                          user.profileApproved
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {user.profileApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="w-[12%] px-4 py-4">
                        <div className="flex items-center justify-center space-x-2" data-tour="employee-actions">
                          {/* View Button - Always shown */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => handleViewDetails(user)}
                            title="View Profile"
                          >
                            <FiEye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>

                          {/* Edit Button - Always shown */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 flex items-center justify-center text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors"
                            onClick={() => handleEditUser(user)}
                            title="Edit Profile"
                          >
                            <FiEdit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>

                          {/* Approve/Re-approve Button */}
                          {!user.profileApproved ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                              onClick={() => handleApproveProfile(user, true)}
                              title="Approve Profile"
                            >
                              <FiCheck className="h-4 w-4" />
                              <span className="sr-only">Approve</span>
                            </Button>
                          ) : (
                            // Re-approval button for admin/top management
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 flex items-center justify-center text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors"
                              onClick={() => handleReApproval(user)}
                              title="Submit for Re-approval"
                            >
                              <FiCheckCircle className="h-4 w-4" />
                              <span className="sr-only">Re-approve</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-semibold text-gray-900">{indexOfFirstUser + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.min(indexOfLastUser, filteredUsers.length)}
                      </span>{' '}
                      of <span className="font-semibold text-gray-900">{filteredUsers.length}</span> employees
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium transition-colors ${
                          currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        // Show first page, last page, current page, and pages around current page
                        if (
                          pageNumber === 1 || 
                          pageNumber === totalPages || 
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={index}
                              onClick={() => paginate(pageNumber)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                currentPage === pageNumber
                                  ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        }
                        
                        // Show ellipsis for skipped pages
                        if (
                          (pageNumber === currentPage - 2 && currentPage > 3) ||
                          (pageNumber === currentPage + 2 && currentPage < totalPages - 2)
                        ) {
                          return (
                            <span key={index} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500">
                              ...
                            </span>
                          );
                        }

                        return null;
                      })}

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium transition-colors ${
                          currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="sm:hidden mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-gray-700 border-gray-300"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-gray-900">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-gray-700 border-gray-300"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* View User Modal with Tabs */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="w-full max-w-6xl h-[95vh] p-0 overflow-hidden flex flex-col bg-white">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName || ''}` : 'User Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
          <div className="flex flex-col h-full max-h-[80vh] overflow-hidden bg-white">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white px-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {['Profile', 'Feedback', 'Successor', 'Projects'].map((tab) => {
                  const tabId = tab.toLowerCase();
                  const isActive = activeTab === tabId;
                  return (
                    <button
                      key={tabId}
                      onClick={() => setActiveTab(tabId)}
                      className={`${isActive
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto py-6 px-6 bg-white" style={{ maxHeight: 'calc(95vh - 180px)' }}>
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Name:</span> {selectedUser.firstName} {selectedUser.lastName}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Email:</span> {selectedUser.email}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Phone:</span> {selectedUser.phone || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Role:</span> {displayRole(selectedUser.role)}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Status:</span> {selectedUser.status || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Job Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Information</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Job Title:</span> {selectedUser.jobTitle || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-purple-900">Department:</span> {selectedUser.department || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Reports To:</span> {selectedUser.reportsTo || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Work Mode:</span> {selectedUser.workMode || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Office Location:</span> {selectedUser.officeLocation || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Employment Details</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Salary:</span> {selectedUser.salary || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Total Experience:</span> {selectedUser.totalduration || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Current Role Duration:</span> {selectedUser.currentroleduration || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Industry:</span> {selectedUser.industry || 'N/A'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Profile Approved:</span> {selectedUser.profileApproved ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    {/* Skills & Tools */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills & Tools</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-900">Tools Proficient:</span>
                          <p className="text-gray-700 mt-1">{selectedUser.toolsProficient || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Responsibilities */}
                  {selectedUser.jobResponsibilities && selectedUser.jobResponsibilities.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Responsibilities</h3>
                      <div className="space-y-3">
                        {selectedUser.jobResponsibilities.map((responsibility, index) => (
                          <div key={index} className="bg-white rounded p-3 border">
                            <div className="flex justify-between items-start">
                              <p className="text-gray-700 flex-1">{responsibility.duty}</p>
                              <span className="text-sm font-medium text-purple-600 ml-3">{responsibility.hours}h/week</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approval Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Approval Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedUser.profileApproved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedUser.profileApproved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </div>
                      {selectedUser.profileApprovedAt && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">Approved On:</span>
                          <span className="text-gray-700">{new Date(selectedUser.profileApprovedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedUser.profileApprovedBy && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">Approved By:</span>
                          <span className="text-gray-700">
                            {typeof selectedUser.profileApprovedBy === 'object'
                              ? `${selectedUser.profileApprovedBy.firstName || ''} ${selectedUser.profileApprovedBy.lastName || ''}`.trim() || selectedUser.profileApprovedBy.email
                              : selectedUser.profileApprovedBy
                            }
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Feedback</h3>

                    {/* Feedback Metrics */}
                    {selectedUser?.feedbackMetrics && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Feedback Given */}
                        <div className="bg-white shadow-sm rounded-lg p-4 border">
                          <h4 className="text-md font-medium mb-2 text-gray-900">Feedback Given</h4>
                          {selectedUser.feedbackMetrics?.given ? (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Count:</span>
                                <span className="font-medium text-gray-900">{selectedUser.feedbackMetrics.given.count || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Average Rating:</span>
                                <span className="font-medium text-gray-900">{(selectedUser.feedbackMetrics.given.averageRating || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No feedback given data available</p>
                          )}
                        </div>

                        {/* Feedback Received */}
                        <div className="bg-white shadow-sm rounded-lg p-4 border">
                          <h4 className="text-md font-medium mb-2 text-gray-900">Feedback Received</h4>
                          {selectedUser.feedbackMetrics?.received ? (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Count:</span>
                                <span className="font-medium text-gray-900">{selectedUser.feedbackMetrics.received.count || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Average Rating:</span>
                                <span className="font-medium text-gray-900">{(selectedUser.feedbackMetrics.received.averageRating || 0).toFixed(2)}</span>
                              </div>
                              {selectedUser.feedbackMetrics.received.weightedAverageRating !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Weighted Average:</span>
                                  <span className="font-medium text-gray-900">{(selectedUser.feedbackMetrics.received.weightedAverageRating || 0).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No feedback received data available</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills Feedback */}
                    {isLoadingSkills ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading skills...</span>
                      </div>
                    ) : (skillsFeedback.received.length > 0 || skillsFeedback.given.length > 0) ? (
                      <div className="bg-white rounded-lg p-4 border">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Skills Feedback</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2 text-gray-900">Skills Mentioned (Received)</h5>
                            <div className="flex flex-wrap gap-2">
                              {skillsFeedback.received.map((skill, index) => (
                                <span key={index} className="px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {skillsFeedback.given.map((skill, index) => (
                                <span key={index} className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-600">No feedback data available yet.</p>
                        <p className="text-xs text-gray-500 mt-1">Feedback information will appear here when available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'successor' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Successor Information</h3>
                    {isLoadingSuccessors ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading successors...</span>
                      </div>
                    ) : successors && successors.length > 0 ? (
                      <div className="space-y-3">
                        {successors.map((successor: any, index: number) => {
                          const name = successor.candidate_name || successor.name || 'Unknown';
                          const email = successor.candidate_email || successor.email || 'No email';
                          const score = successor.successor_score !== undefined
                            ? (successor.successor_score * 100).toFixed(0) + '%'
                            : 'N/A';

                          return (
                            <div key={index} className="bg-white rounded p-4 border">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{name}</h4>
                                <span className="text-sm font-medium text-purple-600">{score} match</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{email}</p>
                              {successor.explanation && (
                                <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-2">{successor.explanation}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedUser?.successor ? (
                      <div className="bg-white rounded p-4 border">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Successor:</span> {
                            typeof selectedUser.successor === 'object'
                              ? selectedUser.successor.name || 'Unknown'
                              : selectedUser.successor
                          }
                          {typeof selectedUser.successor === 'object' && selectedUser.successor.title && ` - ${selectedUser.successor.title}`}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-600">No successor information available.</p>
                        <p className="text-xs text-gray-500 mt-1">Succession planning data will appear here when available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Projects</h3>
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading projects...</span>
                      </div>
                    ) : projects && projects.length > 0 ? (
                      <div className="space-y-3">
                        {projects.map((project: any, index: number) => (
                          <div key={project.project_id || index} className="bg-white rounded p-4 border">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">{project.project_title || 'Unnamed Project'}</h4>
                              {project.project_status && (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  project.project_status === 'Active' ? 'bg-green-100 text-green-800' :
                                  project.project_status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {project.project_status}
                                </span>
                              )}
                            </div>
                            {project.hours_per_week && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Hours per week:</span> {project.hours_per_week}
                              </p>
                            )}
                            {project.project_description && (
                              <p className="text-sm text-gray-600">{project.project_description}</p>
                            )}
                            {project.user_contribution && (
                              <div className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2">
                                <span className="font-medium">Contribution:</span> {JSON.stringify(project.user_contribution)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-600">No projects assigned.</p>
                        <p className="text-xs text-gray-500 mt-1">Project information will appear here when available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setViewModalOpen(false)}
                className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Close
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-full max-w-6xl h-[95vh] p-0 overflow-hidden flex flex-col bg-white">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900">Edit Employee Profile</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditModalOpen(false)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <FiX className="h-5 w-5" />
            </Button>
          </div>
          
          {selectedUser && (
            <Form {...jobProfileForm}>
              <form onSubmit={jobProfileForm.handleSubmit(handleSaveUser)} className="flex flex-col h-full bg-white">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white" style={{ maxHeight: 'calc(95vh - 140px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={jobProfileForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-900">Department *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={jobProfileForm.control}
                    name="reportsTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reports To</FormLabel>
                        <FormControl>
                          <Input placeholder="Manager's email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., $75,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="workMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select work mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workModeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="officeLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select office location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {officeLocationOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {industryOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="totalduration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Experience</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 5 years" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jobProfileForm.control}
                    name="currentroleduration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Role Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2 years" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={jobProfileForm.control}
                  name="toolsProficient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tools & Technologies</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List tools, technologies, and skills (comma-separated)"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Job Responsibilities */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Job Responsibilities *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendDuty({ duty: "", hours: 0 })}
                    >
                      Add Responsibility
                    </Button>
                  </div>
                  
                  {dutyFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-end">
                      <FormField
                        control={jobProfileForm.control}
                        name={`jobResponsibilities.${index}.duty`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Responsibility {index + 1}</FormLabel>
                            <FormControl>
                              <Input placeholder="Describe the responsibility" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={jobProfileForm.control}
                        name={`jobResponsibilities.${index}.hours`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormLabel>Hours/Week</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {dutyFields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDuty(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditModalOpen(false)}
                      className="min-w-[100px] px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="min-w-[120px] px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDetailsModalOpen(false)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <FiX className="h-4 w-4" />
            </Button>
          </div>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900">Employee Details</DialogTitle>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-white">
              <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
              <p className="text-gray-700 font-medium">Loading employee details...</p>
            </div>
          ) : userDetails ? (
            <Tabs defaultValue="feedback" className="w-full flex flex-col h-full bg-white">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg mx-6 mb-4">
                <TabsTrigger value="feedback" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-gray-700 data-[state=active]:text-gray-900">
                  <FiInfo className="mr-2 h-4 w-4" />
                  <span>Feedback & Ratings</span>
                </TabsTrigger>
                <TabsTrigger value="successors" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-gray-700 data-[state=active]:text-gray-900">
                  <FiUsers className="mr-2 h-4 w-4" />
                  <span>Potential Successors</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="feedback" className="flex-1 overflow-y-auto space-y-4 px-6 pb-6 bg-white">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Feedback Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Feedback Received</p>
                        <p className="text-2xl font-bold text-gray-900">{userDetails.feedback.totalFeedbacks}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Rating</p>
                        <div className="flex items-center space-x-2">
                          <StarRatingDisplay rating={userDetails.feedback.averageRating} />
                          <span className="text-lg font-semibold text-gray-900">
                            {userDetails.feedback.averageRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {userDetails.feedback.recentFeedback.length > 0 && (
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Recent Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {userDetails.feedback.recentFeedback.map((feedback, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4 bg-gray-50 rounded-r p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">From: {feedback.evaluatorEmail}</p>
                                <p className="text-sm text-gray-600">Quarter: {feedback.quarter}</p>
                                <p className="text-sm text-gray-600">Relationship: {feedback.relationshipType}</p>
                              </div>
                            </div>
                            {feedback.topSkills && (
                              <p className="mt-2 text-sm text-gray-700">{feedback.topSkills}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {userDetails.skillsFeedback && (userDetails.skillsFeedback.received.length > 0 || userDetails.skillsFeedback.given.length > 0) && (
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Skills Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2 text-gray-900">Skills Mentioned (Received)</h4>
                          <div className="flex flex-wrap gap-2">
                            {userDetails.skillsFeedback.received.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2 text-gray-900">Skills Mentioned (Given to Others)</h4>
                          <div className="flex flex-wrap gap-2">
                            {userDetails.skillsFeedback.given.map((skill, index) => (
                              <Badge key={index} variant="outline" className="border-gray-300 text-gray-700">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="successors" className="flex-1 overflow-y-auto space-y-4 px-6 pb-6 bg-white">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Successor Readiness</h3>
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Potential Successors</CardTitle>
                      <CardDescription className="text-gray-600">
                        People identified as potential successors for {selectedUser?.firstName} {selectedUser?.lastName}'s role
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userDetails.successors.successors.length > 0 ? (
                        <div className="space-y-4 py-2">
                          {userDetails.successors.successors?.map((successor, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <FiUser className="h-5 w-5 text-gray-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{successor.name}</h4>
                                    <p className="text-sm text-gray-600">{successor.email}</p>
                                    <p className="text-sm text-gray-600">{successor.jobTitle}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Match Score:</span>
                                    <span className="font-bold text-lg">{successor.score}%</span>
                                  </div>
                                  <Badge variant={successor.isViable ? "default" : "secondary"}>
                                    {successor.isViable ? "Viable" : "Needs Development"}
                                  </Badge>
                                </div>
                              </div>
                              
                              {successor.explanation && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-700">{successor.explanation}</p>
                                </div>
                              )}
                              
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                {(successor.strengths?.length > 0 || successor.developmentAreas?.length > 0) && (
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {successor.strengths?.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-green-700 mb-1">Strengths</h5>
                                      <ul className="text-sm text-gray-600 list-disc list-inside">
                                        {successor.strengths.map((strength, i) => (
                                          <li key={i}>{strength}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {successor.developmentAreas?.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-orange-700 mb-1">Development Areas</h5>
                                      <ul className="text-sm text-gray-600 list-disc list-inside">
                                        {successor.developmentAreas.map((area, i) => (
                                          <li key={i}>{area}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 px-4">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                            <FiUsers className="h-6 w-6 text-gray-400" />
                          </div>
                          <h3 className="text-gray-900 text-sm font-medium">No potential successors</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            No potential successors have been identified for this role yet.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-16 bg-white">
              <p className="text-gray-700 font-medium">Failed to load user details.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DepartmentManagementTourLauncher />
    </div>
  );
}