import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ReactFlowInstance, Node } from 'reactflow';

declare global {
  interface Window {
    __REACT_FLOW_INSTANCE__?: ReactFlowInstance;
  }
}
import { FaTimes, FaTrash, FaChevronRight, FaPlus, FaEdit, FaSave, FaUndo } from 'react-icons/fa';
import { calculateUtilizationScore, calculateAttritionScore } from '../utils/employeeScoreCalculator';
import { AlertCircle, Database, Calculator, AlertTriangle, Info } from 'lucide-react';
import { X } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface EmployeeProfileProps {
  employee: any;
  onClose: () => void;
  onRemove: (email: string) => void;
  onUpdateEmployee?: (updatedEmployee: any) => void;
  onUndoDelete?: () => void;
  nodes?: any[]; // Add nodes prop for manager lookup
}

interface SkillsFeedback {
  given: string[];
  received: string[];
}

const EmployeeProfile = ({ employee, onClose, onRemove, onUpdateEmployee, onUndoDelete, nodes = [] }: EmployeeProfileProps) => {
  const [skillsFeedback, setSkillsFeedback] = useState<SkillsFeedback | null>(null);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  
  // Fetch skills feedback when employee changes
  useEffect(() => {
    const fetchSkillsFeedback = async () => {
      if (!employee?.email) return;
      
      setIsLoadingSkills(true);
      setSkillsError(null);
      
      try {
        const response = await fetch(`/api/feedback/skills?email=${encodeURIComponent(employee.email)}`, {
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
        setSkillsError('Failed to load skills feedback');
      } finally {
        setIsLoadingSkills(false);
      }
    };
    
    fetchSkillsFeedback();
  }, [employee?.email]);
  const [successors, setSuccessors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'feedback' | 'duties' | 'metrics'>('info');
  const [projects, setProjects] = useState<any[]>([]);
  const [jobDuties, setJobDuties] = useState<Array<{duty: string, hours: number, tools?: string}>>([]);
  const [newDuty, setNewDuty] = useState({ duty: '', hours: 0, tools: '' });
  const [isEditingDuties, setIsEditingDuties] = useState<boolean>(false);
  const [editedDuties, setEditedDuties] = useState<any[]>([]);
  const [calculatedScores, setCalculatedScores] = useState<{
    utilization: { score: number; status: string };
    attrition: { score: number; risk: string };
  }>({
    utilization: { score: 0, status: 'optimal' },
    attrition: { score: 0, risk: 'low' }
  });

  // Fetch data when employee changes
  useEffect(() => {
    if (employee?.email) {
      fetchSuccessors(employee.email);
      fetchEmployeeProjects(employee.email);
      
      // Initialize job duties from employee data
      updateDutiesFromEmployee(employee);
      
      // Calculate initial scores
      calculateScores(employee);
    }
  }, [employee]);
  
  // Update duties from employee data
  const updateDutiesFromEmployee = (emp: any) => {
    const duties = emp.jobResponsibilities || emp.jobDuties || [];
    if (duties && Array.isArray(duties)) {
      const formattedDuties = duties.map((duty: any) => {
        // Handle MongoDB format
        if (typeof duty === 'object' && duty.duty) {
          return {
            duty: duty.duty,
            hours: duty.hours || 0,
            tools: duty.tools || ''
          };
        }
        return duty;
      });
      setJobDuties(formattedDuties);
      setEditedDuties(JSON.parse(JSON.stringify(formattedDuties)));
    } else {
      setJobDuties([]);
      setEditedDuties([]);
    }
  };

  // Calculate utilization and attrition scores based on employee data
  const calculateScores = (employeeData: any) => {
    try {
      const employeeWithDuties = {
        ...employeeData,
        jobDuties: employeeData.jobDuties || employeeData.job_duties || []
      };
      
      const utilizationResult = calculateUtilizationScore(employeeWithDuties);
      const attritionResult = calculateAttritionScore(employeeWithDuties);
      
      setCalculatedScores({
        utilization: {
          score: utilizationResult.score,
          status: utilizationResult.status
        },
        attrition: {
          score: attritionResult.score,
          risk: attritionResult.risk
        }
      });
      
      console.log('Calculated scores:', {
        utilization: utilizationResult.score,
        attrition: attritionResult.risk
      });
    } catch (error) {
      console.error('Error calculating scores:', error);
    }
  };

  // Fetch successor data from API
  const fetchSuccessors = async (email: string) => {
    console.log('=== START fetchSuccessors ===');
    console.log('Employee email:', email);
    console.log('Employee object:', JSON.stringify(employee, null, 2));
    
    try {
      setLoading(true);
      
      // First, try to get from API
      const url = `/api/organization/employee/successors?email=${encodeURIComponent(email)}`;
      console.log('🔍 [1/3] Fetching successors from API:', url);
      
      let apiSuccess = false;
      let successorCandidates = [];
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [1/3] API Response:', JSON.stringify(data, null, 2));
          
          // Handle different possible response structures from API
          console.log('🔍 Processing API response structure...');
          
          if (Array.isArray(data)) {
            // Case 1: Direct array of successors
            successorCandidates = data;
            console.log('📦 Extracted array of successors:', successorCandidates.length);
          } else if (data.successor_candidates) {
            // Case 2: Direct successor_candidates array
            successorCandidates = Array.isArray(data.successor_candidates) 
              ? data.successor_candidates 
              : [data.successor_candidates];
            console.log('📦 Extracted from direct successor_candidates:', successorCandidates.length);
          } else if (data.successorCandidates) {
            // Case 3: Direct successorCandidates array (camelCase)
            successorCandidates = Array.isArray(data.successorCandidates) 
              ? data.successorCandidates 
              : [data.successorCandidates];
            console.log('📦 Extracted from direct successorCandidates:', successorCandidates.length);
          } else if (data.successorAnalysis) {
            // Case 4: Nested in successorAnalysis object
            const analysis = typeof data.successorAnalysis === 'string' 
              ? JSON.parse(data.successorAnalysis)
              : data.successorAnalysis;
              
            if (analysis.successor_candidates) {
              successorCandidates = Array.isArray(analysis.successor_candidates)
                ? analysis.successor_candidates
                : [analysis.successor_candidates];
              console.log('📦 Extracted from nested successorAnalysis.successor_candidates:', successorCandidates.length);
            } else if (analysis.successorCandidates) {
              successorCandidates = Array.isArray(analysis.successorCandidates)
                ? analysis.successorCandidates
                : [analysis.successorCandidates];
              console.log('📦 Extracted from nested successorAnalysis.successorCandidates:', successorCandidates.length);
            }
          } else if (data.candidate_email || data.candidateEmail) {
            // Case 5: Single successor object
            successorCandidates = [data];
            console.log('📦 Extracted single successor from root object');
          } else {
            console.log('⚠️ No recognizable successor data structure in API response');
            console.log('Available keys in response:', Object.keys(data));
          }
          
          apiSuccess = true;
        } else {
          console.warn(`⚠️ API returned ${response.status}: ${response.statusText}`);
        }
      } catch (apiError) {
        console.error('❌ API fetch error:', apiError);
      }
      
      // If no data from API, try to parse from employee.successorAnalysisData
      if ((!apiSuccess || successorCandidates.length === 0) && employee.successorAnalysisData) {
        console.log('🔍 [2/3] Trying to extract from employee.successorAnalysisData');
        console.log('Raw successorAnalysisData type:', typeof employee.successorAnalysisData);
        
        try {
          // Check if it's a string that needs parsing
          let successorData = employee.successorAnalysisData;
          
          if (typeof successorData === 'string') {
            console.log('Parsing stringified successorAnalysisData...');
            try {
              successorData = JSON.parse(successorData);
              console.log('✅ Successfully parsed stringified successorAnalysisData');
            } catch (parseError) {
              console.error('❌ Failed to parse stringified successorAnalysisData:', parseError);
              throw parseError;
            }
          }
          
          console.log('Parsed successor data structure:', JSON.stringify(successorData, null, 2));
          
          if (Array.isArray(successorData)) {
            successorCandidates = successorData;
            console.log('📦 Extracted array of successors:', successorCandidates.length);
          } else if (successorData.successor_candidates) {
            // Handle snake_case property
            successorCandidates = Array.isArray(successorData.successor_candidates) 
              ? successorData.successor_candidates 
              : [successorData.successor_candidates];
            console.log('📦 Extracted from successor_candidates:', successorCandidates.length);
          } else if (successorData.successorCandidates) {
            // Handle camelCase property
            successorCandidates = Array.isArray(successorData.successorCandidates) 
              ? successorData.successorCandidates 
              : [successorData.successorCandidates];
            console.log('📦 Extracted from successorCandidates:', successorCandidates.length);
          } else if (successorData.candidate_email || successorData.candidateEmail) {
            successorCandidates = [successorData];
            console.log('📦 Extracted single successor from object');
          } else {
            console.log('⚠️ No recognizable successor data structure in employee.successorAnalysisData');
            console.log('Available keys:', Object.keys(successorData));
          }
        } catch (parseError) {
          console.error('❌ Error parsing successorAnalysisData:', parseError);
        }
      } else if (!apiSuccess) {
        console.log('⚠️ No API success and no employee.successorAnalysisData to fall back to');
      }
      
      // Final cleanup and validation
      if (!Array.isArray(successorCandidates)) {
        console.warn('⚠️ successorCandidates is not an array, converting to empty array');
        successorCandidates = [];
      }
      
      console.log('🎯 Final successor candidates:', JSON.stringify(successorCandidates, null, 2));
      setSuccessors(successorCandidates);
      console.log('=== END fetchSuccessors ===');
    } catch (error) {
      console.error('Error fetching successors:', error);
      // Fallback to data directly from employee object
      if (employee.successorAnalysisData && employee.successorAnalysisData.successor_candidates) {
        setSuccessors(employee.successorAnalysisData.successor_candidates);
      } else {
        setSuccessors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects data for employee
  const fetchEmployeeProjects = async (email: string) => {
    try {
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
      } else if (employee.projects && Array.isArray(employee.projects)) {
        // Fallback to data directly from employee object
        setProjects(employee.projects);
      } else {
        console.warn('No projects found in response');
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Fallback to data directly from employee object
      if (employee.projects && Array.isArray(employee.projects)) {
        setProjects(employee.projects);
      } else {
        setProjects([]);
      }
    }
  };

  // Handle duty changes
  const handleDutyChange = (index: number, field: string, value: any) => {
    const updatedDuties = [...editedDuties];
    updatedDuties[index] = { ...updatedDuties[index], [field]: value };
    setEditedDuties(updatedDuties);
    
    // Recalculate scores in real-time
    const updatedEmployee = {
      ...employee,
      jobDuties: updatedDuties
    };
    calculateScores(updatedEmployee);
  };

  // Add a new duty
  const addDuty = () => {
    const newDuty = { 
      duty: '', 
      description: '', 
      hours: '0',
      tools: ''
    };
    setEditedDuties([...editedDuties, newDuty]);
  };

  // Remove a duty
  const removeDuty = (index: number) => {
    const updatedDuties = editedDuties.filter((_, i) => i !== index);
    setEditedDuties(updatedDuties);
    
    // Recalculate scores
    const updatedEmployee = {
      ...employee,
      jobDuties: updatedDuties
    };
    calculateScores(updatedEmployee);
  };

  // Save edited duties
  const saveDuties = () => {
    setJobDuties(editedDuties);
    setIsEditingDuties(false);
    
    // Update employee data if callback provided
    if (onUpdateEmployee) {
      onUpdateEmployee({
        ...employee,
        jobDuties: editedDuties,
        calculatedUtilization: {
          score: calculatedScores.utilization.score,
          category: calculatedScores.utilization.status
        },
        calculatedAttritionRisk: calculatedScores.attrition.risk
      });
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditedDuties(JSON.parse(JSON.stringify(jobDuties))); // Reset to original
    setIsEditingDuties(false);
    calculateScores(employee); // Reset scores
  };

  // Get utilization from various possible sources in the data
  const getUtilizationScore = () => {
    if (employee?.utilization?.score !== undefined) return employee.utilization.score;
    if (employee?.utilization_score !== undefined) return employee.utilization_score;
    if (employee?.utilizationAssessment?.utilization_score !== undefined) return employee.utilizationAssessment.utilization_score;
    return null;
  };

  // Get attrition risk from various possible sources in the data
  const getAttritionRisk = () => {
    if (employee?.attritionRisk) return employee.attritionRisk;
    if (employee?.attritionAssessment?.attrition_risk) return employee.attritionAssessment.attrition_risk;
    return 'unknown';
  };

  // Display projects from any available source
  const displayProjects = projects.length > 0 
    ? projects 
    : (employee.projects || []);

  // Helper function to calculate metrics from duties
  const calculateMetricsFromDuties = (duties: Array<{duty: string, hours: number, tools?: string}>) => {
    // Create a temporary employee object with the updated duties for calculation
    const tempEmployee = {
      ...employee,
      jobDuties: duties,
      jobResponsibilities: duties // Ensure both fields are updated
    };
    
    try {
      // Calculate utilization score
      const utilResult = calculateUtilizationScore(tempEmployee);
      const attrResult = calculateAttritionScore(tempEmployee);
      
      console.log('Calculated new metrics from duties:', {
        utilization: utilResult.score,
        attrition: attrResult.risk,
        duties: duties.length
      });
      
      return {
        calculatedUtilization: {
          score: utilResult.score,
          category: getUtilizationCategory(utilResult.score)
        },
        calculatedAttritionRisk: attrResult.risk
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return {
        calculatedUtilization: {
          score: 0.5,
          category: 'medium'
        },
        calculatedAttritionRisk: 'medium'
      };
    }
  };

  // Get utilization category
  const getUtilizationCategory = (score: number) => {
    if (score > 1.1) return 'Overloaded';
    if (score > 0.9) return 'Optimal';
    return 'Capacity available';
  };

  // Function to add a new job duty
  const handleAddDuty = () => {
    if (!newDuty.duty || newDuty.hours <= 0) return;
    
    const updatedDuties = [...jobDuties, newDuty];
    setJobDuties(updatedDuties);
    setNewDuty({ duty: '', hours: 0, tools: '' });
    
    // Calculate new metrics based on updated duties
    const updatedEmployeeData = calculateMetricsFromDuties(updatedDuties);
    
    // Update employee with new duties and metrics
    if (employee && onUpdateEmployee) {
      onUpdateEmployee({
        ...employee,
        ...updatedEmployeeData,
        jobResponsibilities: updatedDuties,
        jobDuties: updatedDuties
      });
    }
  };

  // Function to remove a job duty
  const handleRemoveDuty = (index: number) => {
    const updatedDuties = jobDuties.filter((_, i) => i !== index);
    setJobDuties(updatedDuties);
    
    // Calculate new metrics based on updated duties
    const updatedEmployeeData = calculateMetricsFromDuties(updatedDuties);
    
    // Update employee with new duties and metrics
    if (employee && onUpdateEmployee) {
      onUpdateEmployee({
        ...employee,
        ...updatedEmployeeData,
        jobResponsibilities: updatedDuties,
        jobDuties: updatedDuties
      });
    }
  };

  // Function to update a job duty
  const handleUpdateDuty = (index: number, field: string, value: string | number) => {
    const updatedDuties = [...jobDuties];
    updatedDuties[index] = {
      ...updatedDuties[index],
      [field]: value
    };
    setJobDuties(updatedDuties);
    
    // Calculate new metrics based on updated duties
    const updatedEmployeeData = calculateMetricsFromDuties(updatedDuties);
    
    // Update employee with new duties and metrics
    if (employee && onUpdateEmployee) {
      onUpdateEmployee({
        ...employee,
        ...updatedEmployeeData,
        jobResponsibilities: updatedDuties,
        jobDuties: updatedDuties
      });
    }
  };

  if (!employee) return null;

  return (
    <div className="h-full flex flex-col overflow-auto p-6 bg-white shadow-lg rounded-l-lg text-black">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h2>
        <div className="flex items-center space-x-2">
          {employee.isDeleted && onUndoDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndoDelete}
              className="text-purple-600 hover:bg-purple-50 flex items-center gap-1"
              title="Restore employee"
            >
              <FaUndo className="w-3 h-3" />
              Restore
            </Button>
          )}
          {!employee.isDeleted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(employee.email)}
              className="text-red-600 hover:bg-red-50"
              title="Remove employee"
            >
              <FaTrash className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-black"
          >
            <FaTimes className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Job Title */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">{employee.jobTitle || 'Employee'}</h3>
        <div className="flex items-center mt-1">
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            {employee.department || 'Unassigned'}
          </Badge>
          
          {employee.email && (
            <span className="ml-2 text-sm text-black">{employee.email}</span>
          )}
          
          {employee.isDeleted && (
            <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-200">
              Deleted
            </Badge>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex">
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'info'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('info')}
          >
            Details 
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'metrics'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'projects'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'feedback'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'duties'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('duties')}
          >
            Job Duties 
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="space-y-8">
          {/* Key Performance Indicators */}
          
          
          {/* Employee Details */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-black">Email</p>
                <p className="text-black">{employee.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-black">Phone</p>
                <p className="text-black">{employee.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="h-px w-full bg-gray-200 my-4"></div>
          
          {/* Employment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-black">Department</p>
                <p className="text-black">{employee.department || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-sm text-black">Reports To</p>
                <p className="text-black">
                  {(() => {
                    const managerUsername = employee.reportsTo;
                    console.log('Manager username from reportsTo:', managerUsername);
                    
                    if (!managerUsername) {
                      console.log('No manager username found');
                      return 'No Manager';
                    }
                    
                    try {
                      console.log('Available nodes:', nodes);
                      
                      // Find the manager in the nodes
                      const managerNode = nodes.find((node: any) => {
                        if (!node || !node.data) return false;
                        
                        const nodeData = node.data;
                        const nodeUsername = nodeData.username || 
                                         (nodeData.email ? nodeData.email.split('@')[0] : '');
                        
                        const matches = nodeUsername === managerUsername || 
                                     nodeData.email === managerUsername ||
                                     node.id === managerUsername;
                        
                        console.log('Checking node:', {
                          nodeId: node.id,
                          nodeUsername,
                          nodeEmail: nodeData.email,
                          matches
                        });
                        
                        return matches;
                      });
                      
                      console.log('Found manager node:', managerNode);
                      
                      // If we found the manager, get their full name
                      if (managerNode && managerNode.data) {
                        const nodeData = managerNode.data;
                        const fullName = [nodeData.firstName, nodeData.lastName].filter(Boolean).join(' ');
                        
                        console.log('Manager node data:', nodeData);
                        
                        if (fullName) {
                          return `${fullName} (${managerUsername})`;
                        }
                      }
                      
                      // If we couldn't find the manager or their name, just return the username
                      return managerUsername;
                      
                    } catch (error) {
                      console.error('Error looking up manager:', error);
                      return managerUsername;
                    }
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-black">Salary</p>
                <p className="text-black">
                  {employee.salary ? `$${employee.salary.toLocaleString()}` : 'N/A'}
                  {employee.previousSalary !== undefined && employee.salary !== employee.previousSalary && (
                    <span className={`ml-2 text-sm ${employee.salary > (employee.previousSalary || 0) ? 'text-green-600' : 'text-red-600'}`}>
                      {employee.salary > (employee.previousSalary || 0) ? '↑' : '↓'} 
                      ${Math.abs(employee.salary - (employee.previousSalary || 0)).toLocaleString()}
                      {employee.previousSalary ? ` (${((Math.abs(employee.salary - employee.previousSalary) / employee.previousSalary) * 100).toFixed(1)}%)` : ''}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-black">Tenure</p>
                <p className="text-black">
                  {employee.totalduration ? `${employee.totalduration} ` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-black">Current Role Duration</p>
                <p className="text-black">
                  {employee.currentroleduration ? `${employee.currentroleduration} ` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="h-px w-full bg-gray-200 my-4"></div>
          
          {/* Successor Analysis */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Successor Analysis</h3>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                <span className="ml-2 text-sm text-gray-600">Loading successors...</span>
              </div>
            ) : successors && successors.length > 0 ? (
              <div className="space-y-2">
                {successors.map((successor, index) => {
                  const name = successor.candidate_name || successor.name || 'Unknown';
                  const email = successor.candidate_email || successor.email || 'No email';
                  const score = successor.successor_score !== undefined 
                    ? (successor.successor_score * 100).toFixed(0) + '%'
                    : 'N/A';
                  const viability = (successor.viability || 'non_viable').toLowerCase();
                  
                  return (
                    <div key={`${email}-${index}`} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{name}</p>
                          <p className="text-xs text-gray-500">{email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              viability === 'viable' || viability === 'high' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {viability.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-medium">
                            {score}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-black italic text-sm">No potential successors identified</p>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold mb-4">Projects</h3>
          {displayProjects.length > 0 ? (
            <div className="space-y-3">
              {displayProjects.map((project: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="font-medium text-gray-800">{project.project_title || project.title || project.name}</p>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="text-xs mr-2">
                      {project.project_status || project.status || 'Active'}
                    </Badge>
                    <span className="text-xs text-black">
                      {project.user_contribution?.hours_per_week 
                        ? `${project.user_contribution.hours_per_week} hrs/week` 
                        : project.hours_per_week
                        ? `${project.hours_per_week} hrs/week`
                        : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {project.project_description || project.description || 'No description available'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-black italic text-sm">No projects assigned</p>
          )}
        </div>
      )}
      
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Feedback Summary</h3>
          
          {/* Feedback Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feedback Given */}
            <Card className="bg-white shadow-sm flex flex-col">
              <CardContent className="p-4 flex-grow flex flex-col">
                <h4 className="text-md font-medium mb-2">Feedback Given</h4>
                {employee.feedbackMetrics?.given ? (
                  <div className="space-y-2 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Count:</span>
                        <span className="font-medium">{employee.feedbackMetrics.given.count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Rating:</span>
                        <span className="font-medium">{(employee.feedbackMetrics.given.averageRating || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-auto pt-2">
                      <Progress 
                        value={(employee.feedbackMetrics.given.averageRating || 0) * 20} 
                        className="h-2 mt-1" 
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No feedback given data available</p>
                )}
              </CardContent>
            </Card>
            
            {/* Feedback Received */}
            <Card className="bg-white shadow-sm flex flex-col">
              <CardContent className="p-4 flex-grow flex flex-col">
                <h4 className="text-md font-medium mb-2">Feedback Received</h4>
                {employee.feedbackMetrics?.received ? (
                  <div className="space-y-2 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Count:</span>
                        <span className="font-medium">{employee.feedbackMetrics.received.count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Rating:</span>
                        <span className="font-medium">{(employee.feedbackMetrics.received.averageRating || 0).toFixed(2)}</span>
                      </div>
                      {employee.feedbackMetrics.received.weightedAverageRating !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Weighted Average:</span>
                          <span className="font-medium">{(employee.feedbackMetrics.received.weightedAverageRating || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-auto pt-2">
                      <Progress 
                        value={(employee.feedbackMetrics.received.averageRating || 0) * 20} 
                        className="h-2 mt-1" 
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No feedback received data available</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Skills Feedback Section - Received Only */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-semibold">Skills Feedback</h4>
              {isLoadingSkills && (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                  Loading...
                </div>
              )}
            </div>
            
            {skillsError ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{skillsError}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Card className="bg-white shadow-sm">
                <CardContent className="p-4">
                  {skillsFeedback?.received?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsFeedback.received.map((skill, index) => (
                        <Badge key={index} className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      {isLoadingSkills ? 'Loading...' : 'No skills mentioned in feedback'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Quarterly Feedback */}
          {employee.quarterlyReceived && Object.keys(employee.quarterlyReceived).length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">Quarterly Feedback Received</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(employee.quarterlyReceived).map(([quarter, data]: [string, any]) => (
                      <tr key={quarter}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{quarter}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.count || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{(data.averageRating || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Quarterly Feedback Given */}
          {employee.quarterlyGiven && Object.keys(employee.quarterlyGiven).length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">Quarterly Feedback Given</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(employee.quarterlyGiven).map(([quarter, data]: [string, any]) => (
                      <tr key={quarter}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{quarter}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.count || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{(data.averageRating || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Collaboration Analysis */}
          {employee.collaboration_analysis && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">Collaboration Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Collaboration Score:</span>
                  <span className="font-medium">{(employee.collaboration_analysis.collaboration_score || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Feedback Activity:</span>
                  <span className="font-medium">{(employee.collaboration_analysis.feedback_activity_score || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Feedback Quality:</span>
                  <span className="font-medium">{(employee.collaboration_analysis.feedback_quality_score || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'duties' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-medium mb-3">Job Duties</h3>
            
            {/* Real-time metrics summary */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-blue-50 p-3 rounded-md">
              <div>
                <div className="text-sm font-medium">Raw Utilization</div>
                <div className="text-xl font-bold">
                  {employee.calculatedUtilization?.score !== undefined 
                    ? `${Math.round(employee.calculatedUtilization.score * 100)}%` 
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Raw Attrition Risk</div>
                <div className="text-xl font-bold">
                  {employee.calculatedAttritionRisk 
                    ? employee.calculatedAttritionRisk.charAt(0).toUpperCase() + employee.calculatedAttritionRisk.slice(1)
                    : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* List of current duties */}
            {jobDuties.length > 0 ? (
              <div className="space-y-3 mb-4">
                {jobDuties.map((duty, index) => (
                  <div key={index} className="flex items-start border p-2 rounded-md bg-gray-50">
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-16">Duty:</span>
                        <input
                          type="text"
                          value={duty.duty}
                          onChange={(e) => handleUpdateDuty(index, 'duty', e.target.value)}
                          className="flex-grow border rounded-md px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-16">Hours:</span>
                        <input
                          type="number"
                          value={duty.hours}
                          onChange={(e) => handleUpdateDuty(index, 'hours', parseInt(e.target.value) || 0)}
                          className="w-20 border rounded-md px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-16">Tools:</span>
                        <input
                          type="text"
                          value={duty.tools || ''}
                          onChange={(e) => handleUpdateDuty(index, 'tools', e.target.value)}
                          className="flex-grow border rounded-md px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveDuty(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No job duties defined yet. Add some below.
              </div>
            )}
            
            {/* Add new duty form */}
            <div className="border p-3 rounded-md bg-blue-50">
              <h4 className="text-sm font-medium mb-2">Add New Duty</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-sm font-medium w-16">Duty:</span>
                  <input
                    type="text"
                    value={newDuty.duty}
                    onChange={(e) => setNewDuty({...newDuty, duty: e.target.value})}
                    className="flex-grow border rounded-md px-2 py-1 text-sm"
                    placeholder="e.g., Manage client meetings"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium w-16">Hours:</span>
                  <input
                    type="number"
                    value={newDuty.hours}
                    onChange={(e) => setNewDuty({...newDuty, hours: parseInt(e.target.value) || 0})}
                    className="w-20 border rounded-md px-2 py-1 text-sm"
                    placeholder="10"
                  />
                  <span className="ml-2 text-xs text-gray-500">hours per week</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium w-16">Tools:</span>
                  <input
                    type="text"
                    value={newDuty.tools}
                    onChange={(e) => setNewDuty({...newDuty, tools: e.target.value})}
                    className="flex-grow border rounded-md px-2 py-1 text-sm"
                    placeholder="e.g., Zoom, Excel"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button 
                    size="sm"
                    onClick={handleAddDuty}
                    disabled={!newDuty.duty || newDuty.hours <= 0}
                  >
                    Add Duty
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Metrics impact */}
            
          </div>
        </div>
      )}
      
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Comprehensive Utilization */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Database className="h-4 w-4 mr-1 text-blue-500" />
                  Comp. Utilization
                </h4>
                <div className="text-2xl font-bold">
                  {employee.utilization?.score !== undefined 
                    ? `${Math.round(employee.utilization.score * 100)}%` 
                    : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  {employee.utilization?.score !== undefined 
                    ? getUtilizationCategory(employee.utilization.score) 
                    : 'Not available'}
                </div>
                <Progress 
                  value={employee.utilization?.score !== undefined ? employee.utilization.score * 100 : 0} 
                  className="h-2" 
                />
                <div className="text-xs text-gray-500 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  <span>Pre-loaded from database analysis</span>
                </div>
              </div>
              
              {/* Raw Utilization */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Calculator className="h-4 w-4 mr-1 text-green-500" />
                  Raw Utilization
                </h4>
                <div className="text-2xl font-bold">
                  {employee.calculatedUtilization?.score !== undefined 
                    ? `${Math.round(employee.calculatedUtilization.score * 100)}%` 
                    : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  {employee.calculatedUtilization?.score !== undefined 
                    ? getUtilizationCategory(employee.calculatedUtilization.score) 
                    : 'Not available'}
                </div>
                <Progress 
                  value={employee.calculatedUtilization?.score !== undefined ? employee.calculatedUtilization.score * 100 : 0} 
                  className="h-2" 
                />
                <div className="text-xs text-gray-500 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  <span>Calculated in real-time from job duties</span>
                </div>
              </div>
              
              {/* Comprehensive Attrition Risk */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
                  Comp. Attrition Risk
                </h4>
                <div className="text-2xl font-bold">
                  {employee.attritionRisk 
                    ? employee.attritionRisk.charAt(0).toUpperCase() + employee.attritionRisk.slice(1)
                    : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  {employee.attritionRisk === 'high' 
                    ? 'High risk of turnover'
                    : employee.attritionRisk === 'medium'
                    ? 'Moderate risk of turnover'
                    : 'Low risk of turnover'}
                </div>
                <Progress 
                  value={employee.attritionRisk === 'high' ? 90 : employee.attritionRisk === 'medium' ? 50 : 20} 
                  className={`h-2 ${
                    employee.attritionRisk === 'high' ? 'bg-red-500' : 
                    employee.attritionRisk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                />
                <div className="text-xs text-gray-500 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  <span>Pre-loaded from database analysis</span>
                </div>
              </div>
              
              {/* Raw Attrition Risk */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
                  Raw Attrition Risk
                </h4>
                <div className="text-2xl font-bold">
                  {employee.calculatedAttritionRisk 
                    ? employee.calculatedAttritionRisk.charAt(0).toUpperCase() + employee.calculatedAttritionRisk.slice(1)
                    : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  {employee.calculatedAttritionRisk === 'high' 
                    ? 'High risk of turnover'
                    : employee.calculatedAttritionRisk === 'medium'
                    ? 'Moderate risk of turnover'
                    : 'Low risk of turnover'}
                </div>
                <Progress 
                  value={employee.calculatedAttritionRisk === 'high' ? 90 : employee.calculatedAttritionRisk === 'medium' ? 50 : 20} 
                  className={`h-2 ${
                    employee.calculatedAttritionRisk === 'high' ? 'bg-red-500' : 
                    employee.calculatedAttritionRisk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                />
                <div className="text-xs text-gray-500 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  <span>Calculated in real-time from job duties</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
