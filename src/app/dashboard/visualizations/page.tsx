'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { FaProjectDiagram, FaStar, FaSitemap, FaBullseye } from 'react-icons/fa'; // Added FaBullseye icon
import { VisualizationTourLauncher } from '@/components/tour/VisualizationTourLauncher';

export default function VisualizationsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-full">
      {/* Simple Background Pattern */}
      <div 
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Content overlaid on background */}
      <div className="relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="text-purple-700">Organization</span> Visualizations
          </h1>
          <p className="text-lg text-gray-600">
            Explore different ways to view your organizational structure and data.
          </p>
        </div>



        <div className="flex flex-col md:flex-row gap-8 justify-center items-center max-w-3xl mx-auto">
          {/* Org Chart Box */}
          <Card className="w-80 hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm border-purple-200 text-center" data-tour="org-chart-card">
            <CardHeader className="bg-purple-50/50">
              <CardTitle className="flex items-center justify-center gap-2 text-purple-800">
                <FaSitemap/>
                Standard Org Chart
              </CardTitle>
              <CardDescription className="text-purple-600 text-center">
                Interactive hierarchical view
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-700 mb-4 text-center">
                View the organization chart with reporting lines, departments, and workload indicators.
              </p>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push('/dashboard/org-chart')}
              >
                Open Full View
              </Button>
            </CardContent>
          </Card>

          {/* 3D Galaxy Box */}
          <Card className="w-80 hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm border-purple-200 text-center" data-tour="galaxy-view-card">
            <CardHeader className="bg-purple-50/50">
              <CardTitle className="flex items-center justify-center gap-2 text-purple-800">
                <FaStar />
                3D Galaxy View
              </CardTitle>
              <CardDescription className="text-purple-600 text-center">
                Immersive network visualization
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-700 mb-4 text-center">
                Explore organizational connections and data relationships in an immersive 3D space.
              </p>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push('/dashboard/galaxy-view')} 
              >
                Open 3D View
              </Button>
            </CardContent>
          </Card>

        </div>
        
        {/* Objective Visualization Box - Centered in row below */}
        <div className="mt-8 flex justify-center">
          <Card className="w-80 hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm border-purple-200 text-center" data-tour="objective-visualization-card">
            <CardHeader className="bg-purple-50/50">
              <CardTitle className="flex items-center justify-center gap-2 text-purple-800">
                <FaBullseye />
                Strategic Objectives
              </CardTitle>
              <CardDescription className="text-purple-600 text-center">
                KPI and project visualization
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-700 mb-4 text-center">
                Visualize strategic objectives, KPIs, projects, and employees contributing to company goals.
              </p>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push('/dashboard/objective-visualization')} 
              >
                Open Objectives View
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <VisualizationTourLauncher />
    </div>
  );
}