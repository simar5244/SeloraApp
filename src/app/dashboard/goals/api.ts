// Client-side API wrappers for dashboard goals operations

export async function fetchGoals() {
  try {
    console.log('Fetching goals from API...');
    
    // Retrieve auth token
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      console.error('Authentication Error: Missing token. Please login.');
      throw new Error('Authentication Error: Missing token');
    }
    
    // Get current user data to pass as query params
    let queryParams = '';
    let currentUser: any = null;
    
    try {
      // First try to get user from localStorage
      const storedUser = localStorage.getItem('user');
      
      console.log('Stored token exists:', !!storedToken);
      console.log('Stored user exists:', !!storedUser);
      
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
          console.log('Parsed user from localStorage:', 
            currentUser?.email, 
            currentUser?.role, 
            currentUser?.companyCode
          );
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
      
      // Always refresh user data from API to capture any role/companyCode updates
      if (storedToken) {
        console.log('Refreshing user data from API...');
        const userResponse = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          currentUser = userData.user || userData;
          console.log('Refreshed user data:', currentUser);
        } else {
          console.warn('Could not refresh user data:', userResponse.status, userResponse.statusText);
        }
      }
      
      if (currentUser) {
        const params = new URLSearchParams();
        if (currentUser.id) params.append('userId', currentUser.id);
        if (currentUser.email) params.append('userEmail', currentUser.email);
        if (currentUser.role) params.append('userRole', currentUser.role);
        if (currentUser.companyCode) params.append('companyCode', currentUser.companyCode);
        
        // Add company_code as an alias just in case
        if (currentUser.company_code && !currentUser.companyCode) {
          params.append('companyCode', currentUser.company_code);
        }
        
        queryParams = params.toString() ? `?${params.toString()}` : '';
        
        console.log('User data for goals fetch:', 
          currentUser.email, 
          currentUser.role, 
          currentUser.companyCode || currentUser.company_code
        );
        
        // Make sure we have a companyCode
        if (!currentUser.companyCode && !currentUser.company_code) {
          console.error('Missing company code in user data:', currentUser);
          throw new Error('Missing company code in user data');
        }
      } else {
        console.error('No user data available for goals API call');
        throw new Error('Authentication required to view goals');
      }
    } catch (error) {
      console.warn('Could not fetch user data for goals query:', error);
      throw error;
    }
    
    // Make request with user params
    console.log(`Fetching goals with params: ${queryParams}`);
    const res = await fetch(`/api/goals${queryParams}`, { headers: { Authorization: `Bearer ${storedToken}` } });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch goals: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Goals fetched successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in fetchGoals:', error);
    // Return empty array as fallback to prevent UI errors
    return { goals: [], error: error.message };
  }
}

export async function addNewGoal(data: any) {
  try {
    console.log('Adding new goal:', data);
    
    // Get current user information if not provided in data
    let userInfo = {};
    if (!data.creatorEmail || !data.companyCode) {
      try {
        // First try to get user from localStorage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        let currentUser = null;
        
        if (storedUser) {
          try {
            currentUser = JSON.parse(storedUser);
            userInfo = {
              userEmail: currentUser.email,
              userName: currentUser.name,
              userRole: currentUser.role,
              companyCode: currentUser.companyCode || currentUser.company_code
            };
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
        
        // If we didn't get user data from localStorage, fetch from API
        if (!currentUser || !userInfo || !(userInfo as any).companyCode) {
          const userResponse = await fetch('/api/auth/me', {
            headers: storedToken ? {
              'Authorization': `Bearer ${storedToken}`
            } : {}
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Handle both data structures
            const user = userData.user || userData;
            if (user) {
              userInfo = {
                userEmail: user.email,
                userName: user.name,
                userRole: user.role,
                companyCode: user.companyCode || user.company_code
              };
            }
          } else {
            console.error('Failed to fetch user data:', userResponse.status, userResponse.statusText);
            throw new Error('Authentication required to create goals');
          }
        }
        
        // Make sure we have a companyCode
        if (!(userInfo as any).companyCode) {
          console.error('Missing company code in user data:', userInfo);
          throw new Error('Missing company code in user data');
        }
      } catch (err) {
        console.error('Error fetching user data for goal creation:', err);
        throw err;
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (userInfo && (userInfo as any).userEmail) params.append('userEmail', (userInfo as any).userEmail);
    if (userInfo && (userInfo as any).userRole) params.append('userRole', (userInfo as any).userRole);
    if (userInfo && (userInfo as any).companyCode) params.append('companyCode', (userInfo as any).companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals${queryString}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        // Include user info directly in the body as well
        creatorEmail: data.creatorEmail || (userInfo as any).userEmail,
        creatorName: data.creatorName || (userInfo as any).userName,
        creatorRole: data.creatorRole || (userInfo as any).userRole,
        companyCode: data.companyCode || (userInfo as any).companyCode
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to add goal: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    console.log('Goal created successfully:', result);
    
    // Wait a moment to ensure the goal is fully created in the database
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Ensure we return a valid success response with goalId
    return { 
      success: true, 
      goalId: result.goalId || result._id || result.id,
      goal: result.goal // Return the complete goal if available
    };
  } catch (error) {
    console.error('Error in addNewGoal:', error);
    // Return error response instead of throwing
    return { success: false, error };
  }
}

export async function updateGoal(goalId: string, data: any) {
  try {
    console.log('Updating goal:', goalId, data);
    
    // Get current user information
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    let userInfo = {};
    
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        userInfo = {
          userEmail: currentUser.email,
          userName: currentUser.name,
          userRole: currentUser.role,
          companyCode: currentUser.companyCode || currentUser.company_code
        };
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    // If we didn't get user data from localStorage, fetch from API
    if (!currentUser || !(userInfo as any).companyCode) {
      const userResponse = await fetch('/api/auth/me', {
        headers: storedToken ? {
          'Authorization': `Bearer ${storedToken}`
        } : {}
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const user = userData.user || userData;
        if (user) {
          userInfo = {
            userEmail: user.email,
            userName: user.name,
            userRole: user.role,
            companyCode: user.companyCode || user.company_code
          };
        }
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('goalId', goalId);
    if (userInfo && (userInfo as any).userEmail) params.append('userEmail', (userInfo as any).userEmail);
    if (userInfo && (userInfo as any).userRole) params.append('userRole', (userInfo as any).userRole);
    if (userInfo && (userInfo as any).companyCode) params.append('companyCode', (userInfo as any).companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals${queryString}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to update goal: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    console.log('Goal updated successfully:', result);
    
    return { success: true, goalId };
  } catch (error) {
    console.error('Error in updateGoal:', error);
    return { success: false, error };
  }
}

export async function deleteGoal(goalId: string) {
  try {
    console.log('Deleting goal:', goalId);
    
    // Get current user information
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    let userInfo = {};
    
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        userInfo = {
          userEmail: currentUser.email,
          userName: currentUser.name,
          userRole: currentUser.role,
          companyCode: currentUser.companyCode || currentUser.company_code
        };
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    // If we didn't get user data from localStorage, fetch from API
    if (!currentUser || !(userInfo as any).companyCode) {
      const userResponse = await fetch('/api/auth/me', {
        headers: storedToken ? {
          'Authorization': `Bearer ${storedToken}`
        } : {}
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const user = userData.user || userData;
        if (user) {
          userInfo = {
            userEmail: user.email,
            userName: user.name,
            userRole: user.role,
            companyCode: user.companyCode || user.company_code
          };
        }
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('goalId', goalId);
    if (userInfo && (userInfo as any).userEmail) params.append('userEmail', (userInfo as any).userEmail);
    if (userInfo && (userInfo as any).userRole) params.append('userRole', (userInfo as any).userRole);
    if (userInfo && (userInfo as any).companyCode) params.append('companyCode', (userInfo as any).companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals${queryString}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to delete goal: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    console.log('Goal deleted successfully:', result);
    
    return { success: true, goalId };
  } catch (error) {
    console.error('Error in deleteGoal:', error);
    return { success: false, error };
  }
}

// Goal-specific project management functions
export async function fetchGoalProjects(goalId: string) {
  try {
    console.log('Fetching projects for goal:', goalId);
    
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      throw new Error('Authentication required');
    }
    
    // Get user data for params
    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (currentUser?.companyCode) params.append('companyCode', currentUser.companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals/${goalId}/projects${queryString}`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch goal projects: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Goal projects fetched successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in fetchGoalProjects:', error);
    return { projects: [], error: error.message };
  }
}

export async function createProjectInGoal(goalId: string, projectData: any) {
  try {
    console.log('Creating project in goal:', goalId, projectData);
    
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      throw new Error('Authentication required');
    }
    
    // Get user data for params
    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    let userInfo = {};
    
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        userInfo = {
          userEmail: currentUser.email,
          companyCode: currentUser.companyCode || currentUser.company_code
        };
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if ((userInfo as any).userEmail) params.append('userEmail', (userInfo as any).userEmail);
    if ((userInfo as any).companyCode) params.append('companyCode', (userInfo as any).companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals/${goalId}/projects${queryString}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedToken}`
      },
      body: JSON.stringify(projectData),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to create project in goal: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    console.log('Project created in goal successfully:', result);
    
    return { 
      success: true, 
      projectId: result.projectId || result._id || result.id,
      project: result.project
    };
  } catch (error) {
    console.error('Error in createProjectInGoal:', error);
    return { success: false, error };
  }
}

export async function assignProjectToGoal(goalId: string, projectId: string) {
  try {
    console.log('Assigning project to goal:', goalId, projectId);
    
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      throw new Error('Authentication required');
    }
    
    // Get user data for params
    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    let userInfo = {};
    
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        userInfo = {
          userEmail: currentUser.email,
          companyCode: currentUser.companyCode || currentUser.company_code
        };
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if ((userInfo as any).userEmail) params.append('userEmail', (userInfo as any).userEmail);
    if ((userInfo as any).companyCode) params.append('companyCode', (userInfo as any).companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals/${goalId}/projects${queryString}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedToken}`
      },
      body: JSON.stringify({
        action: 'assign_existing',
        projectId
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to assign project to goal: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    console.log('Project assigned to goal successfully:', result);
    
    return { success: true, projectId };
  } catch (error) {
    console.error('Error in assignProjectToGoal:', error);
    return { success: false, error };
  }
}

export async function removeProjectFromGoal(goalId: string, projectId: string) {
  try {
    console.log('Removing project from goal:', goalId, projectId);
    
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      throw new Error('Authentication required');
    }
    
    // Get user data for params
    const storedUser = localStorage.getItem('user');
    let currentUser = null;
    let userInfo = {};
    
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        userInfo = {
          userEmail: currentUser.email,
          companyCode: currentUser.companyCode || currentUser.company_code
        };
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if ((userInfo as any).userEmail) params.append('userEmail', (userInfo as any).userEmail);
    if ((userInfo as any).companyCode) params.append('companyCode', (userInfo as any).companyCode);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/goals/${goalId}/projects${queryString}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${storedToken}`
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to remove project from goal: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    console.log('Project removed from goal successfully:', result);
    
    return { success: true, projectId };
  } catch (error) {
    console.error('Error in removeProjectFromGoal:', error);
    return { success: false, error };
  }
}

// Search users for assignment
export async function searchUsers(term: string) {
  const res = await fetch(`/api/users/search?term=${encodeURIComponent(term)}`);
  if (!res.ok) throw new Error('User search failed');
  return (await res.json()).users || [];
}