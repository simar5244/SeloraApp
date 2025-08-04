'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiClock, FiLogOut } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { initializeFirstTimeVisitTracking } from '@/utils/tutorialSettings';
import { FaSpinner } from 'react-icons/fa';
export default function PendingApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    // Check if user is already active
    const token = localStorage.getItem('token');
    if (token) {
      // Force a fresh check, bypassing cache
      console.log('Checking user status with token...');
      fetch('/api/auth/check-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      })
        .then(async res => {
          // Check content type to avoid parsing HTML as JSON
          const contentType = res.headers.get("content-type");
          if (!res.ok || !contentType || !contentType.includes("application/json")) {
            console.log(`Status check returned ${res.status}, content-type: ${contentType}`);
            return { success: false, status: "unknown" };
          }
          try {
            return await res.json();
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return { success: false, status: "unknown" };
          }
        })
        .then(data => {
          console.log('User status check result:', data);
          setLoading(false);
          
          if (data && data.success) {
            // Update the stored user data with latest status
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
              setUser(data.user);
            }
            
            // If active, redirect to dashboard with full page reload
            if (data.status === 'active') {
              console.log('User is active, redirecting to dashboard');

              // Initialize first-time visit tracking for new account
              if (data.user && data.user.createdAt) {
                initializeFirstTimeVisitTracking(data.user.createdAt);
                console.log('Initialized first-time visit tracking for new account');
              }

              window.location.href = '/dashboard';
              return;
            }
            
            // If still pending, stay on this page but update user data
            console.log('User status is:', data.status);
          }
        })
        .catch(err => {
          console.error('Error checking user status:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [router]);
  
  const handleCheckStatus = async () => {
    try {
      // Set the last checked timestamp and show spinner
      setLastChecked(Date.now());
      setIsRefreshing(true);
      
      // Force a fresh check, bypassing cache
      console.log('Checking user status with token...');
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/auth/check-status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, max-age=0',
            'Pragma': 'no-cache'
          }
        })
          .then(async res => {
            // Check content type to avoid parsing HTML as JSON
            const contentType = res.headers.get("content-type");
            if (!res.ok || !contentType || !contentType.includes("application/json")) {
              console.log(`Status check returned ${res.status}, content-type: ${contentType}`);
              return { success: false, status: "unknown" };
            }
            try {
              return await res.json();
            } catch (parseError) {
              console.error("JSON parse error:", parseError);
              return { success: false, status: "unknown" };
            }
          })
          .then(data => {
            console.log('User status check result:', data);
            setLoading(false);
            
            if (data && data.success) {
              // Update the stored user data with latest status
              if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
              }
              
              // If active, redirect to dashboard with full page reload
              if (data.status === 'active') {
                console.log('User is active, redirecting to dashboard');

                // Initialize first-time visit tracking for new account
                if (data.user && data.user.createdAt) {
                  initializeFirstTimeVisitTracking(data.user.createdAt);
                  console.log('Initialized first-time visit tracking for new account');
                }

                window.location.href = '/dashboard';
                return;
              }
              
              // If still pending, stay on this page but update user data
              console.log('User status is:', data.status);
            }
          })
          .catch(err => {
            console.error('Error checking user status:', err);
            setLoading(false);
          })
          .finally(() => {
            setIsRefreshing(false);
          });
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Also clear cookie for API routes
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Force redirect to login page with page reload
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="p-10 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-800 mb-4">Account Pending Approval</h1>
          
          <div className="flex justify-center mb-6">
            <div className="rounded-full  p-4">
              <FiClock className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          
          <p className="text-gray-600 text-lg font-light mb-6">
            Your account is currently awaiting administrator approval.
          </p>
          
          {user && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h2 className="text-xl font-light mb-4 text-gray-700">Your Account Information</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  <span className="font-light inline-block w-24">Username:</span> {user.username}
                </p>
                <p className="text-gray-700">
                  <span className="font-light inline-block w-24">Email:</span> {user.email}
                </p>
                <p className="text-gray-700">
                  <span className="font-light inline-block w-24">Company:</span> {user.company}
                </p>
                
                <p className="text-gray-700">
                  <span className="font-light inline-block w-24">Status:</span> 
                  <span className={user.status === 'active' ? 'text-green-600 font-light' : 'text-yellow-600 font-light'}>
                    {user.status?.toUpperCase() || 'PENDING'}
                  </span>
                </p>
              </div>
            </div>
          )}
          

          
          <p className="text-gray-600 font-light mb-6">
            Please check back later or contact your administrator to expedite the approval process.
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleCheckStatus}
            className="py-3 px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md font-light flex items-center justify-center gap-2"
            variant="ghost"
          >
            {isRefreshing ? <FaSpinner className="animate-spin" /> : <FiClock />}
            {isRefreshing ? 'Checking...' : 'Refresh Status'}
          </Button>
          
          <Button
            onClick={handleLogout}
            className="py-3 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-md font-light flex items-center justify-center gap-2"
            variant="ghost"
          >
            <FiLogOut />
            Log Out
          </Button>
        </div>
        

      </div>
    </div>
  );
} 

