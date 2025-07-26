/**
 * Organizational Chart Layout Utilities
 * 
 * This file contains utilities for automatically laying out nodes in an organizational chart.
 * We use a custom hierarchical layout algorithm to position nodes based on their reporting relationships.
 */

import type { Node, Edge } from 'reactflow';

// Constants for layout calculations
const LEVEL_HEIGHT = 300;  // Increased from 220 (was 180)
const NODE_WIDTH = 240;    // Increased from 200
const NODE_PADDING = 100;  // Increased from 60
const HORIZONTAL_GAP = 80; // New constant for horizontal spacing

// Interface for node data
interface OrgNode {
  id: string;
  position: { x: number; y: number };
  [key: string]: any;
}

// Interface for edge data
interface OrgEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: any;
}

/**
 * Applies a hierarchical layout to organization chart nodes
 * 
 * @param nodes The nodes to layout
 * @param edges The connections between nodes
 * @returns Nodes with updated positions based on hierarchy
 */
export function applyHierarchicalLayout(nodes: OrgNode[], edges: OrgEdge[]): OrgNode[] {
  if (!nodes.length) return [];
  
  // Build the graph structure from edges
  const graph: Record<string, string[]> = {};
  const parentMap: Record<string, string> = {};
  const nodeMap: Record<string, OrgNode> = {};
  
  // Initialize graph with all nodes and create node map
  nodes.forEach(node => {
    graph[node.id] = [];
    nodeMap[node.id] = node;
  });
  
  // Fill graph with connections
  edges.forEach(edge => {
    const { source, target } = edge;
    // Add child to parent's list
    if (graph[source]) {
      graph[source].push(target);
    }
    // Track parent for each node
    parentMap[target] = source;
  });
  
  // Find root nodes (nodes without parents)
  const rootNodes = nodes.filter(node => !parentMap[node.id]).map(node => node.id);
  
  // Calculate levels for each node
  const levels: Record<string, number> = {};
  
  // Assign level 0 to root nodes
  rootNodes.forEach(nodeId => {
    levels[nodeId] = 0;
  });
  
  // Do a breadth-first traversal to assign levels to all nodes
  const queue = [...rootNodes];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const children = graph[nodeId] || [];
    
    children.forEach(childId => {
      levels[childId] = levels[nodeId] + 1;
      queue.push(childId);
    });
  }
  
  // Group nodes by level
  const nodesByLevel: Record<number, string[]> = {};
  Object.keys(levels).forEach(nodeId => {
    const level = levels[nodeId];
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(nodeId);
  });
  
  // Get the maximum level
  const maxLevel = Math.max(...Object.keys(nodesByLevel).map(Number));
  
  // Calculate the width of each subtree
  const subtreeWidths: Record<string, number> = {};
  
  // Process from bottom to top
  for (let level = maxLevel; level >= 0; level--) {
    const levelNodes = nodesByLevel[level] || [];
    
    for (const nodeId of levelNodes) {
      const children = graph[nodeId] || [];
      
      if (children.length === 0) {
        // Leaf node has a fixed width
        subtreeWidths[nodeId] = NODE_WIDTH + NODE_PADDING;
      } else {
        // Calculate width as sum of children's widths plus spacing
        const childrenWidth = children.reduce(
          (sum, childId) => sum + (subtreeWidths[childId] || 0), 
          0
        );
        
        // Ensure minimum width for parent nodes
        subtreeWidths[nodeId] = Math.max(
          NODE_WIDTH + NODE_PADDING,
          childrenWidth + (children.length - 1) * HORIZONTAL_GAP
        );
      }
    }
  }
  
  // Position nodes from top to bottom
  const positionedNodes = [...nodes];
  const nodePositions: Record<string, { x: number, y: number }> = {};
  
  // Position root nodes first
  let currentX = 0;
  for (const rootId of rootNodes) {
    const node = nodeMap[rootId];
    nodePositions[rootId] = {
      x: currentX + (subtreeWidths[rootId] / 2) - (NODE_WIDTH / 2),
      y: 0
    };
    currentX += subtreeWidths[rootId] + HORIZONTAL_GAP;
  }
  
  // Position remaining levels
  for (let level = 1; level <= maxLevel; level++) {
    const levelNodes = nodesByLevel[level] || [];
    let currentX = 0;
    
    // Group nodes by parent for positioning
    const nodesByParent: Record<string, string[]> = {};
    for (const nodeId of levelNodes) {
      const parentId = parentMap[nodeId];
      if (!nodesByParent[parentId]) {
        nodesByParent[parentId] = [];
      }
      nodesByParent[parentId].push(nodeId);
    }
    
    // Position nodes under each parent
    for (const [parentId, children] of Object.entries(nodesByParent)) {
      if (!nodePositions[parentId]) continue;
      
      const parentX = nodePositions[parentId].x + (NODE_WIDTH / 2);
      const totalWidth = children.reduce(
        (sum, childId) => sum + (subtreeWidths[childId] || 0) + HORIZONTAL_GAP, 
        -HORIZONTAL_GAP // Remove the last gap
      );
      
      let childX = parentX - (totalWidth / 2);
      
      for (const childId of children) {
        const childWidth = subtreeWidths[childId] || NODE_WIDTH + NODE_PADDING;
        const nodeX = childX + (childWidth / 2) - (NODE_WIDTH / 2);
        
        nodePositions[childId] = {
          x: nodeX,
          y: level * LEVEL_HEIGHT
        };
        
        childX += childWidth + HORIZONTAL_GAP;
      }
    }
  }
  
  // Update node positions
  return positionedNodes.map(node => {
    const position = nodePositions[node.id];
    if (position) {
      return {
        ...node,
        position: {
          x: position.x,
          y: position.y
        },
        style: {
          ...node.style,
          width: NODE_WIDTH,
          height: 'auto'
        }
      };
    }
    return node;
  });
}

/**
 * Adjusts layout to accommodate a newly added node
 */
export function adjustLayoutForNewNode(
  nodes: OrgNode[], 
  edges: OrgEdge[], 
  newNodeId: string
): OrgNode[] {
  // Apply full hierarchical layout since it's simplest for consistent results
  return applyHierarchicalLayout(nodes, edges);
}

/**
 * Handles removing a node by recalculating layout
 */
export function handleNodeRemoval(
  nodes: OrgNode[], 
  edges: OrgEdge[], 
  removedNodeId: string
): OrgNode[] {
  // Filter out the removed node and all its edges
  const updatedNodes = nodes.filter(node => node.id !== removedNodeId);
  const updatedEdges = edges.filter(
    edge => edge.source !== removedNodeId && edge.target !== removedNodeId
  );
  
  // Recalculate layout
  return applyHierarchicalLayout(updatedNodes, updatedEdges);
}

/**
 * Center and optimize the layout to fit the available space better
 */
export function optimizeLayout(nodes: OrgNode[]): OrgNode[] {
  if (nodes.length === 0) return nodes;
  
  // Find the bounds of the layout
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y);
  });
  
  // Calculate the center offset
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Create a new array of nodes with adjusted positions
  return nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x - centerX,
      y: node.position.y - centerY
    }
  }));
};

/**
 * Creates API routes to support the org chart
 * 
 * Implement in /pages/api/organization/hierarchy.js:
 * 
 * ```js
 * import { MongoClient } from 'mongodb';
 * 
 * export default async function handler(req, res) {
 *   if (req.method !== 'GET') {
 *     return res.status(405).json({ message: 'Method not allowed' });
 *   }
 * 
 *   try {
 *     const uri = process.env.MONGODB_URI;
 *     const client = new MongoClient(uri);
 *     
 *     await client.connect();
 *     const db = client.db(process.env.MONGODB_DATABASE || "org_sim_db");
 *     
 *     // Query for all employees
 *     const employees = await db.collection("merged_output").find({}, {
 *       projection: {
 *         _id: 0,
 *         email: 1,
 *         firstName: 1,
 *         lastName: 1,
 *         jobTitle: 1,
 *         department: 1,
 *         avatar: 1,
 *         reportsTo: 1,
 *         attritionAssessment: 1,
 *         workSetting: 1
 *       }
 *     }).toArray();
 *     
 *     await client.close();
 *     
 *     return res.status(200).json(employees);
 *   } catch (error) {
 *     console.error('Error fetching organization data:', error);
 *     return res.status(500).json({ 
 *       message: 'Failed to fetch organization data',
 *       error: error.message
 *     });
 *   }
 * }
 * ```
 * 
 * And in /pages/api/organization/reporting.js:
 * 
 * ```js
 * import { MongoClient } from 'mongodb';
 * 
 * export default async function handler(req, res) {
 *   if (req.method !== 'PUT') {
 *     return res.status(405).json({ message: 'Method not allowed' });
 *   }
 * 
 *   try {
 *     const { employeeEmail, managerEmail } = req.body;
 *     
 *     if (!employeeEmail) {
 *       return res.status(400).json({ message: 'Employee email is required' });
 *     }
 *     
 *     const uri = process.env.MONGODB_URI;
 *     const client = new MongoClient(uri);
 *     
 *     await client.connect();
 *     const db = client.db(process.env.MONGODB_DATABASE || "org_sim_db");
 *     
 *     // Find the manager to get their name
 *     let managerInfo = null;
 *     if (managerEmail) {
 *       const manager = await db.collection("merged_output").findOne(
 *         { email: managerEmail },
 *         { projection: { _id: 0, firstName: 1, lastName: 1 } }
 *       );
 *       
 *       if (manager) {
 *         managerInfo = {
 *           email: managerEmail,
 *           name: `${manager.firstName || ''} ${manager.lastName || ''}`.trim()
 *         };
 *       }
 *     }
 *     
 *     // Update the employee's reportsTo field
 *     await db.collection("merged_output").updateOne(
 *       { email: employeeEmail },
 *       { $set: { reportsTo: managerInfo } }
 *     );
 *     
 *     // Also update in users collection if needed
 *     await db.collection("users").updateOne(
 *       { email: employeeEmail },
 *       { $set: { reportsTo: managerInfo } }
 *     );
 *     
 *     await client.close();
 *     
 *     return res.status(200).json({ 
 *       message: 'Reporting structure updated successfully' 
 *     });
 *   } catch (error) {
 *     console.error('Error updating reporting structure:', error);
 *     return res.status(500).json({ 
 *       message: 'Failed to update reporting structure',
 *       error: error.message
 *     });
 *   }
 * }
 * ```
 */
