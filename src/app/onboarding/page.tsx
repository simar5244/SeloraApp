'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Minus, ArrowRight, ArrowLeft, Check, User, Briefcase, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';



// Flowing wave background
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
    <motion.div
      className="fixed inset-0 bg-white z-50 flex items-center justify-center"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <WaveBackground />
      <div className="text-center relative z-10">
        <motion.h2
          className="text-6xl font-extralight text-gray-800 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Welcome to Selora
        </motion.h2>
        
        {/* Reserve space for subheading with fixed height to prevent layout shift */}
        <div className="h-8"> {/* Fixed height container */}
          <AnimatePresence>
            {showSubheading && (
              <motion.p
                className="text-xl font-light text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Let's get you started
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// Almost there transition
const AlmostThereTransition = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <motion.div
      className="fixed inset-0 bg-white z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <WaveBackground />
      <div className="text-center relative z-10">
        
        
        <motion.h2
          className="text-5xl font-extralight text-gray-800"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Almost there
        </motion.h2>
      </div>
    </motion.div>
  );
};

const workModeOptions = [
  { label: "Remote", value: "Remote" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "In-Office", value: "In-Office" }
];

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

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAlmostThere, setShowAlmostThere] = useState(false);
  const [userName, setUserName] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    jobTitle: '',
    department: '',
    jobDuties: [{ duty: '', hours: 0 }],
    toolsProficient: '',
    salary: '',
    totalduration: '',
    currentroleduration: '',
    workMode: '',
    officeLocation: '',
    industry: '',
    reportsTo: ''
  });

  // Check authentication and pre-populate data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserData(userData);
        setUserName(userData.firstName || 'there');
        
        if (userData.firstName && userData.jobTitle) {
          router.push('/dashboard');
          return;
        }
        
        // Pre-populate existing data
        setFormData(prev => ({
          ...prev,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          username: userData.username || '',
          jobTitle: userData.jobTitle || '',
          department: userData.department || '',
          toolsProficient: userData.toolsProficient || '',
          salary: userData.salary || '',
          totalduration: userData.totalduration || '',
          currentroleduration: userData.currentroleduration || '',
          workMode: userData.workMode || '',
          officeLocation: userData.officeLocation || '',
          industry: userData.industry || '',
          reportsTo: userData.reportsTo || ''
        }));
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUserName('there');
      }
    } else {
      setUserName('there');
    }
  }, [router]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addJobDuty = () => {
    setFormData(prev => ({
      ...prev,
      jobDuties: [...prev.jobDuties, { duty: '', hours: 0 }]
    }));
  };

  const removeJobDuty = (index: number) => {
    if (formData.jobDuties.length > 1) {
      setFormData(prev => ({
        ...prev,
        jobDuties: prev.jobDuties.filter((_, i) => i !== index)
      }));
    }
  };

  const updateJobDuty = (index: number, field: 'duty' | 'hours', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      jobDuties: prev.jobDuties.map((duty, i) => 
        i === index ? { ...duty, [field]: value } : duty
      )
    }));
  };

  const saveBasicInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const username = formData.username.trim() || 
        `${formData.firstName.toLowerCase().replace(/\s+/g, '')}${formData.lastName.toLowerCase().replace(/\s+/g, '')}`;
      
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          username: username,
          role: 'employee'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save basic info' }));
        throw new Error(errorData.message || 'Failed to save basic info');
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('Error saving basic info:', error);
      toast.error('Failed to save basic information');
      return false;
    }
  };

  const saveJobProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const validJobDuties = formData.jobDuties
        .filter(duty => duty.duty.trim() !== '')
        .map(duty => ({
          duty: duty.duty.trim(),
          hours: Number(duty.hours) || 0
        }));
      
      const response = await fetch('/api/profile/job', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobTitle: formData.jobTitle.trim(),
          department: formData.department.trim(),
          jobResponsibilities: validJobDuties,
          toolsProficient: formData.toolsProficient.trim(),
          salary: formData.salary.trim(),
          totalduration: formData.totalduration.trim(),
          currentroleduration: formData.currentroleduration.trim(),
          workMode: formData.workMode,
          officeLocation: formData.officeLocation,
          industry: formData.industry,
          reportsTo: formData.reportsTo.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save job profile' }));
        throw new Error(errorData.message || 'Failed to save job profile');
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('Error saving job profile:', error);
      toast.error('Failed to save job profile');
      return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 4) {
      // Show "almost there" transition before step 5
      setShowAlmostThere(true);
      return;
    }
    
    // Immediately advance to next step for better UX
    setCurrentStep(prev => prev + 1);
    
    // Handle background saving without blocking UI
    if (currentStep === 3) {
      saveBasicInfo().catch(error => {
        toast.error('Failed to save profile information');
        console.error('Error saving basic info:', error);
      });
    } else if (currentStep === 6) {
      saveJobProfile().catch(error => {
        toast.error('Failed to save job information');
        console.error('Error saving job profile:', error);
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleAlmostThereComplete = () => {
    setShowAlmostThere(false);
    setCurrentStep(5);
  };

  const markOnboardingComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          onboarding: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to mark onboarding as complete');
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      return false;
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    const jobProfileSaved = await saveJobProfile();
    if (!jobProfileSaved) {
      setIsLoading(false);
      return;
    }

    const onboardingMarked = await markOnboardingComplete();
    if (!onboardingMarked) {
      setIsLoading(false);
      return;
    }

    localStorage.setItem('tutorialsEnabled', JSON.stringify(true));
    toast.success('Profile completed successfully!');
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName.trim() !== '' && formData.lastName.trim() !== '';
      case 2:
        return formData.jobTitle.trim() !== '' && formData.department.trim() !== '';
      case 3:
        return formData.jobDuties.some(duty => duty.duty.trim() !== '');
      default:
        return true;
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 mt-32">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">Let's start by getting to know you</h2>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-gray-700 font-medium text-sm">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-700 font-medium text-sm">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="w-1/2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium text-sm block text-center">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm text-center"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 mt-32">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">Tell us about your position</h2>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="jobTitle" className="text-gray-700 font-medium text-sm">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => updateFormData('jobTitle', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                  placeholder="Software Engineer"
                />
              </div>
              
              <div>
                <Label htmlFor="department" className="text-gray-700 font-medium text-sm">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => updateFormData('department', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                  placeholder="Engineering"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 mt-32">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">Tell us about your responsibilities</h2>
            </div>
            
            <div className="space-y-4 max-w-lg mx-auto">
              {formData.jobDuties.map((duty, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-gray-700 font-medium text-sm">Duty {index + 1} *</Label>
                    <Input
                      value={duty.duty}
                      onChange={(e) => updateJobDuty(index, 'duty', e.target.value)}
                      placeholder="Develop web applications"
                      className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-gray-700 font-medium text-sm">Hours/week</Label>
                    <Input
                      type="number"
                      value={duty.hours}
                      onChange={(e) => updateJobDuty(index, 'hours', parseInt(e.target.value) || 0)}
                      placeholder="40"
                      className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                    />
                  </div>
                  {formData.jobDuties.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeJobDuty(index)}
                      className="border-gray-300 hover:border-red-300 hover:text-red-600 h-10"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addJobDuty}
                className="w-full border-dashed border-gray-300 hover:border-purple-300 hover:text-purple-600 h-10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Duty
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 mt-32">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">What tools and skills do you use?</h2>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="toolsProficient" className="text-gray-700 font-medium text-sm">Tools & Skills</Label>
                <Textarea
                  id="toolsProficient"
                  value={formData.toolsProficient}
                  onChange={(e) => updateFormData('toolsProficient', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm text-sm"
                  placeholder="React, Node.js, Python, AWS, Figma, etc."
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="salary" className="text-gray-700 font-medium text-sm">Annual Salary (Optional)</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => updateFormData('salary', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                  placeholder="75000"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 mt-32">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">How long have you been working?</h2>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="totalduration" className="text-gray-700 font-medium text-sm">Total Work Experience</Label>
                <Input
                  id="totalduration"
                  value={formData.totalduration}
                  onChange={(e) => updateFormData('totalduration', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                  placeholder="5 years"
                />
              </div>
              
              <div>
                <Label htmlFor="currentroleduration" className="text-gray-700 font-medium text-sm">Time in Current Role</Label>
                <Input
                  id="currentroleduration"
                  value={formData.currentroleduration}
                  onChange={(e) => updateFormData('currentroleduration', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                  placeholder="2 years"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 mt-32 relative">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">Where and how do you work?</h2>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto relative z-10" style={{ minHeight: '300px' }}>
              <div>
                <Label htmlFor="workMode" className="text-gray-700 font-medium text-sm">Work Mode</Label>
                <div className="relative">
                  <select
                    value={formData.workMode}
                    onChange={(e) => updateFormData('workMode', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm pl-3 pr-8 appearance-none"
                  >
                    <option value="">Select work mode</option>
                    {workModeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="officeLocation" className="text-gray-700 font-medium text-sm">Office Location</Label>
                <div className="relative">
                  <select
                    value={formData.officeLocation}
                    onChange={(e) => updateFormData('officeLocation', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm pl-3 pr-8 appearance-none"
                  >
                    <option value="">Select location</option>
                    {officeLocationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="industry" className="text-gray-700 font-medium text-sm">Industry</Label>
                <div className="relative">
                  <select
                    value={formData.industry}
                    onChange={(e) => updateFormData('industry', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm pl-3 pr-8 appearance-none"
                  >
                    <option value="">Select industry</option>
                    {industryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 mt-32">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">Who do you report to? (Your Immediate Supervisor)</h2>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <Label htmlFor="reportsTo" className="text-gray-700 font-medium text-sm">Reports To</Label>
                <Input
                  id="reportsTo"
                  value={formData.reportsTo}
                  onChange={(e) => updateFormData('reportsTo', e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm h-10 text-sm"
                  placeholder="Manager name or email"
                />
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-light text-gray-900 mb-2">You're All Set!</h2>
              <p className="text-gray-600 font-light mb-6">Ready to start your journey with Selora</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2 text-center">Tutorials Enabled</h3>
                <p className="text-gray-600 text-sm mb-3 font-light text-center">
                  We've enabled interactive tutorials to help you get started. You'll see helpful guidance throughout the platform.
                </p>
                <p className="text-xs text-gray-500 font-light text-center">
                  You can disable tutorials anytime from your profile settings.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={handleComplete}
                disabled={isLoading}
                className="w-48 bg-purple-600 hover:bg-purple-700 text-white py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
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
                  {currentStep > 1 && currentStep < 8 && (
                    <button
                      onClick={handleBack}
                      disabled={isLoading}
                      className="text-black hover:text-gray-700 font-medium flex items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1 rotate-180" />
                      Back
                    </button>
                  )}
                  
                  {currentStep < 8 ? (
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
    </>
  );
}