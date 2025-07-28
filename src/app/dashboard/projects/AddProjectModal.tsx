import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { fetchProjects } from "./api";
import ProjectAIRecommendations from '@/components/ProjectAIRecommendations';
import { ArrowLeft } from 'lucide-react';
import { FaSearch, FaSpinner } from 'react-icons/fa';

interface AddProjectModalProps {
  onAddProject: (project: any) => Promise<{ success: boolean; error?: string; projectId?: string }>;
  onCancel?: () => void;
}

type EmployeeEditor = { name: string; email: string; department: string; role: string; tasks: string; hours: string; toolsUsed: string; isLead?: boolean };

const AddProjectModal = ({ onAddProject, onCancel }: AddProjectModalProps) => {
  const router = useRouter();
  const [projectData, setProjectData] = useState({
    linkedProjects: [] as { projectId: string; name: string }[], // store multiple linked projects
    name: '', description: '', department: '', startDate: '', endDate: '',
    status: 'planning', priority: 'low', total_budget: '', toolsUsed: '',
    employees: [] as EmployeeEditor[],
    viewers: [] as { name: string; email: string }[], // non-contributing viewers
    visibleToAll: true, // Set to true by default for better visibility
  });
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localCompanyCode, setLocalCompanyCode] = useState<string | null>(null);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectSearchResults, setProjectSearchResults] = useState<any[]>([]);
  const [isSearchingProjects, setIsSearchingProjects] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [showViewerSearch, setShowViewerSearch] = useState(false);

  // User search states - using user-management pattern
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Load all users once for fast client-side search (user-management pattern)
  const loadAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users?limit=0', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }

      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to empty array if loading fails
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    async function loadProjectsList() {
      setLoading(true);
      try {
        // Load all users for search
        await loadAllUsers();
        // Determine current user from localStorage or API
        const storedUser = localStorage.getItem('user');
        let user: any = storedUser ? JSON.parse(storedUser) : {};
        try {
          const token = localStorage.getItem('token');
          const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (meRes.ok) {
            const meJson = await meRes.json();
            user = meJson.user || meJson;
          }
        } catch {
          console.warn('Auth/me endpoint unavailable, using localStorage user');
        }
        const userEmail = (user.email || '').toLowerCase();
        setCurrentUser(user);
        setLocalCompanyCode(user.companyCode || null);
        
        // Get all projects
        const result = await fetchProjects();
        const allProjects = result.projects || [];
        // Determine if user is admin or top management
        const roleLower = (user.role || '').toLowerCase();
        const isPrivileged = roleLower === 'admin' || roleLower.startsWith('top_management');
        setIsPrivilegedUser(isPrivileged);
        let accessibleProjects;
        if (isPrivileged) {
          accessibleProjects = allProjects;
        } else {
          accessibleProjects = allProjects.filter((p: any) =>
            p.visibleToAll ||
            (Array.isArray(p.employees) && p.employees.some((e: any) => e.email?.toLowerCase() === userEmail)) ||
            (Array.isArray(p.viewers) && p.viewers.some((v: any) => v.email?.toLowerCase() === userEmail))
          );
        }
        setProjectsList(accessibleProjects);
      } catch (e) {
        console.error('Error loading projects:', e);
        toast.error('Failed to load projects.');
      } finally {
        setLoading(false);
      }
    }
    loadProjectsList();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProjectData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmployeeChange = (i: number, field: keyof EmployeeEditor, value: string | boolean) => {
    setProjectData(prev => {
      const emps = [...prev.employees]; 
      emps[i] = { ...emps[i], [field]: value };
      return { ...prev, employees: emps };
    });
  };

  const addEmployee = () => setProjectData(prev => ({ ...prev, employees: [...prev.employees, { name:'',email:'',department:'',role:'',tasks:'',hours:'',toolsUsed:'' }] }));
  const removeEmployee = (i: number) => setProjectData(prev => { const emps=[...prev.employees]; emps.splice(i,1); return { ...prev, employees: emps }; });

  // Employee search function - using client-side filtering (user-management pattern)
  const searchEmployees = (term: string) => {
    if (!term.trim()) {
      setEmployeeSearchResults([]);
      return;
    }

    // Filter users client-side for instant results
    const filteredUsers = allUsers.filter(user => {
      const matchesSearch =
        user.username?.toLowerCase().includes(term.toLowerCase()) ||
        user.email?.toLowerCase().includes(term.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(term.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(term.toLowerCase())) ||
        (user.name && user.name.toLowerCase().includes(term.toLowerCase()));

      return matchesSearch;
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

    setEmployeeSearchResults(formattedResults);
  };

  const addEmployeeFromSearch = (employee: any) => {
    // Check if already added
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

  const addMember = () => setProjectData(prev => ({ ...prev, viewers: [...prev.viewers, { name: '', email: '' }] }));
  const removeMember = (i: number) => setProjectData(prev => { const m = [...prev.viewers]; m.splice(i,1); return { ...prev, viewers: m }; });
  const handleMemberChange = (i: number, field: 'name' | 'email', value: string) => setProjectData(prev => { const m = [...prev.viewers]; m[i] = { ...m[i], [field]: value }; return { ...prev, viewers: m }; });

  const addViewerFromSearch = (viewer: any) => {
    // Check if already added
    if (projectData.viewers.some(v => v.email === viewer.email)) {
      toast.error('User already added as viewer');
      return;
    }

    // Check if already assigned as employee
    if (projectData.employees.some(emp => emp.email === viewer.email)) {
      toast.error('User is already assigned as team member');
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

  const handleCheckboxChange = (field: string, value: boolean) => {
    setProjectData({
      ...projectData,
      [field]: value
    });
    
    // Log for debugging
    console.log(`Set ${field} to ${value}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        toast.error('Authentication required. Please log in again.');
        setSubmitting(false);
        return;
      }
      
      // Prepare data for API
      const formattedData = {
        project_title: projectData.name,
        project_description: projectData.description,
        department: projectData.department,
        start_date: projectData.startDate,
        end_date: projectData.endDate || undefined,
        status: projectData.status,
        priority: projectData.priority,
        total_budget: projectData.total_budget ? parseFloat(projectData.total_budget) : undefined,
        tools_and_resources: projectData.toolsUsed ? projectData.toolsUsed.split(',').map(t => t.trim()) : [],
        visible_to_all: projectData.visibleToAll,
        
        // Include linked projects array
        linked_projects: projectData.linkedProjects,
        
        // Format employee contributions
        employee_contributions: projectData.employees.map(emp => {
          // Ensure hours is a valid number, default to 0 if not provided or invalid
          const hours = emp.hours ? parseFloat(emp.hours) : 0;
          
          return {
            name: emp.name,
            email: emp.email,
            department: emp.department,
            role: emp.role,
            is_lead: emp.isLead || false,
            tasks: emp.tasks ? emp.tasks.split(',').map(t => t.trim()) : [],
            hours: !isNaN(hours) ? hours : 0, // Ensure it's a valid number
            hours_per_week: !isNaN(hours) ? hours : 0, // Add hours_per_week for compatibility
            tools_used: emp.toolsUsed ? emp.toolsUsed.split(',').map(t => t.trim()) : []
          };
        }),
        
        // Format viewers
        viewers: projectData.viewers.map(viewer => ({
          name: viewer.name,
          email: viewer.email
        }))
      };

      // Check if current user is top management
      const isTopManagement = currentUser?.role && [
        'top_management_tier_1', 
        'top_management_tier_2', 
        'top_management_tier_3'
      ].includes(currentUser.role);
      
      // Get company code from multiple possible sources
      const companyCode = 
        currentUser?.companyCode || 
        currentUser?.company_code || 
        localStorage.getItem('companyCode');
      
      // Create submission data with necessary metadata
      const submissionData = {
        ...formattedData,
        creatorRole: currentUser?.role,
        creatorEmail: currentUser?.email,
        creatorName: currentUser?.name,
        companyCode: companyCode,
        isManagementProject: isTopManagement,
        // Ensure visibleToAll is explicitly set (defaulting to true if not specified)
        visibleToAll: projectData.visibleToAll !== false,
      };
      
      console.log('Submitting project data with company code:', submissionData.companyCode);
      
      const result = await onAddProject(submissionData);
      if (result && result.success && result.projectId) {
        toast.success('Project created successfully!');
        router.push(`/dashboard/projects/${result.projectId}`);
        return;
      }
      toast.error(result?.error || 'Failed to create project');
    } catch (error) {
      console.error('Error submitting project:', error);
      toast.error('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  // Project search function
  const searchProjects = async (term: string) => {
    if (!term.trim()) {
      setProjectSearchResults([]);
      return;
    }

    setIsSearchingProjects(true);
    try {
      const response = await fetch(`/api/projects/search?q=${encodeURIComponent(term)}`);
      if (response.ok) {
        const data = await response.json();
        setProjectSearchResults(data.projects || []);
      }
    } catch (error) {
      console.error('Error searching projects:', error);
    } finally {
      setIsSearchingProjects(false);
    }
  };

  // Compute filtered options for linking
  const filteredLinkableProjects = isPrivilegedUser
    ? projectsList
    : projectsList.filter(p =>
        !projectData.linkedProjects.some(lp => lp.projectId === p.id) &&
        (p.project_title || p.name)
      );

  return (
    <form onSubmit={handleSubmit} className="bg-white text-black p-4 space-y-6 w-full">
      {/* Basic Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="basic-fields">
        <div>
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" name="name" autoComplete="off" value={projectData.name} onChange={handleChange} placeholder="Project name" />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            autoComplete="off"
            value={projectData.department}
            onChange={handleChange}
            placeholder="Enter department"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" autoComplete="off" value={projectData.description} onChange={handleChange} placeholder="Enter project description" rows={3} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select name="status" value={projectData.status} onValueChange={(v) => handleSelectChange('status', v)}>
            <SelectTrigger id="status" className="text-gray-900 bg-white"><SelectValue placeholder="Select status" className="text-gray-900" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="planning" className="text-gray-900">Planning</SelectItem>
              <SelectItem value="ongoing" className="text-gray-900">Ongoing</SelectItem>
              <SelectItem value="completed" className="text-gray-900">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" value={projectData.priority} onValueChange={(v) => handleSelectChange('priority', v)}>
            <SelectTrigger id="priority" className="text-gray-900 bg-white"><SelectValue placeholder="Select priority" className="text-gray-900" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="low" className="text-gray-900">Low</SelectItem>
              <SelectItem value="medium" className="text-gray-900">Medium</SelectItem>
              <SelectItem value="high" className="text-gray-900">High</SelectItem>
              <SelectItem value="critical" className="text-gray-900">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" name="startDate" type="date" autoComplete="off" value={projectData.startDate} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" name="endDate" type="date" autoComplete="off" value={projectData.endDate} onChange={handleChange} />
        </div>
      </div>
      
      {/* Budget & Tools Used */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="total_budget">Budget</Label>
          <Input
            id="total_budget" 
            name="total_budget" 
            type="number" 
            placeholder="Enter project budget"
            value={projectData.total_budget} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="toolsUsed">Tools Used (comma separated)</Label>
          <Input
            id="toolsUsed" 
            name="toolsUsed" 
            placeholder="e.g. Jira, Figma, GitHub"
            value={projectData.toolsUsed} 
            onChange={handleChange}
          />
        </div>
      </div>
      
      {/* Linked Projects Selection */}
      <div className="space-y-2 border-t pt-4" data-tour="linked-projects">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showLink"
            checked={showLink}
            onCheckedChange={(checked) => setShowLink(!!checked)}
          />
          <Label htmlFor="showLink" className="text-sm font-medium leading-none">
            Link this project to other projects
          </Label>
        </div>

        {showLink && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm text-black">Linked Projects</Label>
              <Button 
                variant="outline" 
                size="sm" 
                type="button" 
                onClick={() => {
                  if (selectedProjectId) {
                    const selectedProject = projectsList.find(p => p.id === selectedProjectId);
                    if (selectedProject && !projectData.linkedProjects.some(lp => lp.projectId === selectedProjectId)) {
                      setProjectData(prev => ({
                        ...prev,
                        linkedProjects: [...prev.linkedProjects, {
                          projectId: selectedProjectId,
                          name: selectedProject.project_title || selectedProject.name
                        }]
                      }));
                      setSelectedProjectId('');
                    }
                  }
                }}
                className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
              >
                Add Project
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="flex-1 bg-white text-black border-gray-300">
                  <SelectValue placeholder="Select a project to link" className="text-black" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {/* Search Input in Dropdown */}
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => {
                        setProjectSearchTerm(e.target.value);
                        searchProjects(e.target.value);
                      }}
                      className="text-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Recent Projects (when no search) */}
                  {!projectSearchTerm && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-500 font-medium">Recent Projects</div>
                      {projectsList
                        .filter(p => {
                          // Skip if no ID or title
                          if (!p.id || !(p.project_title || p.name)) return false;

                          // Only show if not already linked
                          return !projectData.linkedProjects.some(lp => lp.projectId === p.id);
                        })
                        .map(p => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-black hover:bg-gray-100"
                          >
                            {p.project_title || p.name || 'Unnamed Project'}
                          </SelectItem>
                      ))}
                    </>
                  )}

                  {/* Search Results */}
                  {projectSearchTerm && projectSearchResults.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-500 font-medium">Search Results</div>
                      {projectSearchResults
                        .filter(p => !projectData.linkedProjects.some(lp => lp.projectId === p.id))
                        .map(p => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-black hover:bg-gray-100"
                          >
                            {p.project_title || p.title || 'Unnamed Project'}
                          </SelectItem>
                        ))}
                    </>
                  )}

                  {/* No results */}
                  {projectSearchTerm && projectSearchResults.length === 0 && !isSearchingProjects && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      No projects found
                    </div>
                  )}

                  {/* Loading */}
                  {isSearchingProjects && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      Searching...
                    </div>
                  )}

                  {/* No projects available when not searching */}
                  {!projectSearchTerm && projectsList.filter(p =>
                    p.id &&
                    (p.project_title || p.name) &&
                    !projectData.linkedProjects.some(lp => lp.projectId === p.id)
                  ).length === 0 && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      No projects available to link
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Display selected linked projects */}
            <div className="space-y-2">
              {projectData.linkedProjects.map((linkedProject, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-md">
                  <span className="text-sm text-black flex-1">{linkedProject.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Simply remove the project from the linked projects list
                      setProjectData(prev => ({
                        ...prev,
                        linkedProjects: prev.linkedProjects.filter((_, i) => i !== idx)
                      }));
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                    aria-label="Unlink project"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </Button>
                </div>
              ))}
              
              {projectData.linkedProjects.length === 0 && (
                <p className="text-sm text-gray-500 italic">No linked projects selected</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Employees Section */}
      <div className="space-y-4 border-t pt-4" data-tour="members-section">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Team Members</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowEmployeeSearch(!showEmployeeSearch)}
              className="text-black text-sm"
            >
              Search & Add
            </Button>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={addEmployee}
              className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
            >
              Add Manually
            </Button>
          </div>
        </div>

        {showEmployeeSearch && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="space-y-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search team members by name or email..."
                  className="pl-10 pr-4 py-2 w-full"
                  value={employeeSearchTerm}
                  onChange={(e) => {
                    setEmployeeSearchTerm(e.target.value);
                    searchEmployees(e.target.value);
                  }}
                />
              </div>

              {isLoadingUsers && (
                <div className="flex items-center justify-center py-4">
                  <FaSpinner className="animate-spin h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm text-gray-600">Loading users...</span>
                </div>
              )}

              {employeeSearchTerm && employeeSearchResults.length > 0 && (
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
              )}

              {employeeSearchTerm && employeeSearchResults.length === 0 && !isLoadingUsers && (
                <div className="text-center py-4 text-gray-500">
                  No users found for "{employeeSearchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
        {projectData.employees.map((emp, idx) => (
          <div key={idx} className="border p-4 rounded-md space-y-3 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="font-medium">Employee {idx+1}</span>
              <Button variant="destructive" size="sm" type="button" onClick={() => removeEmployee(idx)}>Remove</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Name" value={emp.name} onChange={(e) => handleEmployeeChange(idx,'name',e.target.value)} />
              <Input placeholder="Email" value={emp.email} onChange={(e) => handleEmployeeChange(idx,'email',e.target.value)} />
              <Input placeholder="Department" value={emp.department} onChange={(e) => handleEmployeeChange(idx,'department',e.target.value)} />
              <Input placeholder="Role" value={emp.role} onChange={(e) => handleEmployeeChange(idx,'role',e.target.value)} />
              <Input
                placeholder="Added by"
                value={emp.addedBy || currentUser?.name || currentUser?.email || 'Current User'}
                disabled
                className="bg-gray-100 text-gray-600"
              />
              <div className="md:col-span-2">
                <Textarea placeholder="Specific Tasks (comma separated)" value={emp.tasks} onChange={(e) => handleEmployeeChange(idx,'tasks',e.target.value)} rows={2} />
              </div>
              <Input type="number" placeholder="Hours Worked" value={emp.hours} onChange={(e) => handleEmployeeChange(idx,'hours',e.target.value)} />
              <Input placeholder="Tools Used (comma separated)" value={emp.toolsUsed} onChange={(e) => handleEmployeeChange(idx,'toolsUsed',e.target.value)} />
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox
                  id={`isLead-${idx}`}
                  checked={emp.isLead || false}
                  onCheckedChange={(checked) => handleEmployeeChange(idx, 'isLead', !!checked)}
                />
                <Label htmlFor={`isLead-${idx}`} className="text-sm">
                  Is this person the lead of the project?
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Members (association only) */}
      <div className="space-y-2 border-t pt-4" data-tour="viewers-section">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Viewers</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowViewerSearch(!showViewerSearch)}
              className="text-black text-sm"
            >
              Search & Add
            </Button>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={addMember}
              className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
            >
              Add Manually
            </Button>
          </div>
        </div>

        {showViewerSearch && (
          <div className="border rounded-lg p-4 bg-yellow-50">
            <div className="space-y-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search viewers by name or email..."
                  className="pl-10 pr-4 py-2 w-full"
                  value={employeeSearchTerm}
                  onChange={(e) => {
                    setEmployeeSearchTerm(e.target.value);
                    searchEmployees(e.target.value);
                  }}
                />
              </div>

              {isLoadingUsers && (
                <div className="flex items-center justify-center py-4">
                  <FaSpinner className="animate-spin h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm text-gray-600">Loading users...</span>
                </div>
              )}

              {employeeSearchTerm && employeeSearchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                  {employeeSearchResults.map((viewer, index) => (
                    <div
                      key={viewer.id || index}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        addViewerFromSearch(viewer);
                        setShowViewerSearch(false);
                        setEmployeeSearchTerm('');
                        setEmployeeSearchResults([]);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {viewer.name || viewer.email}
                            {viewer.isManualEntry && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Manual Entry</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{viewer.email}</div>
                          {viewer.department && (
                            <div className="text-xs text-gray-500">{viewer.department} • {viewer.role}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {employeeSearchTerm && employeeSearchResults.length === 0 && !isLoadingUsers && (
                <div className="text-center py-4 text-gray-500">
                  No users found for "{employeeSearchTerm}"
                </div>
              )}
            </div>
          </div>
        )}

        {projectData.viewers.map((viewer, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <Input placeholder="Name" value={viewer.name} onChange={e => handleMemberChange(idx, 'name', e.target.value)} />
            <Input placeholder="Email" value={viewer.email} onChange={e => handleMemberChange(idx, 'email', e.target.value)} />
            <Input
              placeholder="Added by"
              value={viewer.addedBy || currentUser?.name || currentUser?.email || 'Current User'}
              disabled
              className="bg-gray-100 text-gray-600"
            />
            <Button variant="destructive" size="sm" type="button" onClick={() => removeMember(idx)}>Remove</Button>
          </div>
        ))}
      </div>

      {/* Project Visibility */}
      <div className="pt-4 border-t" data-tour="permission-controls">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="visibleToAll"
            name="visibleToAll"
            checked={projectData.visibleToAll}
            onCheckedChange={(checked) => handleCheckboxChange('visibleToAll', !!checked)}
          />
          <Label htmlFor="visibleToAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Make Visible to All Employees (Recommended)
          </Label>
        </div>
        <p className="text-xs text-gray-500 pl-6 mt-1">
          When enabled, all employees will have view access to this project.
          Top management will still have edit access regardless of this setting.
        </p>
      </div>
      
      {/* Team Members Section */}
      <div className="space-y-2 border-t pt-4" data-tour="ai-recommendations">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Need help staffing this project?</Label>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!projectData.name.trim()) {
                toast.error('Project Name is required to fetch recommendations');
                return;
              }
              setShowRecommendations(true);
            }}
            className="bg-purple-100 hover:bg-purple-200 text-black text-sm"
          >
            Add AI Recommendations
          </Button>
        </div>
        
        
        {/* AI Recommendations */}
        {showRecommendations && localCompanyCode && (
          <div className="mb-6 border rounded-md p-4 bg-purple-50 border-purple-200">
            
            <ProjectAIRecommendations
              projectData={projectData}
              onApplyRecommendations={({ employees, tools }) => {
                setProjectData(prev => ({
                  ...prev,
                  employees,
                  toolsUsed: Array.isArray(tools) ? tools.join(', ') : ''
                }));
                toast.success('Team and tools recommendations applied!');
              }}
              companyCode={localCompanyCode!}
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-between pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-900"
          >
            <ArrowLeft size={16} />
            Back to Projects
          </Button>
        )}
        <Button
          type="submit"
          size="default"
          disabled={submitting}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-6"
        >
          {submitting ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
};

export default AddProjectModal;