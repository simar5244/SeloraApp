'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

// Custom styles for the select component
const selectStyles = {
  trigger: 'flex items-center justify-between w-full px-4 py-2 text-sm text-white bg-black border border-gray-700 rounded-md hover:bg-gray-800',
  content: 'z-50 overflow-hidden bg-black border border-gray-700 rounded-md shadow-lg',
  viewport: 'p-1',
  item: 'relative flex items-center px-8 py-2 text-sm text-white rounded cursor-pointer hover:bg-gray-800',
  itemIndicator: 'absolute left-2',
  icon: 'ml-2 w-4 h-4'
};
import { Card, CardContent } from "@/components/ui/card";
import { FaSearch, FaFilter } from 'react-icons/fa';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/visualization/ErrorBoundary';
import { GalaxyViewTourLauncher } from '@/components/tour/GalaxyViewTourLauncher';

// Dynamically import the 3D visualization component to prevent SSR issues
const GalaxyVisualization = dynamic(
  () => import('@/components/visualization/GalaxyVisualization'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading Galaxy Visualization...</div>
      </div>
    )
  }
);

export default function GalaxyPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Include credentials to send auth cookies
        const response = await fetch('/api/galaxy', { credentials: 'same-origin' });
        // Debug: log status and raw text for troubleshooting auth redirect
        const text = await response.text();
        console.log('GalaxyPage fetch status:', response.status, 'response text:', text);
        // If JSON, parse it
        const data = response.headers.get('content-type')?.includes('application/json')
          ? JSON.parse(text)
          : { nodes: [], links: [] };
        console.log('GalaxyPage parsed data:', data);
        if (!response.ok) {
          throw new Error('Failed to fetch galaxy data');
        }
        setGraphData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading galaxy data:', error);
        setError('Failed to load visualization data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Extract unique departments for the filter dropdown
  const departments = React.useMemo(() => {
    if (!graphData.nodes || !graphData.nodes.length) return [];
    
    return Array.from(
      new Set(
        graphData.nodes
          .map((node: any) => node.department)
          .filter(Boolean)
      )
    ).sort();
  }, [graphData.nodes]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Searching is now handled in the visualization component
  };

  // Handle department filter change
  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value === 'all' ? null : value);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={fullScreenRef}
      className="w-full h-screen relative bg-black overflow-hidden"
      data-tour="galaxy-container"
    >
      <div className="absolute top-0 left-0 z-10 p-4 flex flex-col gap-2 w-64 bg-black/50 backdrop-blur-sm rounded-br-lg" data-tour="galaxy-controls">
        <h1 className="text-white text-xl font-bold"> Galaxy View</h1>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2" data-tour="galaxy-search">
          <Input
            type="text"
            placeholder="Search names, emails, roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black text-white border-gray-800 placeholder:text-white"
          />
        </form>
        
        {/* Department filter */}
        <div className="relative w-full" data-tour="galaxy-filters">
          <Select.Root value={selectedDepartment || 'all'} onValueChange={handleDepartmentChange}>
            <Select.Trigger className={selectStyles.trigger}>
              <Select.Value placeholder="All Departments" />
              <Select.Icon className={selectStyles.icon}>
                <ChevronDown className="w-4 h-4" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className={selectStyles.content}>
                <Select.Viewport className={selectStyles.viewport}>
                  <Select.Item value="all" className={selectStyles.item}>
                    <Select.ItemText>All Departments</Select.ItemText>
                    <Select.ItemIndicator className={selectStyles.itemIndicator}>
                      <Check className="w-4 h-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                  
                  {departments.map((dept: string) => (
                    <Select.Item 
                      key={dept} 
                      value={dept}
                      className={selectStyles.item}
                    >
                      <Select.ItemText>{dept}</Select.ItemText>
                      <Select.ItemIndicator className={selectStyles.itemIndicator}>
                        <Check className="w-4 h-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
      
      {/* Main Visualization */}
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-xl">Loading visualization data...</div>
        </div>
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-xl">{error}</div>
        </div>
      ) : (
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-xl">Rendering galaxy...</div>
          </div>
        }>
          <ErrorBoundary>
            <GalaxyVisualization
              graphData={graphData}
              searchTerm={searchTerm}
              selectedDepartment={selectedDepartment}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      <GalaxyViewTourLauncher />
    </div>
  );
}