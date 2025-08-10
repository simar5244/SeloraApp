"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import { areChecklistEnabledSync, onChecklistSettingChange } from "@/utils/tutorialSettings";

interface AdminChecklistProps {
  // Optional: allow passing pre-fetched stats; component can also fetch what's missing
  totalEmployees?: number;
  activeProjects?: number;
  currentUser?: any;
}

export const ADMIN_CHECKLIST_KEY = 'selora_admin_checklist';

export default function AdminChecklist({ totalEmployees, activeProjects, currentUser }: AdminChecklistProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [checklistEnabled, setChecklistEnabled] = useState(true);
  const [goalsExist, setGoalsExist] = useState<boolean | null>(null);
  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  const [employeesCount, setEmployeesCount] = useState<number | null>(null);
  const [feedbackGivenCount, setFeedbackGivenCount] = useState<number>(0);

  // Show only on admin main dashboard page
  const isOnAdminDashboard = pathname === "/dashboard";

  useEffect(() => {
    // derive feedback given count from local user cache if available
    try {
      const u = currentUser ?? JSON.parse(localStorage.getItem("user") || "null");
      const given = u?.feedbackMetrics?.given?.count ?? 0;
      setFeedbackGivenCount(typeof given === "number" ? given : 0);
    } catch {}
  }, [currentUser]);

  // Fetch lightweight existence/counts we can't reliably get elsewhere
  useEffect(() => {
    let isMounted = true;

    const fetchGoalsExist = async () => {
      try {
        const token = localStorage.getItem("token");
        // Attempt a tiny goals query; treat any non-empty data as existence
        const res = await fetch(`/api/goals?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("goals fetch failed");
        const data = await res.json();
        if (!isMounted) return;
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.goals) ? data.goals : []);
        setGoalsExist((arr?.length ?? 0) > 0);
      } catch {
        // fallback to false (show task until user creates a goal)
        if (isMounted) setGoalsExist(false);
      }
    };

    const fetchProjectsCount = async () => {
      // Prefer prop if provided by dashboard stats
      if (typeof activeProjects === "number") {
        setProjectsCount(activeProjects);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/projects?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("projects fetch failed");
        const data = await res.json();
        if (!isMounted) return;
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.projects) ? data.projects : []);
        setProjectsCount(arr?.length ?? 0);
      } catch {
        if (isMounted) setProjectsCount(0);
      }
    };

    const fetchEmployeesCount = async () => {
      // Prefer prop if provided by dashboard stats
      if (typeof totalEmployees === "number") {
        setEmployeesCount(totalEmployees);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/admin/users?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("users fetch failed");
        const data = await res.json();
        if (!isMounted) return;
        const arr = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : []);
        // We only fetched limit=1; if any user exists beyond self, we'll detect via length when needed
        // But we need absolute count: try "total" if present, else fallback to localStorage cached stats
        const total = typeof data?.total === "number" ? data.total : (arr?.length ?? 1);
        setEmployeesCount(total);
      } catch {
        if (isMounted) setEmployeesCount(totalEmployees ?? 1);
      }
    };

    // Fire only on admin dashboard
    if (isOnAdminDashboard) {
      fetchGoalsExist();
      fetchProjectsCount();
      fetchEmployeesCount();
    }

    return () => {
      isMounted = false;
    };
  }, [isOnAdminDashboard, activeProjects, totalEmployees]);

  const items = useMemo(() => {
    // Step 1: Complete onboarding – already done when reaching dashboard (mark completed)
    const step1Completed = true;

    // Step 2: Onboard your team – show until employees > 1
    const teamComplete = (employeesCount ?? totalEmployees ?? 0) > 1;

    // Step 3: Create your first project – complete when projects >= 1
    const hasProjects = (projectsCount ?? activeProjects ?? 0) >= 1;

    // Step 4: Create your first goal – complete when any goal exists
    const hasGoal = !!goalsExist;

    // Step 5: Give your first feedback – complete when feedback given >= 1
    const hasGivenFeedback = (feedbackGivenCount ?? 0) >= 1;

    return [
      {
        key: "onboarding",
        title: "Complete onboarding",
        description: "You've completed your personal onboarding.",
        href: "/onboarding",
        completed: step1Completed,
        // locked: true, // informational only
      },
      {
        key: "team",
        title: "Onboard your team",
        description: "Invite teammates to start collaborating.",
        href: "/dashboard/invite",
        completed: teamComplete,
      },
      {
        key: "project",
        title: "Create your first project",
        description: "Set up your first project to organize work.",
        href: "/dashboard/projects/onboarding",
        completed: hasProjects,
      },
      {
        key: "goal",
        title: "Create your first goal",
        description: "Define a goal to align your team.",
        href: "/dashboard/goals/onboarding",
        completed: hasGoal,
      },
      {
        key: "feedback",
        title: "Give your first feedback",
        description: "Share constructive feedback with a teammate.",
        href: "/dashboard/feedback",
        completed: hasGivenFeedback,
      },
    ];
  }, [employeesCount, totalEmployees, projectsCount, activeProjects, goalsExist, feedbackGivenCount]);

  // Progress (include all 5 steps for display: onboarding + 4 trackable)
  const totalSteps = items.length; // should be 5
  const completedTotal = items.filter((i) => i.completed).length;
  const progressAll = totalSteps > 0 ? completedTotal / totalSteps : 0;
  const progressDeg = Math.max(0, Math.min(360, Math.round(progressAll * 360)));

  // Mirror decoupled checklist visibility mechanics (Profile page toggle)
  useEffect(() => {
    // initial read
    setChecklistEnabled(areChecklistEnabledSync());
    // subscribe to changes (cross-tab)
    const unsubscribe = onChecklistSettingChange((enabled) => setChecklistEnabled(enabled));
    return unsubscribe;
  }, []);

  // Hide entirely if not admin dashboard, checklist disabled, or everything done
  if (!isOnAdminDashboard || !checklistEnabled) return null;
  if (completedTotal === totalSteps) return null;

  return (
    <div className="fixed top-6 right-6 z-[101]">
      {/* Bubble trigger (Stripe-like) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group relative flex items-center space-x-2 rounded-full bg-white/90 backdrop-blur px-3 py-2 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
          aria-label="Open admin checklist"
        >
          {/* Compact circular progress ring */}
          <div
            className="relative h-8 w-8 rounded-full p-[2px]"
            style={{
              background: `conic-gradient(#8b5cf6 ${progressDeg}deg, #e5e7eb 0deg)`
            }}
            aria-hidden
          >
            <div className="absolute inset-[2px] rounded-full bg-white flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-purple-600" />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-900">{completedTotal} of {totalSteps} steps</span>
          {/* subtle cue only */}
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition" />

          {/* Tooltip */}
          <div className="absolute -bottom-8 right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Open checklist
          </div>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="w-[320px] rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/70 backdrop-blur">
            <div>
              <div className="text-sm font-semibold text-gray-900">Getting started checklist</div>
              <div className="text-xs text-gray-500">{completedTotal} of {totalSteps} steps completed</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.key} className="">
                  <Link href={item.href} className="group flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50">
                    <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${item.completed ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                      {item.completed ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gray-300 block" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${item.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>{item.title}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 text-gray-300 group-hover:text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
