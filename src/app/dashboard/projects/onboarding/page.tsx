'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Minus, ArrowRight, ArrowLeft, Check, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { addNewProject } from "../api";
import ProjectAIRecommendations from '@/components/ProjectAIRecommendations';

// Flowing wave background - same as onboarding page
const WaveBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.02)" />
            <stop offset="50%" stopColor="rgba(236, 72, 153, 0.015)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.01)" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.015)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.01)" />
            <stop offset="100%" stopColor="rgba(236, 72, 153, 0.008)" />
          </linearGradient>
        </defs>
        
        {/* Wave 1 */}
        <motion.path
          d="M0,400 Q300,320 600,400 T1200,400 L1200,800 L0,800 Z"
          fill="url(#waveGrad1)"
          animate={{
            d: [
              "M0,400 Q300,320 600,400 T1200,400 L1200,800 L0,800 Z",
              "M0,440 Q300,360 600,440 T1200,440 L1200,800 L0,800 Z",
              "M0,400 Q300,320 600,400 T1200,400 L1200,800 L0,800 Z"
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Wave 2 */}
        <motion.path
          d="M0,450 Q400,370 800,450 T1200,450 L1200,800 L0,800 Z"
          fill="url(#waveGrad2)"
          animate={{
            d: [
              "M0,450 Q400,370 800,450 T1200,450 L1200,800 L0,800 Z",
              "M0,490 Q400,410 800,490 T1200,490 L1200,800 L0,800 Z",
              "M0,450 Q400,370 800,450 T1200,450 L1200,800 L0,800 Z"
            ]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        
        {/* Wave 3 */}
        <motion.path
          d="M0,500 Q200,420 400,500 T800,500 T1200,500 L1200,800 L0,800 Z"
          fill="url(#waveGrad1)"
          animate={{
            d: [
              "M0,500 Q200,420 400,500 T800,500 T1200,500 L1200,800 L0,800 Z",
              "M0,540 Q200,460 400,540 T800,540 T1200,540 L1200,800 L0,800 Z",
              "M0,500 Q200,420 400,500 T800,500 T1200,500 L1200,800 L0,800 Z"
            ]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
      </svg>
    </div>
  );
};

// Welcome sequence component
const WelcomeSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHeading, setShowHeading] = useState(false);
  const [showSubheading, setShowSubheading] = useState(false);
  
  useEffect(() => {
    const timer1 = setTimeout(() => setShowHeading(true), 1000);
    const timer2 = setTimeout(() => setShowSubheading(true), 2000);
    const timer3 = setTimeout(() => {
      setShowWelcome(false);
      onComplete();
    }, 4000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);
  
  if (!showWelcome) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-90 backdrop-blur-sm">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showHeading ? 1 : 0, y: showHeading ? 0 : 20 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl font-light text-gray-900 mb-4">Welcome to Project Creation</h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showSubheading ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xl text-gray-600 font-light">Let's create your project step by step</p>
        </motion.div>
      </div>
    </div>
  );
};

// Almost there transition
const AlmostThereTransition = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-90 backdrop-blur-sm">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
            <Briefcase className="w-10 h-10 text-purple-600" />
          </div>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-3xl font-light text-gray-900 mb-3"
        >
          Almost There!
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-lg text-gray-600 font-light"
        >
          Finalizing your project details...
        </motion.p>
      </div>
    </div>
  );
};



const statusOptions = [
  { label: "Planning", value: "planning" },
  { label: "In Progress", value: "in-progress" },
  { label: "On Hold", value: "on-hold" },
  { label: "Completed", value: "completed" }
];

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" }
];

// This page uses a custom layout that hides the sidebar
const ProjectOnboardingPage = () => {
  // Hide sidebar for this page
  useEffect(() => {
    document.body.classList.add('no-sidebar');
    return () => {
      document.body.classList.remove('no-sidebar');
    };
  }, []);
  
  // Add full screen container styles
  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
    backgroundColor: 'white',
    zIndex: 40
  };
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAlmostThere, setShowAlmostThere] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localCompanyCode, setLocalCompanyCode] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectSearchResults, setProjectSearchResults] = useState<any[]>([]);
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    priority: 'medium',
    total_budget: '',
    toolsUsed: '',
    employees: [] as any[],
    viewers: [] as { name: string; email: string }[],
    visibleToAll: true,
    linkedProjects: [] as any[],
  });

  // Employee search states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  // Viewer search states
  const [viewerSearchTerm, setViewerSearchTerm] = useState('');
  const [viewerSearchResults, setViewerSearchResults] = useState<any[]>([]);
  const [showViewerSearch, setShowViewerSearch] = useState(false);

  useEffect(() => {
    // Fetch all users for search functionality
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          return;
        }
        
        const response = await fetch('/api/admin/users?limit=0', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched users count:', data.users?.length || 0);
          setAllUsers(data.users || []);
        } else {
          console.error('Failed to fetch users:', response.status);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
    
    // Fetch projects for linked projects functionality
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched projects count:', data.length);
          setAllProjects(data);
        } else {
          console.error('Failed to fetch projects:', response.status);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
    fetchProjects();
    
    // Fetch current user and company code
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          setLocalCompanyCode(userData.companyCode || null);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Handle employee search input change
  const handleEmployeeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setEmployeeSearchTerm(term);
    searchEmployees(term);
  };
  
  // Handle viewer search input change
  const handleViewerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setViewerSearchTerm(term);
    searchViewers(term);
  };
  
  // Handle project search input change
  const handleProjectSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setProjectSearchTerm(term);
    await searchProjects(term);
  };
  
  // Handle key press for manual add
  const handleEmployeeKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // ...
      e.preventDefault();
      const email = employeeSearchTerm.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (email && emailRegex.test(email)) {
        // First, check if the email is already in the results
        const emailExists = employeeSearchResults.some(
          e => e.email.toLowerCase() === email.toLowerCase()
        );
        
        if (!emailExists) {
          addEmployeeFromSearch({
            _id: `manual-${Date.now()}`,
            id: `manual-${Date.now()}`,
            email: email,
            name: email.split('@')[0],
            firstName: email.split('@')[0],
            lastName: '',
            role: '',
            department: '',
            jobTitle: '',
            isManualEntry: true
          });
          setEmployeeSearchTerm('');
          setEmployeeSearchResults([]);
        } else {
          toast.error('This email is already in the search results');
        }
      } else if (email) {
        toast.error('Please enter a valid email address');
      }
    }
  };

  const handleViewerKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const email = viewerSearchTerm.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (email && emailRegex.test(email)) {
        // First, check if the email is already in the results
        const emailExists = viewerSearchResults.some(
          v => v.email.toLowerCase() === email.toLowerCase()
        );
        
        if (!emailExists) {
          addViewerFromSearch({
            _id: `manual-${Date.now()}`,
            id: `manual-${Date.now()}`,
            email: email,
            name: email.split('@')[0],
            firstName: email.split('@')[0],
            lastName: '',
            role: '',
            department: '',
            jobTitle: '',
            isManualEntry: true
          });
          setViewerSearchTerm('');
          setViewerSearchResults([]);
        } else {
          toast.error('This email is already in the search results');
        }
      } else if (email) {
        toast.error('Please enter a valid email address');
      }
    }
  };

  // Project search functionality
  const searchProjects = async (term: string) => {
    if (!term.trim()) {
      setProjectSearchResults([]);
      return;
    }

    console.log('Searching for projects with term:', term);
    
    try {
      // Call the projects search API endpoint
      const response = await fetch(`/api/projects/search?term=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project search results');
      }
      
      const results = await response.json();
      console.log('Project search API results:', results);
      
      // Handle different response formats
      const projectsArray = results.projects || results || [];
      
      if (!Array.isArray(projectsArray)) {
        console.error('Expected array but got:', typeof projectsArray, projectsArray);
        setProjectSearchResults([]);
        return;
      }
      
      const formattedResults = projectsArray.map((project: any) => ({
        _id: project._id,
        id: project._id,
        name: project.project_title || project.name || 'Unnamed Project',
        description: project.project_description || project.description || '',
        department: project.department || '',
        startDate: project.start_date || project.startDate,
        endDate: project.end_date || project.endDate,
        status: project.status || 'Active'
      }));
      
      setProjectSearchResults(formattedResults);
      
    } catch (error) {
      console.error('Error searching projects:', error);
      toast.error('Failed to search for projects. Please try again.');
      setProjectSearchResults([]);
    }
  };
  
  const addLinkedProject = (project: any) => {
    // Check if project is already linked
    if (projectData.linkedProjects.some(p => p._id === project._id)) {
      toast.error('Project is already linked');
      return;
    }
    
    setProjectData(prev => ({
      ...prev,
      linkedProjects: [...prev.linkedProjects, project]
    }));
    
    toast.success(`Linked project: ${project.name}`);
  };
  
  const removeLinkedProject = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      linkedProjects: prev.linkedProjects.filter((_, i) => i !== index)
    }));
  };
  
  // Handle manual add for employees
  const handleAddManualEmployee = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Check if already added
    if (projectData.employees.some(e => e.email.toLowerCase() === email.toLowerCase())) {
      toast.error('This email is already added as a team member');
      return;
    }
    
    addEmployeeFromSearch({
      _id: email,
      id: email,
      email: email,
      name: email.split('@')[0],
      isManualEntry: true
    });
    
    setEmployeeSearchTerm('');
    setEmployeeSearchResults([]);
  };

  // Handle manual add for viewers
  const handleAddManualViewer = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Check if already added
    if (projectData.viewers.some(v => v.email.toLowerCase() === email.toLowerCase())) {
      toast.error('This email is already added as a viewer');
      return;
    }
    
    addViewerFromSearch({
      _id: email,
      id: email,
      email: email,
      name: email.split('@')[0],
      isManualEntry: true
    });
    
    setViewerSearchTerm('');
    setViewerSearchResults([]);
  };

  // Search function for employees using client-side filtering
  const searchEmployees = (term: string) => {
    if (!term.trim()) {
      setEmployeeSearchResults([]);
      return;
    }

    console.log('Searching employees for:', term);
    
    // Filter users based on search term
    const filteredUsers = allUsers.filter(user => {
      const searchTerm = term.toLowerCase();
      const matchesSearch = 
        user.email?.toLowerCase().includes(searchTerm) ||
        user.name?.toLowerCase().includes(searchTerm) ||
        user.firstName?.toLowerCase().includes(searchTerm) ||
        user.lastName?.toLowerCase().includes(searchTerm) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm);
      
      // Filter out already assigned employees
      const currentAssignedEmails = projectData.employees.map(e => e.email);
      
      return matchesSearch && !currentAssignedEmails.includes(user.email);
    });
    
    const formattedResults = filteredUsers.map((user: any) => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || '',
      department: user.department || '',
      jobTitle: user.jobTitle || ''
    }));
    
    // For manual email entry (if it looks like an email and not already in results)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(term)) {
      const emailExists = formattedResults.some((user: any) => 
        user.email.toLowerCase() === term.toLowerCase()
      );
      
      if (!emailExists) {
        formattedResults.unshift({
          _id: `manual-${Date.now()}`,
          id: `manual-${Date.now()}`,
          email: term,
          name: term.split('@')[0],
          firstName: term.split('@')[0],
          lastName: '',
          role: '',
          department: '',
          jobTitle: '',
          isManualEntry: true
        } as any);
      }
    }
    
    console.log('Employee search results count:', formattedResults.length);
    setEmployeeSearchResults(formattedResults);
  };

  // Search function for viewers using client-side filtering
  const searchViewers = (term: string) => {
    if (!term.trim()) {
      setViewerSearchResults([]);
      return;
    }

    console.log('Searching viewers for:', term);
    
    // Filter users based on search term
    const filteredUsers = allUsers.filter(user => {
      const searchTerm = term.toLowerCase();
      const matchesSearch = 
        user.email?.toLowerCase().includes(searchTerm) ||
        user.name?.toLowerCase().includes(searchTerm) ||
        user.firstName?.toLowerCase().includes(searchTerm) ||
        user.lastName?.toLowerCase().includes(searchTerm) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm);
      
      // Filter out already assigned viewers
      const currentAssignedEmails = projectData.viewers.map(v => v.email);
      
      return matchesSearch && !currentAssignedEmails.includes(user.email);
    });
    
    const formattedResults = filteredUsers.map((user: any) => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || '',
      department: user.department || '',
      jobTitle: user.jobTitle || ''
    }));
    
    // For manual email entry (if it looks like an email and not already in results)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(term)) {
      const emailExists = formattedResults.some((user: any) => 
        user.email.toLowerCase() === term.toLowerCase()
      );
      
      if (!emailExists) {
        formattedResults.unshift({
          _id: `manual-${Date.now()}`,
          id: `manual-${Date.now()}`,
          email: term,
          name: term.split('@')[0],
          firstName: term.split('@')[0],
          lastName: '',
          role: '',
          department: '',
          jobTitle: '',
          isManualEntry: true
        } as any);
      }
    }
    
    console.log('Viewer search results count:', formattedResults.length);
    setViewerSearchResults(formattedResults);
  };

  const addEmployeeFromSearch = (employee: any) => {
    if (projectData.employees.some(emp => emp.email === employee.email)) {
      toast.error('User already added as team member');
      return;
    }

    setProjectData(prev => ({
      ...prev,
      employees: [...prev.employees, {
        name: employee.name || `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
        department: employee.department || '',
        role: employee.role || 'Team Member',
        tasks: '',
        hours: '',
        toolsUsed: '',
        addedBy: currentUser?.name || currentUser?.email || 'Current User'
      }]
    }));

    toast.success(`${employee.name || employee.email} added as team member`);
  };

  const addViewerFromSearch = (viewer: any) => {
    if (projectData.viewers.some(v => v.email === viewer.email)) {
      toast.error('User already added as viewer');
      return;
    }

    setProjectData(prev => ({
      ...prev,
      viewers: [...prev.viewers, {
        name: viewer.name || `${viewer.firstName} ${viewer.lastName}`.trim(),
        email: viewer.email,
        addedBy: currentUser?.name || currentUser?.email || 'Current User'
      }]
    }));

    toast.success(`${viewer.name || viewer.email} added as viewer`);
  };

  const removeEmployee = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
  };

  const removeViewer = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      viewers: prev.viewers.filter((_, i) => i !== index)
    }));
  };

  const updateFormData = (field: string, value: any) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const saveBasicInfo = async () => {
    if (!projectData.name) {
      toast.error('Project name is required');
      return false;
    }
    
    // No API call needed here, just validate and proceed
    return true;
  };

  const saveProjectDetails = async () => {
    if (!projectData.department) {
      toast.error('Department is required');
      return false;
    }
    
    if (!projectData.startDate) {
      toast.error('Start date is required');
      return false;
    }
    
    // No API call needed here, just validate and proceed
    return true;
  };

  const handleNext = async () => {
    setIsLoading(true);
    
    try {
      let canProceed = false;
      
      if (currentStep === 1) {
        canProceed = await saveBasicInfo();
      } else if (currentStep === 2) {
        canProceed = await saveProjectDetails();
      } else {
        canProceed = true;
      }
      
      if (canProceed) {
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleAlmostThereComplete = () => {
    setShowAlmostThere(false);
    setCurrentStep(4);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Add creator info to project data
      const projectToSubmit = {
        ...projectData,
        creatorEmail: currentUser?.email,
        creatorName: currentUser?.name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        creatorRole: currentUser?.role,
        companyCode: currentUser?.companyCode || currentUser?.company_code
      };
      
      console.log('Submitting project data:', projectToSubmit);
      
      // Use the same API as the regular project creation
      const result = await addNewProject(projectToSubmit);
      
      if (result.success) {
        toast.success('Project created successfully!');
        
        // Redirect to the project detail page
        if (result.projectId) {
          router.push(`/dashboard/projects/${result.projectId}`);
        } else {
          router.push('/dashboard/projects');
        }
      } else {
        toast.error(result.error || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (isLoading) return false;
    
    switch (currentStep) {
      case 1:
        return !!projectData.name;
      case 2:
        return !!projectData.department && !!projectData.startDate;
      case 3:
        return true; // Team members (optional)
      case 4:
        return true; // Viewers (optional)
      case 5:
        return true; // Linked projects (optional)
      case 6:
        return true; // Tools & technologies (optional)
      default:
        return true;
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="mt-16 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900">Basic Project Information</h2>
              <p className="text-gray-600 font-light mt-2">Start by defining your project's core details. Give it a clear name that reflects its purpose, and describe what you're trying to achieve. This helps team members understand the project's scope and objectives.</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Enter project name"
                    value={projectData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the project's purpose and goals"
                    value={projectData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="mt-32 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900">Project Details</h2>
              <p className="text-gray-600 font-light mt-2">Define your project's timeline and organizational details. Choose the department that will own this project, set realistic start and end dates, and assign priority and status levels that reflect the project's importance and current state.</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                  <Input
                    id="department"
                    placeholder="Enter department name"
                    value={projectData.department}
                    onChange={(e) => updateFormData('department', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={projectData.startDate}
                      onChange={(e) => updateFormData('startDate', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={projectData.endDate}
                      onChange={(e) => updateFormData('endDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
                    <Select
                      value={projectData.status}
                      onValueChange={(value) => updateFormData('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
                    <Select
                      value={projectData.priority}
                      onValueChange={(value) => updateFormData('priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="Enter budget amount"
                    value={projectData.total_budget}
                    onChange={(e) => updateFormData('total_budget', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="mt-32 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900">Team Members</h2>
              <p className="text-gray-600 font-light mt-2">Add team members who will actively work on this project. Team members can edit project details, update progress, and collaborate on tasks. Search by name or email, or manually add new members.</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Team Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Team Members</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmployeeSearch(!showEmployeeSearch)}
                    >
                      Search Users
                    </Button>
                    {localCompanyCode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAIRecommendations(!showAIRecommendations)}
                      >
                        AI Recommendations
                      </Button>
                    )}
                  </div>
                </div>

                {showEmployeeSearch && (
                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="space-y-2">
                      <Input
                        placeholder="Search by name or email..."
                        value={employeeSearchTerm}
                        onChange={handleEmployeeSearchChange}
                        onKeyPress={handleEmployeeKeyPress}
                      />
                      
                      {isLoadingUsers && (
                        <div className="text-center py-2 text-gray-500">Loading users...</div>
                      )}
                      
                            {isLoadingUsers ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          <span className="inline-block animate-spin mr-2">⏳</span> Loading users...
                        </div>
                      ) : (viewerSearchTerm && viewerSearchResults.length === 0) ? (
                        <div className="p-3 text-sm text-gray-500">
                          No matching users found. Press Enter to add "{viewerSearchTerm}" as a viewer.
                        </div>
                      ) : viewerSearchResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                          {employeeSearchResults.map((employee, index) => (
                            <div
                              key={employee.id || index}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                addEmployeeFromSearch(employee);
                                setShowEmployeeSearch(false);
                                setEmployeeSearchTerm('');
                                setEmployeeSearchResults([]);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {employee.name || employee.email}
                                    {employee.isManualEntry && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Manual Entry</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">{employee.email}</div>
                                  {employee.department && (
                                    <div className="text-xs text-gray-500">{employee.department} • {employee.role}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {showAIRecommendations && localCompanyCode && (
                  <div className="border rounded-md p-4 bg-purple-50 border-purple-200">
                    <div className="mb-3 text-sm text-gray-700">
                      <p className="font-medium">AI Recommendations</p>
                      <p>Based on your project details, we'll suggest team members with relevant skills.</p>
                    </div>
                    <ProjectAIRecommendations
                      projectData={projectData}
                      onApplyRecommendations={({ employees, tools }) => {
                        if (employees && employees.length > 0) {
                          setProjectData(prev => ({
                            ...prev,
                            employees: [...prev.employees, ...employees],
                            toolsUsed: Array.isArray(tools) ? tools.join(', ') : prev.toolsUsed
                          }));
                          toast.success(`Added ${employees.length} recommended team members!`);
                        } else {
                          toast.error('No recommendations available');
                        }
                      }}
                      companyCode={localCompanyCode}
                    />
                  </div>
                )}

                {/* Display added employees */}
                {projectData.employees.length > 0 && (
                  <div className="space-y-2">
                    {projectData.employees.map((employee, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.email}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmployee(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="mt-32 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900">Project Viewers</h2>
              <p className="text-gray-600 font-light mt-2">Add viewers who need read-only access to this project. Viewers can see project details and progress but cannot edit or contribute. This is perfect for stakeholders, managers, or other interested parties.</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Viewers Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Project Viewers</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowViewerSearch(!showViewerSearch)}
                  >
                    Search Users
                  </Button>
                </div>

                {showViewerSearch && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search by name or email..."
                      value={viewerSearchTerm}
                      onChange={handleViewerSearchChange}
                      onKeyPress={handleViewerKeyPress}
                    />
                    
                    {isLoadingUsers ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        <span className="inline-block animate-spin mr-2">⏳</span> Loading users...
                      </div>
                    ) : viewerSearchResults.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {viewerSearchResults.map((viewer, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addViewerFromSearch(viewer);
                              setViewerSearchTerm('');
                              setViewerSearchResults([]);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{viewer.name}</div>
                                <div className="text-xs text-gray-500">
                                  {viewer.email} • {viewer.role || 'No role'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (viewerSearchTerm && viewerSearchResults.length === 0) ? (
                      <div className="p-3 text-sm text-gray-500">
                        No matching users found. Press Enter to add "{viewerSearchTerm}" as a viewer.
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Display assigned viewers */}
                {projectData.viewers.length > 0 && (
                  <div className="space-y-2">
                    {projectData.viewers.map((viewer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                        <div>
                          <div className="font-medium">{viewer.name}</div>
                          <div className="text-xs text-gray-600">{viewer.email}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeViewer(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="mt-32 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900">Linked Projects</h2>
              <p className="text-gray-600 font-light mt-2">Connect this project to other related projects in your organization. This helps track dependencies and see how projects work together to achieve larger goals.</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Linked Projects Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Linked Projects</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProjectSearch(!showProjectSearch)}
                  >
                    Search Projects
                  </Button>
                </div>

                {showProjectSearch && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={handleProjectSearchChange}
                    />
                    
                    {projectSearchResults.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {projectSearchResults.map((project, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addLinkedProject(project);
                              setProjectSearchTerm('');
                              setProjectSearchResults([]);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{project.name}</div>
                                <div className="text-xs text-gray-500">
                                  {project.department} • {project.status}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : projectSearchTerm ? (
                      <div className="p-3 text-sm text-gray-500">
                        No matching projects found.
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Display linked projects */}
                {projectData.linkedProjects.length > 0 && (
                  <div className="space-y-2">
                    {projectData.linkedProjects.map((project, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-md">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-gray-600">{project.department} • {project.status}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLinkedProject(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="mt-32 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900">Tools & Technologies</h2>
              <p className="text-gray-600 font-light mt-2">Specify the tools, technologies, and platforms your team will use for this project. This helps team members understand the technical requirements and ensures everyone has the right resources.</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="toolsUsed">Tools & Technologies</Label>
                  <Input
                    id="toolsUsed"
                    placeholder="Enter tools separated by commas (e.g., Figma, React, AWS)"
                    value={projectData.toolsUsed}
                    onChange={(e) => updateFormData('toolsUsed', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Examples: Design tools (Figma, Sketch), Development (React, Python), Cloud (AWS, Azure)
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 7:
        return (
          <div className="mt-16 mb-8 max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">Ready to Create Project</h2>
              <p className="text-gray-600 font-light mb-6">Review your project details below and click 'Create Project' to get started. Your team will be notified and can begin collaborating immediately.</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2 text-center">Project Summary</h3>
                <div className="space-y-2 mt-4">
                  <div>
                    <span className="text-sm text-gray-500">Project Name:</span>
                    <p className="font-medium">{projectData.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Department:</span>
                    <p>{projectData.department}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Timeline:</span>
                    <p>{projectData.startDate} to {projectData.endDate || 'TBD'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Team Size:</span>
                    <p>{projectData.employees.length || 0} members</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <Button 
                onClick={handleComplete}
                disabled={isLoading}
                className="w-48 bg-purple-600 hover:bg-purple-700 text-white py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflowY: 'auto',
      backgroundColor: 'white',
      zIndex: 40
    }}>
      <WaveBackground />
      
      <AnimatePresence>
        {showWelcome && (
          <WelcomeSequence 
            onComplete={() => setShowWelcome(false)}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showAlmostThere && (
          <AlmostThereTransition onComplete={handleAlmostThereComplete} />
        )}
      </AnimatePresence>
      
      {!showWelcome && !showAlmostThere && (
        <div className="min-h-screen bg-transparent relative z-10">
          <div className="px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-8"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    {getStepContent()}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-end gap-6 mt-12">
                  {currentStep > 1 && currentStep < 7 && (
                    <button
                      onClick={handleBack}
                      disabled={isLoading}
                      className="text-black hover:text-gray-700 font-medium flex items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </button>
                  )}
                  
                  {currentStep < 7 ? (
                    <button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="text-purple-600 hover:text-purple-700 font-medium flex items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <button
                      onClick={handleComplete}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-md flex items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creating...' : 'Create Project'}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectOnboardingPage;
