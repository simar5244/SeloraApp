"use client";

// Goal Creation Wizard Page – replicates Onboarding UI but collects goal data
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import { addNewGoal } from "../api";

// Helper interfaces (trimmed from AddGoalModal)
interface EmployeeEditor {
  name: string;
  email: string;
  department?: string;
  role?: string;
  tasks?: string;
  hours?: string;
  toolsUsed?: string;
}

interface ProjectEditor {
  projectId: string;
  title: string;
  description?: string;
  isNewProject: boolean;
}

interface ViewerEditor {
  name: string;
  email: string;
}

interface WizardData {
  title: string;
  description: string;
  department: string;
  status: "planning" | "active" | "completed" | "canceled" | "on-hold";
  priority: "low" | "medium" | "high" | "critical";
  startDate: string;
  endDate: string;
  employees: EmployeeEditor[];
  viewers: ViewerEditor[];
  visibleToAll: boolean;
  projects: ProjectEditor[];
}

// Wave background copied from onboarding page
const WaveBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
    >
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
            "M0,400 Q300,320 600,400 T1200,400 L1200,800 L0,800 Z",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Wave 2 */}
      <motion.path
        d="M0,450 Q400,370 800,450 T1200,450 L1200,800 L0,800 Z"
        fill="url(#waveGrad2)"
        animate={{
          d: [
            "M0,450 Q400,370 800,450 T1200,450 L1200,800 L0,800 Z",
            "M0,490 Q400,410 800,490 T1200,490 L1200,800 L0,800 Z",
            "M0,450 Q400,370 800,450 T1200,450 L1200,800 L0,800 Z",
          ],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
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
            "M0,500 Q200,420 400,500 T800,500 T1200,500 L1200,800 L0,800 Z",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </svg>
  </div>
);

export default function GoalWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data state
  const [formData, setFormData] = useState<WizardData>({
    title: "",
    description: "",
    department: "",
    status: "planning",
    priority: "medium",
    startDate: "",
    endDate: "",
    employees: [],
    viewers: [],
    visibleToAll: true,
    projects: [],
  });

  // On mount – permission check identical to create page
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const currentUser = JSON.parse(storedUser);
        const canCreate = [
          "admin",
          "top_management_tier_1",
          "top_management_tier_2",
          "top_management_tier_3",
        ].includes(currentUser.role || "");
        if (!canCreate) {
          toast.error("You do not have permission to create goals");
          router.push("/dashboard/goals");
          return;
        }
        setHasPermission(true);
      } catch (e) {
        console.error("Failed to parse user data:", e);
        toast.error("Authentication error");
        router.push("/dashboard/goals");
        return;
      }
    } else {
      toast.error("User not found");
      router.push("/dashboard/goals");
      return;
    }
    setLoading(false);
  }, [router]);

  /* ---------------- Form helpers -------------- */
  const updateField = (field: keyof WizardData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addProject = (project: ProjectEditor) => {
    setFormData((prev) => {
      if (prev.projects.find((p) => p.projectId === project.projectId)) return prev;
      return { ...prev, projects: [...prev.projects, project] };
    });
  };

  const removeProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.projectId !== projectId),
    }));
  };

  const addEmployee = (emp: EmployeeEditor) => {
    setFormData((prev) => {
      if (prev.employees.find((e) => e.email === emp.email)) return prev;
      return { ...prev, employees: [...prev.employees, emp] };
    });
  };
  const removeEmployee = (email: string) =>
    setFormData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.email !== email),
    }));

  const addViewer = (viewer: ViewerEditor) => {
    setFormData((prev) => {
      if (prev.viewers.find((v) => v.email === viewer.email)) return prev;
      return { ...prev, viewers: [...prev.viewers, viewer] };
    });
  };
  const removeViewer = (email: string) =>
    setFormData((prev) => ({
      ...prev,
      viewers: prev.viewers.filter((v) => v.email !== email),
    }));

  /* ------------ Navigation ------------- */
  const totalSteps = 6;
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() && formData.description.trim() && formData.department.trim() && formData.startDate;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  /* --------------- Submission --------------- */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        department: formData.department,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        employees: formData.employees,
        viewers: formData.viewers,
        visibleToAll: formData.visibleToAll,
        assignedProjects: formData.projects.map((p) => ({ projectId: p.projectId })),
        kpis: [],
      };
      const result = await addNewGoal(payload);
      if (result.success && result.goalId) {
        toast.success("Goal created successfully!");
        router.push(`/dashboard/goals/${result.goalId}`);
      } 
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------- Search helpers (minimal) -------- */
  const [projectSearchResults, setProjectSearchResults] = useState<any[]>([]);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);

  const searchProjects = async (term: string) => {
    if (!term.trim()) {
      setProjectSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/projects?search=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjectSearchResults(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const searchEmployees = async (term: string) => {
    if (!term.trim()) {
      setEmployeeSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users?search=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeSearchResults(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* --------------- Step content --------------- */
  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Goal Basics</h2>
            <div className="space-y-4 text-left">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Quarterly Sales Growth"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Increase sales revenue by 15% in Q4 by expanding customer base"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => updateField("department", e.target.value)}
                    placeholder="Sales"
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => updateField("priority", val as any)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "low",
                        "medium",
                        "high",
                        "critical",
                      ].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => updateField("status", val as any)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "planning",
                        "active",
                        "completed",
                        "canceled",
                        "on-hold",
                      ].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="text-left space-y-4">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Assign Projects</h2>
            {/* Search bar */}
            <Input
              placeholder="Search existing projects"
              onChange={(e) => searchProjects(e.target.value)}
            />
            {/* Search results list */}
            {projectSearchResults.length > 0 && (
              <Card className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {projectSearchResults.map((proj) => (
                  <div
                    key={proj.id || proj._id}
                    className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-2 rounded-md"
                  >
                    <span className="text-sm font-medium">
                      {proj.title || proj.project_title}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        addProject({
                          projectId: proj.id || proj._id,
                          title: proj.title || proj.project_title,
                          description: proj.description || proj.project_description,
                          isNewProject: false,
                        })
                      }
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </Card>
            )}
            {/* Selected projects */}
            {formData.projects.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Selected Projects</h3>
                {formData.projects.map((p) => (
                  <div
                    key={p.projectId}
                    className="flex justify-between items-center bg-purple-50 p-2 rounded-md"
                  >
                    <span>{p.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeProject(p.projectId)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="text-left space-y-4">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Assign Team Members</h2>
            <Input
              placeholder="Search employees by name or email"
              onChange={(e) => searchEmployees(e.target.value)}
            />
            {employeeSearchResults.length > 0 && (
              <Card className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {employeeSearchResults.map((emp: any) => (
                  <div
                    key={emp.id || emp._id}
                    className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-2 rounded-md"
                  >
                    <span className="text-sm font-medium">
                      {emp.name || `${emp.firstName} ${emp.lastName}`}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        addEmployee({
                          name: emp.name || `${emp.firstName} ${emp.lastName}`,
                          email: emp.email,
                          department: emp.department || "",
                          role: emp.role || "Team Member",
                        })
                      }
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </Card>
            )}

            {formData.employees.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Assigned Members</h3>
                {formData.employees.map((e) => (
                  <div
                    key={e.email}
                    className="flex justify-between items-center bg-purple-50 p-2 rounded-md"
                  >
                    <span>{e.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEmployee(e.email)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="text-left space-y-4">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Add Viewers</h2>
            <Input
              placeholder="Enter email and press +"
              onKeyDown={(e: any) => {
                if (e.key === "Enter") {
                  const email = e.target.value.trim();
                  if (email) {
                    addViewer({ name: email.split("@")[0], email });
                    e.target.value = "";
                  }
                }
              }}
            />
            {formData.viewers.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Viewers</h3>
                {formData.viewers.map((v) => (
                  <div
                    key={v.email}
                    className="flex justify-between items-center bg-purple-50 p-2 rounded-md"
                  >
                    <span>{v.email}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeViewer(v.email)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="text-left space-y-6">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Visibility & Settings</h2>
            <div className="flex items-center space-x-3">
              <input
                id="visibleToAll"
                type="checkbox"
                checked={formData.visibleToAll}
                onChange={(e) => updateField("visibleToAll", e.target.checked)}
              />
              <Label htmlFor="visibleToAll">Visible to entire organization</Label>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="text-left space-y-4">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Check className="text-green-600" /> Review & Submit
            </h2>
            <Card className="p-6 space-y-2 text-sm">
              <p>
                <strong>Title:</strong> {formData.title}
              </p>
              <p>
                <strong>Description:</strong> {formData.description}
              </p>
              <p>
                <strong>Department:</strong> {formData.department}
              </p>
              <p>
                <strong>Dates:</strong> {formData.startDate} → {formData.endDate || "N/A"}
              </p>
              <p>
                <strong>Projects:</strong> {formData.projects.length}
              </p>
              <p>
                <strong>Members:</strong> {formData.employees.length}
              </p>
              <p>
                <strong>Viewers:</strong> {formData.viewers.length}
              </p>
              <p>
                <strong>Visible To All:</strong> {formData.visibleToAll ? "Yes" : "No"}
              </p>
            </Card>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  /* -------------------------- RENDER --------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }
  if (!hasPermission) return null;

  return (
    <>
      <WaveBackground />
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
                {currentStep > 1 && currentStep < totalSteps + 1 && (
                  <button
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="text-black hover:text-gray-700 font-medium flex items-center transition-all disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1 rotate-180" /> Back
                  </button>
                )}

                {currentStep < totalSteps && (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center transition-all disabled:opacity-50"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
