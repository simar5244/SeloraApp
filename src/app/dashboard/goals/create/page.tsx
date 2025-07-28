"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import AddGoalModal from "../AddGoalModal";
import { addNewGoal } from "../api";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { GoalsTourLauncher } from "@/components/tour/GoalsTourLauncher";

export default function CreateGoalPage() {
  const router = useRouter();
  const [creatingGoal, setCreatingGoal] = useState(false);

  const handleAddGoal = async (goalData: any): Promise<{ success: boolean; error?: string }> => {
    setCreatingGoal(true);
    try {
      console.log("Submitting goal data to API:", goalData);
      const result = await addNewGoal(goalData);
      console.log("Goal creation result:", result);

      if (result.success) {
        // Wait a moment to ensure the goal data is fully processed
        await new Promise(resolve => setTimeout(resolve, 500));
        // Redirect to the specific goal detail page rather than just the goals list
        if (result.goalId) {
          router.push(`/dashboard/goals/${result.goalId}`);
        } else {
          router.push("/dashboard/goals");
        }
      } else {
        toast.error(result.error || "Failed to create goal");
      }
      return result;
    } catch (err: any) {
      console.error("Error adding goal:", err);
      toast.error("An unexpected error occurred");
      return { success: false, error: err.message };
    } finally {
      setCreatingGoal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="h-full overflow-auto">
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Create New Goal</h1>
              <p className="text-gray-500">Fill in the details below to create a new organizational goal.</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <AddGoalModal
                onAddGoal={handleAddGoal}
                onCancel={() => router.push("/dashboard/goals")}
              />
            </div>
          </div>
        </div>
      </div>
      <GoalsTourLauncher />
    </div>
  );
}
