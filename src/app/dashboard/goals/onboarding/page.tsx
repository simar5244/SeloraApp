'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { addNewGoal } from '../api';

// Flowing wave background - same as project onboarding page
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
  
  return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showHeading ? 1 : 0, y: showHeading ? 0 : 20 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl font-light text-gray-900 mb-4">Welcome to Goal Creation</h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showSubheading ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xl text-gray-600 font-light">Let's create your company's goal step by step</p>
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
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-20"
    >
      <div className="text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-24 h-24 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center"
        >
          ✓
        </motion.div>
        
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="text-3xl font-bold text-gray-900"
        >
          Almost there!
        </motion.h2>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="text-lg text-gray-600"
        >
          Preparing your goal for creation...
        </motion.p>
      </div>
    </motion.div>
  );
};

const statusOptions = [
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "On Hold", value: "on-hold" },
  { label: "Completed", value: "completed" },
  { label: "Canceled", value: "canceled" }
];

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" }
];

// Main Goal Onboarding Page Component
const GoalOnboardingPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAlmostThere, setShowAlmostThere] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Goal form data
  const [goalData, setGoalData] = useState({
    title: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    status: 'planning',
    visibleToAll: false,
    kpis: [] as any[],
    assignedProjects: [] as any[],
    assignedEmployees: [] as any[],
    viewers: [] as any[]
  });

  // Search states
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [viewerSearchTerm, setViewerSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [viewerSearchResults, setViewerSearchResults] = useState<any[]>([]);
  const [projectSearchResults, setProjectSearchResults] = useState<any[]>([]);
  const [manualEmployeeEmail, setManualEmployeeEmail] = useState('');
  const [manualViewerEmail, setManualViewerEmail] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: 0,
    status: 'planning',
    priority: 'medium'
  });

  useEffect(() => {
    // Check permissions on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const userRole = user.role || '';
        const canCreate = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(userRole);
        
        if (!canCreate) {
          toast.error('You do not have permission to create goals');
          router.push('/dashboard/goals');
          return;
        }
        
        setCurrentUser(user);
        setHasPermission(true);
        fetchUsers();
        fetchProjects();
      } catch (e) {
        console.error('Failed to parse user data:', e);
        toast.error('Authentication error');
        router.push('/dashboard/goals');
        return;
      }
    } else {
      toast.error('User not found');
      router.push('/dashboard/goals');
      return;
    }
  }, [router]);

  // Load all users for client-side search (following AddGoalModal pattern)
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/admin/users?limit=0', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData.users || []);
      } else {
        console.error('Failed to fetch users:', response.status);
        // Fallback to empty array if loading fails
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  // Fetch projects for assigned projects functionality
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/projects?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const projectData = await response.json();
        setProjects(projectData.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Search users function - client-side filtering like AddGoalModal
  const searchUsers = (term: string, isViewerSearch = false) => {
    if (!term || term.length < 2) {
      if (isViewerSearch) {
        setViewerSearchResults([]);
      } else {
        setEmployeeSearchResults([]);
      }
      return;
    }

    // Filter users client-side for instant results
    const filteredUsers = users.filter(user => {
      const matchesSearch =
        user.username?.toLowerCase().includes(term.toLowerCase()) ||
        user.email?.toLowerCase().includes(term.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(term.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(term.toLowerCase())) ||
        (user.name && user.name.toLowerCase().includes(term.toLowerCase()));

      if (!matchesSearch) return false;

      const existingEmployees = goalData.assignedEmployees.map(e => e.email);
      const existingViewers = goalData.viewers.map(v => v.email);
      
      if (isViewerSearch) {
        return !existingViewers.includes(user.email) && !existingEmployees.includes(user.email);
      } else {
        return !existingEmployees.includes(user.email);
      }
    });

    // Format results to match expected structure
    const formattedResults = filteredUsers.map(user => ({
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

    // Check if the term looks like an email for manual entry
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(term) && !formattedResults.some(user => user.email === term)) {
      // Add manual email entry option
      formattedResults.unshift({
        _id: term,
        id: term,
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
    
    if (isViewerSearch) {
      setViewerSearchResults(formattedResults);
    } else {
      setEmployeeSearchResults(formattedResults);
    }
  };

  // Search projects function
  const searchProjects = (term: string) => {
    if (!term || term.length < 2) {
      setProjectSearchResults([]);
      return;
    }

    const filteredProjects = projects.filter((project: any) => {
      const title = project.project_title || project.title || project.name || '';
      const description = project.project_description || project.description || '';
      const matchesSearch = title.toLowerCase().includes(term.toLowerCase()) ||
                           description.toLowerCase().includes(term.toLowerCase());
      
      const alreadyAssigned = goalData.assignedProjects.some(p => 
        p.projectId === (project._id || project.id)
      );
      
      return matchesSearch && !alreadyAssigned;
    });
    
    setProjectSearchResults(filteredProjects);
  };

  // Create new project function
  const createNewProject = async (projectData: any) => {
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      if (!currentUser) {
        toast.error('User not found');
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          project_title: projectData.title,
          title: projectData.title,
          project_description: projectData.description || '',
          description: projectData.description || '',
          start_date: projectData.startDate || new Date().toISOString().split('T')[0],
          startDate: projectData.startDate || new Date().toISOString().split('T')[0],
          end_date: projectData.endDate || '',
          endDate: projectData.endDate || '',
          total_budget: projectData.budget || 0,
          budget: projectData.budget || 0,
          status: projectData.status || 'planning',
          priority: projectData.priority || 'medium',
          department: goalData.department || '',
          createdBy: currentUser.email || '',
          createdByRole: currentUser.role || '',
          companyCode: currentUser.companyCode || '',
          createdFromGoal: true,
          linkedToGoal: true,
          goalContext: {
            goalId: 'pending',
            goalTitle: goalData.title || 'New Goal'
          },
          visibleToAll: projectData.visibleToAll || false,
          assignedEmployees: projectData.assignedEmployees || [],
          team_members: (projectData.assignedEmployees || []).map((m: any) => ({
            user_id: m.employeeId,
            name: m.name,
            email: m.email,
            role: m.role || 'member',
            permissions: ['view', 'edit', 'comment'],
            joinedAt: new Date().toISOString()
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newProject = {
          projectId: result.projectId || result.id || result._id,
          name: projectData.title,
          description: projectData.description || ''
        };

        setGoalData(prev => ({
          ...prev,
          assignedProjects: [...prev.assignedProjects, newProject]
        }));

        toast.success('Project created and assigned to goal successfully!');
        return { success: true, project: newProject };
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create project');
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return { success: false, error: 'Network error' };
    }
  };

  // Add functions for managing form data
  const addEmployeeFromSearch = (employee: any) => {
    const newEmployee = {
      employeeId: employee._id,
      email: employee.email,
      name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email.split('@')[0],
      role: employee.role || ''
    };
    
    setGoalData(prev => ({
      ...prev,
      assignedEmployees: [...prev.assignedEmployees, newEmployee]
    }));
    
    setEmployeeSearchTerm('');
    setEmployeeSearchResults([]);
  };

  const addViewerFromSearch = (viewer: any) => {
    const newViewer = {
      employeeId: viewer._id,
      email: viewer.email,
      name: viewer.name || `${viewer.firstName || ''} ${viewer.lastName || ''}`.trim() || viewer.email.split('@')[0]
    };
    
    setGoalData(prev => ({
      ...prev,
      viewers: [...prev.viewers, newViewer]
    }));
    
    setViewerSearchTerm('');
    setViewerSearchResults([]);
  };

  const addProjectFromSearch = (project: any) => {
    const newProject = {
      projectId: project._id || project.id,
      name: project.project_title || project.title || project.name,
      description: project.project_description || project.description || ''
    };
    
    setGoalData(prev => ({
      ...prev,
      assignedProjects: [...prev.assignedProjects, newProject]
    }));
    
    setProjectSearchTerm('');
    setProjectSearchResults([]);
    toast.success('Project added to goal');
  };

  const removeEmployee = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.filter((_, i) => i !== index)
    }));
  };

  const removeViewer = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      viewers: prev.viewers.filter((_, i) => i !== index)
    }));
  };

  const removeProject = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      assignedProjects: prev.assignedProjects.filter((_, i) => i !== index)
    }));
  };

  const addKPI = () => {
    setGoalData(prev => ({
      ...prev,
      kpis: [...prev.kpis, {
        name: '',
        description: '',
        target: 0,
        unit: '',
        dueDate: ''
      }]
    }));
  };

  const removeKPI = (index: number) => {
    setGoalData(prev => ({
      ...prev,
      kpis: prev.kpis.filter((_, i) => i !== index)
    }));
  };

  const updateKPI = (index: number, field: string, value: any) => {
    setGoalData(prev => ({
      ...prev,
      kpis: prev.kpis.map((kpi, i) => 
        i === index ? { ...kpi, [field]: value } : kpi
      )
    }));
  };

  const handleManualEmployeeAdd = (email: string) => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    const existingEmployee = goalData.assignedEmployees.find(e => e.email === email);
    if (existingEmployee) {
      toast.error('Employee already added');
      return;
    }
    
    const newEmployee = {
      employeeId: `manual-${email}`,
      email: email,
      name: email.split('@')[0],
      role: 'employee'
    };
    
    setGoalData(prev => ({
      ...prev,
      assignedEmployees: [...prev.assignedEmployees, newEmployee]
    }));
    
    setManualEmployeeEmail('');
  };

  const handleManualViewerAdd = (email: string) => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    const existingViewer = goalData.viewers.find(v => v.email === email);
    const existingEmployee = goalData.assignedEmployees.find(e => e.email === email);
    
    if (existingViewer || existingEmployee) {
      toast.error('User already added');
      return;
    }
    
    const newViewer = {
      employeeId: `manual-${email}`,
      email: email,
      name: email.split('@')[0]
    };
    
    setGoalData(prev => ({
      ...prev,
      viewers: [...prev.viewers, newViewer]
    }));
    
    setManualViewerEmail('');
  };

  // Handle goal creation
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Format goal data to match AddGoalModal structure
      const formattedGoalData = {
        title: goalData.title,
        description: goalData.description,
        department: goalData.department,
        status: goalData.status,
        priority: goalData.priority,
        startDate: goalData.startDate,
        endDate: goalData.endDate,
        visibleToAll: goalData.visibleToAll,
        kpis: goalData.kpis,
        assignedEmployees: goalData.assignedEmployees.map(emp => ({
          employeeId: emp.employeeId || emp.id || `manual-${emp.email}`,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department || '',
          tasks: emp.tasks || '',
          hours: emp.hours || '',
          toolsUsed: emp.toolsUsed || '',
          addedBy: currentUser?.name || currentUser?.email || 'Current User'
        })),
        viewers: goalData.viewers.map(viewer => ({
          employeeId: viewer.employeeId || viewer.id || `manual-${viewer.email}`,
          name: viewer.name,
          email: viewer.email
        })),
        assignedProjects: goalData.assignedProjects
      };

      console.log('Submitting goal data to API:', formattedGoalData);
      const result = await addNewGoal(formattedGoalData);
      console.log('Goal creation result:', result);

      if (result.success) {
        // Wait a moment to ensure the goal data is fully processed
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        // Redirect to the specific goal detail page
        if (result.goalId) {
          router.push(`/dashboard/goals/${result.goalId}`);
        } else {
          router.push('/dashboard/goals');
        }
        toast.success('Goal created successfully! Redirecting to goal detail page...');
      } else {
        toast.error(String(result.error || 'Failed to create goal'));
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Validation function for each step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return goalData.title && goalData.description && goalData.department && goalData.startDate && goalData.endDate;
      case 2:
        return true; // KPIs are optional
      case 3:
        return true; // Projects are optional
      case 4:
        return true; // Employees are optional
      case 5:
        return true; // Viewers are optional
      case 6:
        return true; // Final step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAlmostThereComplete = () => {
    setShowAlmostThere(false);
    setCurrentStep(7);
  };

  // Get step content based on current step
  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        // Basic details step
        return (
          <div className="mt-16 mb-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light text-gray-900">Basic Goal Details</h2>
              <p className="text-gray-600 font-light">Let's start with the fundamentals of your goal. This includes the title, description, department, timeline, and priority level.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">Goal Title *</Label>
                <Input
                  id="title"
                  value={goalData.title}
                  onChange={(e) => setGoalData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter goal title"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description *</Label>
                <Textarea
                  id="description"
                  value={goalData.description}
                  onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the goal in detail"
                  className="w-full min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department *</Label>
                <Input
                  id="department"
                  value={goalData.department}
                  onChange={(e) => setGoalData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Enter department"
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={goalData.startDate}
                    onChange={(e) => setGoalData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={goalData.endDate}
                    onChange={(e) => setGoalData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Priority *</Label>
                  <Select value={goalData.priority} onValueChange={(value) => setGoalData(prev => ({ ...prev, priority: value }))}>
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
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Select value={goalData.status} onValueChange={(value) => setGoalData(prev => ({ ...prev, status: value }))}>
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
              </div>
            </div>
          </div>
        );

      case 2:
        // KPIs step
        return (
          <div className="mt-32 mb-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light text-gray-900">Key Performance Indicators</h2>
              <p className="text-gray-600 font-light">KPIs are measurable values that help track progress toward your goal. Define specific metrics like "Increase sales by 20%" or "Complete 50 tasks" with target numbers and deadlines.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-lg mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">KPIs ({goalData.kpis.length})</h3>
                <Button
                  onClick={addKPI}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm"
                >
                  Add KPI
                </Button>
              </div>
              
              {goalData.kpis.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                </div>
              ) : (
                <div className="space-y-4">
                  {goalData.kpis.map((kpi, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">KPI {index + 1}</h4>
                        <Button
                          onClick={() => removeKPI(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          placeholder="KPI Name *"
                          value={kpi.name}
                          onChange={(e) => updateKPI(index, 'name', e.target.value)}
                        />
                        
                        <Textarea
                          placeholder="KPI Description"
                          value={kpi.description}
                          onChange={(e) => updateKPI(index, 'description', e.target.value)}
                          className="min-h-[80px]"
                        />
                        
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            placeholder="Target *"
                            value={kpi.target}
                            onChange={(e) => updateKPI(index, 'target', parseFloat(e.target.value) || 0)}
                          />
                          
                          <Input
                            placeholder="Unit *"
                            value={kpi.unit}
                            onChange={(e) => updateKPI(index, 'unit', e.target.value)}
                          />
                          
                          <Input
                            type="date"
                            placeholder="Due Date"
                            value={kpi.dueDate}
                            onChange={(e) => updateKPI(index, 'dueDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        // Assigned projects step
        return (
          <div className="mt-32 mb-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light text-gray-900">Assigned Projects</h2>
              <p className="text-gray-600 font-light">Connect existing projects to this goal to show how they contribute to achieving it. You can also create new projects directly from here if needed.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-lg mx-auto space-y-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => {
                        setProjectSearchTerm(e.target.value);
                        searchProjects(e.target.value);
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => setShowCreateProject(!showCreateProject)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 whitespace-nowrap"
                  >
                    {showCreateProject ? 'Cancel' : 'Create New'}
                  </Button>
                </div>
                
                {projectSearchResults.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {projectSearchResults.map((project, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => addProjectFromSearch(project)}
                      >
                        <div className="font-medium text-sm">{project.project_title || project.title || project.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {project.project_description || project.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showCreateProject && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Create New Project</h4>
                    <div className="space-y-3">
                      <Input
                        placeholder="Project title *"
                        value={newProjectData.title}
                        onChange={(e) => setNewProjectData(prev => ({ ...prev, title: e.target.value }))}
                      />
                      <Textarea
                        placeholder="Project description"
                        value={newProjectData.description}
                        onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                        className="min-h-[80px]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          placeholder="Start date"
                          value={newProjectData.startDate}
                          onChange={(e) => setNewProjectData(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                        <Input
                          type="date"
                          placeholder="End date"
                          value={newProjectData.endDate}
                          onChange={(e) => setNewProjectData(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            if (!newProjectData.title) {
                              toast.error('Project title is required');
                              return;
                            }
                            const result = await createNewProject(newProjectData);
                            if (result?.success) {
                              setNewProjectData({
                                title: '',
                                description: '',
                                startDate: '',
                                endDate: '',
                                budget: 0,
                                status: 'planning',
                                priority: 'medium'
                              });
                              setShowCreateProject(false);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
                        >
                          Create Project
                        </Button>
                        <Button
                          onClick={() => setShowCreateProject(false)}
                          variant="ghost"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">Assigned Projects ({goalData.assignedProjects.length})</h3>
                {goalData.assignedProjects.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No projects assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {goalData.assignedProjects.map((project, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <div className="font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-gray-500">{project.description}</div>
                        </div>
                        <Button
                          onClick={() => removeProject(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
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
        // Members (assigned employees) step
        return (
          <div className="mt-32 mb-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light text-gray-900">Team Members</h2>
              <p className="text-gray-600 font-light">Team members are employees who will actively work on achieving this goal. They can contribute tasks, track progress, and collaborate on goal-related activities.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-lg mx-auto space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearchTerm}
                    onChange={(e) => {
                      setEmployeeSearchTerm(e.target.value);
                      searchUsers(e.target.value, false);
                    }}
                  />
                </div>
                
                {employeeSearchResults.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {employeeSearchResults.map((employee, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => addEmployeeFromSearch(employee)}
                      >
                        <div className="font-medium text-sm">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.email} • {employee.role}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email manually"
                    value={manualEmployeeEmail}
                    onChange={(e) => setManualEmployeeEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualEmployeeAdd(manualEmployeeEmail);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleManualEmployeeAdd(manualEmployeeEmail)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
                  >
                    Add
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">Assigned Employees ({goalData.assignedEmployees.length})</h3>
                {goalData.assignedEmployees.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No employees assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {goalData.assignedEmployees.map((employee, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <div className="font-medium text-sm">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.email} • {employee.role}</div>
                        </div>
                        <Button
                          onClick={() => removeEmployee(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
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
        // Viewers step
        return (
          <div className="mt-32 mb-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light text-gray-900">Viewers & Visibility</h2>
              <p className="text-gray-600 font-light">Viewers can see the goal and its progress but cannot edit it. Unlike team members who actively work on the goal, viewers only have read-only access for monitoring purposes.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-lg mx-auto space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="visibleToAll"
                    checked={goalData.visibleToAll}
                    onChange={(e) => setGoalData(prev => ({ ...prev, visibleToAll: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="visibleToAll" className="text-sm font-medium">
                    Make this goal visible to all employees
                  </Label>
                </div>
                
                {!goalData.visibleToAll && (
                  <>
                    <div className="relative">
                      <Input
                        placeholder="Search viewers..."
                        value={viewerSearchTerm}
                        onChange={(e) => {
                          setViewerSearchTerm(e.target.value);
                          searchUsers(e.target.value, true);
                        }}
                      />
                    </div>
                    
                    {viewerSearchResults.length > 0 && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {viewerSearchResults.map((viewer, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => addViewerFromSearch(viewer)}
                          >
                            <div className="font-medium text-sm">{viewer.name}</div>
                            <div className="text-xs text-gray-500">{viewer.email} • {viewer.role}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter email manually"
                        value={manualViewerEmail}
                        onChange={(e) => setManualViewerEmail(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleManualViewerAdd(manualViewerEmail);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleManualViewerAdd(manualViewerEmail)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
                      >
                        Add
                      </Button>
                    </div>
                  </>
                )}
              </div>
              
              {!goalData.visibleToAll && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Viewers ({goalData.viewers.length})</h3>
                  {goalData.viewers.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p>No viewers added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {goalData.viewers.map((viewer, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div>
                            <div className="font-medium text-sm">{viewer.name}</div>
                            <div className="text-xs text-gray-500">{viewer.email}</div>
                          </div>
                          <Button
                            onClick={() => removeViewer(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        // Final confirmation step
        return (
          <div className="mt-16 mb-8 space-y-8">
            <div className="text-center space-y-4">
   
              <h2 className="text-3xl font-light text-gray-900">Ready to Create Goal!</h2>
              <p className="text-gray-600 font-light">Review your goal details before creating</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-lg mx-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Goal Title:</span>
                  <p className="font-medium">{goalData.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Department:</span>
                  <p>{goalData.department}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Timeline:</span>
                  <p>{goalData.startDate} to {goalData.endDate}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Priority:</span>
                  <p className="capitalize">{goalData.priority}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">KPIs:</span>
                  <p>{goalData.kpis.length} defined</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Assigned Projects:</span>
                  <p>{goalData.assignedProjects.length} projects</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Team Members:</span>
                  <p>{goalData.assignedEmployees.length} employees</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Visibility:</span>
                  <p>{goalData.visibleToAll ? 'Visible to all' : `${goalData.viewers.length} specific viewers`}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <Button 
                onClick={handleComplete}
                disabled={isLoading}
                className="w-48 bg-purple-600 hover:bg-purple-700 text-white py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {isLoading ? 'Creating...' : 'Create Goal'}
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Step {currentStep} of 7</h2>
            <p>Content for step {currentStep} coming soon...</p>
          </div>
        );
    }
  };

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

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
          <AlmostThereTransition onComplete={() => setShowAlmostThere(false)} />
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
                  {currentStep > 1 && currentStep < 6 && (
                    <button
                      onClick={handleBack}
                      disabled={isLoading}
                      className="text-black hover:text-gray-700 font-medium flex items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </button>
                  )}
                  
                  {currentStep < 6 ? (
                    <button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="text-purple-600 hover:text-purple-700 font-medium flex items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalOnboardingPage;
