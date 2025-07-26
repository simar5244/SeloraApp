'use client';

import React, { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FaSpinner } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface UserApprovalsProps {
  currentUser: any;
}

export default function UserApprovals({ currentUser }: UserApprovalsProps) {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const companyCode = currentUser?.companyCode;
  const [userLimitInfo, setUserLimitInfo] = useState<{
    count: number;
    userLimit: number;
    planType: string;
    limitReached: boolean;
    remainingSlots: number;
  } | null>(null);

  useEffect(() => {
    if (currentUser?.companyCode) {
      console.log('[USER APPROVALS] Current user company code:', currentUser.companyCode);
      fetchPendingUsers();
      fetchUserCount();
    } else {
      console.error('[USER APPROVALS] No company code found in currentUser:', currentUser);
    }
  }, [currentUser]);

  // Fetch pending users
  const fetchPendingUsers = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      console.log('[USER APPROVALS] Fetching pending users');
      
      const response = await fetch('/api/admin/user-approval', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load pending users');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[USER APPROVALS] Pending users loaded:', data.pendingUsers?.length);
        setPendingUsers(data.pendingUsers || []);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err: any) {
      console.error('[USER APPROVALS] Error loading pending users:', err);
      toast.error(err.message || 'Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user count and subscription limits
  const fetchUserCount = async () => {
    try {
      if (!companyCode) {
        console.error('[USER APPROVALS] No company code available for fetching user count');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      console.log('[USER APPROVALS] Fetching user count for company:', companyCode);
      
      const { data, error } = await apiFetch(`/api/users/count?companyCode=${companyCode}`);
      
      if (error) {
        throw new Error(error);
      }
      console.log('[USER APPROVALS] User count data:', JSON.stringify(data, null, 2));
      
      // Format plan type properly
      const planType = data.subscription?.planType || 'standard';
      const formattedPlanType = data.subscription?.productName || 
        (planType.charAt(0).toUpperCase() + planType.slice(1));
      
      setUserLimitInfo({
        count: data.count,
        userLimit: data.subscription?.userLimit || 100, // Default to 100 for standard plan
        planType: formattedPlanType,
        limitReached: data.limitReached,
        remainingSlots: data.remainingSlots
      });
      
      console.log('[USER APPROVALS] User limit info set:', {
        count: data.count,
        userLimit: data.subscription?.userLimit || 100,
        planType: formattedPlanType,
        limitReached: data.limitReached,
        remainingSlots: data.remainingSlots
      });
    } catch (error) {
      console.error('[USER APPROVALS] Error fetching user count:', error);
    }
  };

  // Function to approve or reject a user
  const handleAction = async (user: any, action: 'approve' | 'reject') => {
    if (!user || (!user._id && !user.id && !user.email)) {
      toast.error('Unable to identify user');
      return;
    }
    
    // Check if user limit is reached before approving
    if (action === 'approve' && userLimitInfo?.limitReached) {
      const errorMsg = `Cannot approve user. Maximum number of active users (${userLimitInfo.userLimit}) reached for ${userLimitInfo.planType} plan. Please upgrade your subscription to add more users.`;
      console.warn('[USER APPROVALS] Cannot approve user - user limit reached:', userLimitInfo);
      toast.error(errorMsg);
      return;
    }
    
    // Use either _id or id, depending on which one exists
    const userId = user._id || user.id;
    setProcessingId(userId);
    
    const actionPromise = (async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        throw new Error('Authentication required');
      }
      
      console.log(`[USER APPROVALS] Sending ${action} request for user:`, {
        userId,
        email: user.email,
        action,
        companyCode: companyCode || currentUser?.companyCode
      });
      
      const response = await fetch('/api/admin/user-approval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          email: user.email, // Include email for backup identification
          action,
          companyCode: companyCode || currentUser?.companyCode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[USER APPROVALS] Error response:', errorData);
        throw new Error(errorData.message || `Failed to ${action} user`);
      }
      
      const data = await response.json();
      console.log('[USER APPROVALS] Action response:', data);
      
      if (!data.success) {
        throw new Error(data.message || `Failed to ${action} user`);
      }
      
      // Remove the user from the list
      setPendingUsers(pendingUsers.filter(u => 
        (u._id !== userId && u.id !== userId) && u.email !== user.email
      ));
      
      // If approving, refresh the user count
      if (action === 'approve') {
        console.log('[USER APPROVALS] Refreshing user count after approval');
        fetchUserCount();
      }
      
      return data;
    })();
    
    // Show toast based on promise state
    toast.promise(actionPromise, {
      loading: `${action === 'approve' ? 'Approving' : 'Rejecting'} user...`,
      success: () => {
        return action === 'approve' 
          ? 'User approved successfully' 
          : 'User rejected and all data removed successfully';
      },
      error: (err) => {
        console.error(`[USER APPROVALS] Error ${action}ing user:`, err);
        return err.message || `Failed to ${action} user`;
      }
    }).finally(() => {
      setProcessingId(null);
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (err) {
      return dateString;
    }
  };

  // Format role for display
  const formatRole = (role: string) => {
    if (!role) return 'User';
    return role.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  };

  // Get user ID for processing
  const getUserId = (user: any) => {
    return user._id || user.id;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Pending User Approval Requests</h2>
            <p className="text-gray-600 mt-1">
              Review and manage new user registration requests for your organization
            </p>
          </div>
        </div>
        
        {/* User Limit Information */}
        {userLimitInfo && (
          <div className={`mb-4 p-3 rounded-md ${userLimitInfo.limitReached ? 'bg-red-100' : 'bg-blue-100'}`}>
            <p className="text-gray-800 font-medium">
              {userLimitInfo.count} / {userLimitInfo.userLimit} active users ({userLimitInfo.planType
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')} Plan)
            </p>
            {userLimitInfo.limitReached ? (
              <p className="text-red-600">
                User limit reached. Please upgrade your subscription to approve more users.
              </p>
            ) : (
              <p className="text-blue-600">
                {userLimitInfo.remainingSlots} {userLimitInfo.remainingSlots === 1 ? 'slot' : 'slots'} remaining
              </p>
            )}
          </div>
        )}
        
        {/* Removed inline error and success messages in favor of toast notifications */}
      </div>
      
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Pending Requests</h3>
          <p className="text-gray-500">
            There are currently no user accounts awaiting approval
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingUsers.map((user) => (
                  <tr key={getUserId(user) || user.email} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="font-medium text-purple-700">
                            {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username || 'No username'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(user, 'approve')}
                          disabled={processingId === getUserId(user) || userLimitInfo?.limitReached}
                          className={`bg-green-600 hover:bg-green-700 text-white ${
                            (processingId === getUserId(user) || userLimitInfo?.limitReached) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {processingId === getUserId(user) ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(user, 'reject')}
                          disabled={processingId === getUserId(user)}
                          className={`bg-red-600 hover:bg-red-700 text-white ${
                            processingId === getUserId(user) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {processingId === getUserId(user) ? 'Processing...' : 'Reject'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}