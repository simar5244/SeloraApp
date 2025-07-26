"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { OrgNode } from './OrgSimAIPageContent';

interface OrgChartVisualizationProps {
  data: OrgNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export default function OrgChartVisualization({ 
  data, 
  selectedNodeId, 
  onSelectNode 
}: OrgChartVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Set dimensions and margins
    const margin = { top: 40, right: 20, bottom: 40, left: 20 };
    const width = containerWidth - margin.left - margin.right;
    
    // Create SVG canvas
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight);
    
    // Create a group for the chart
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create d3 hierarchy
    const root = d3.hierarchy<OrgNode>(data);
    
    // Spacing configuration
    const levelHeight = 180;  // Increased vertical space between levels
    const nodeWidth = 200;    // Wider nodes for better text fit
    const nodeHeight = 100;   // Taller nodes
    const horizontalSpacing = 250; // Fixed space between sibling nodes
    
    // Calculate tree layout manually with better spacing
    const treeLayout = (node: any, x = 0, y = 0, depth = 0) => {
      // Position the current node
      node.x = x;
      node.y = y + (depth * levelHeight);
      
      // Position children with better spacing
      if (node.children && node.children.length > 0) {
        const totalWidth = (node.children.length - 1) * horizontalSpacing;
        let currentX = x - (totalWidth / 2);
        
        node.children.forEach((child: any, i: number) => {
          treeLayout(child, currentX, y, depth + 1);
          currentX += horizontalSpacing;
        });
      }
    };
    
    // Calculate the layout
    treeLayout(root);
    
    // Calculate the tree dimensions for centering
    const minX = d3.min(root.descendants(), d => d.x) || 0;
    const maxX = d3.max(root.descendants(), d => d.x) || 0;
    const maxDepth = d3.max(root.descendants(), d => d.depth) || 0;
    
    // Calculate required height based on tree depth
    const requiredHeight = (maxDepth + 1) * levelHeight + 100; // Add extra space at bottom
    
    // Update SVG height to fit the tree
    svg.attr("height", Math.max(containerHeight, requiredHeight));
    
    // Center the tree horizontally with some padding
    const xOffset = (width - (maxX - minX + nodeWidth)) / 2 - minX;
    
    // Create links between nodes
    const link = g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d: any) => {
        const sourceX = d.source.x + xOffset + nodeWidth / 2;
        const sourceY = d.source.y + nodeHeight;
        const targetX = d.target.x + xOffset + nodeWidth / 2;
        const targetY = d.target.y;
        
        return `M${sourceX},${sourceY} V${(sourceY + targetY) / 2} H${targetX} V${targetY}`;
      })
      .style("fill", "none")
      .style("stroke", "#94a3b8")
      .style("stroke-width", 1.5);
    
    // Create node groups
    const nodeGroup = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x + xOffset},${d.y})`)
      .style("text-align", "center")
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        event.stopPropagation();
        onSelectNode(d.data.id);
      });
    
    // Add node rectangles
    nodeGroup.append("rect")
      .attr("x", -nodeWidth/2)
      .attr("y", -nodeHeight/2)
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("rx", 8)
      .attr("ry", 8)
      .style("fill", (d: any) => {
        // Colors based on workload
        if (d.data.workload >= 85) return "#fef2f2"; // Light red for high workload
        if (d.data.workload >= 70) return "#fffbeb"; // Light orange for medium-high
        if (d.data.workload <= 40) return "#eff6ff"; // Light blue for low
        return "#f0fdf4"; // Light green for optimal
      })
      .style("stroke", (d: any) => d.data.id === selectedNodeId ? "#3b82f6" : "#e2e8f0")
      .style("stroke-width", (d: any) => d.data.id === selectedNodeId ? 2 : 1)
      .style("filter", (d: any) => d.data.id === selectedNodeId ? "drop-shadow(0 2px 8px rgba(59, 130, 246, 0.3))" : "none");
    
    // Add name text
    nodeGroup.append("text")
      .attr("dy", "-15")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#1e293b")
      .text((d: any) => d.data.name);
      
    // Add role text
    nodeGroup.append("text")
      .attr("dy", "5")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#475569")
      .text((d: any) => d.data.role);
      
    // Add workload indicator
    nodeGroup.append("text")
      .attr("dy", "25")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("fill", (d: any) => {
        if (d.data.workload >= 85) return "#dc2626";
        if (d.data.workload >= 70) return "#ea580c";
        if (d.data.workload <= 40) return "#2563eb";
        return "#059669";
      })
      .text((d: any) => `Workload: ${d.data.workload || 0}%`);
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom as any);
    
    // Add workload text
    nodeGroup.append("text")
      .attr("dy", "25")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("fill", (d: any) => {
        if (d.data.workload >= 85) return "#991b1b"; // Dark red
        if (d.data.workload >= 70) return "#9a3412"; // Dark orange
        if (d.data.workload <= 40) return "#1e40af"; // Dark blue
        return "#047857"; // Dark green
      })
      .text((d: any) => `${d.data.workload}% Workload`);

    // Add click handler to reset selection when clicking outside nodes
    d3.select(svgRef.current).on("click", () => {
      onSelectNode("");
    });
    
  }, [data, selectedNodeId, onSelectNode]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-gray-50">
      <svg 
        ref={svgRef} 
        className="w-full min-h-full" 
        style={{ minWidth: '100%', minHeight: '100%' }}
      />
    </div>
  );
} 