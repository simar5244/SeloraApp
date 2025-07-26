'use client';

import React, { useState, useEffect } from 'react';
import { FiUser, FiEdit, FiTrash2, FiSearch, FiPlus, FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  company?: string;
  companyCode?: string;
  status?: 'active' | 'inactive' | 'pending' ;
  createdAt: string;
}

interface UserManagementProps {
  currentUser: any;
  onEditUser: (user: User) => void;
}

export default function UserManagement({ currentUser, onEditUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Removed inline error/success states in favor of toast notifications
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Fetch users when component mounts or filters change
  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      // Reset to first page when filters change
      setCurrentPage(1);
    }
  }, [currentUser, searchTerm, roleFilter, statusFilter]);

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    // EXCLUDE pending users - they should only appear in manage signups tab
    if (user.status === 'pending') {
      return false;
    }

    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    const isIncluded = matchesSearch && matchesRole && matchesStatus;

    // Debug log for admin users
    if (user.role === 'admin') {
      console.log('Admin user:', user, {
        matchesSearch,
        matchesRole,
        matchesStatus,
        roleFilter,
        statusFilter,
        isIncluded
      });
    }

    return isIncluded;
  });
  
  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Debug logs
  console.log('All users:', users);
  console.log('Filtered users:', filteredUsers);
  console.log('Current page:', currentPage, 'of', totalPages);
  console.log('Showing users:', indexOfFirstUser + 1, 'to', Math.min(indexOfLastUser, filteredUsers.length));

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users?limit=0', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }
      
      // Handle different response formats
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    const token = localStorage.getItem('token');
    
    // First try bulk delete
    let deletePromise = fetch('/api/admin/users', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userIds: [user._id]
      })
    });
    
    toast.promise(
      deletePromise.then(async (response) => {
        // If bulk delete fails, try individual delete
        if (!response.ok) {
          return fetch(`/api/admin/users/${user._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
        return response;
      }),
      {
        loading: 'Deleting user...',
        success: async (response) => {
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete user');
          }
          await fetchUsers();
          return `User ${user.username} has been deleted.`;
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          return err instanceof Error ? err.message : 'An error occurred while deleting the user';
        },
      }
    );
  };

  // Helper function to get appropriate badge class for role
  const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'top_management_tier_1':
      case 'top_management_tier_2':
      case 'top_management_tier_3':
        return 'bg-blue-100 text-blue-800';
      case 'employee_tier_1':
      case 'employee_tier_2':
      case 'employee_tier_3':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get appropriate status badge class
  const getStatusClass = (status?: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'inactive':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium';
      default:
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium';
    }
  };

  // Helper function to display role in a more readable format
  const displayRole = (role: string): string => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'top_management_tier_1': return 'Management Tier 1';
      case 'top_management_tier_2': return 'Management Tier 2';
      case 'top_management_tier_3': return 'Management Tier 3';
      case 'employee_tier_1': return 'Employee Tier 1';
      case 'employee_tier_2': return 'Employee Tier 2';
      case 'employee_tier_3': return 'Employee Tier 3';
      default: return role;
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4" data-tour="user-list">
        <div className="relative w-full md:w-[60%]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 w-full rounded-lg border-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto" data-tour="role-management">
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value)}>
            <SelectTrigger className="min-w-[150px] bg-white rounded-lg text-black border border-gray-300 [&>span]:text-black focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-purple-500">
              <span className="block truncate">
                {roleFilter === 'all' ? 'All Roles' : 
                 roleFilter === 'admin' ? 'Admin' :
                 roleFilter === 'top_management_tier_1' ? 'Management Tier 1' :
                 roleFilter === 'top_management_tier_2' ? 'Management Tier 2' :
                 roleFilter === 'top_management_tier_3' ? 'Management Tier 3' :
                 roleFilter === 'employee_tier_1' ? 'Employee Tier 1' :
                 roleFilter === 'employee_tier_2' ? 'Employee Tier 2' :
                 roleFilter === 'employee_tier_3' ? 'Employee Tier 3' : 'All Roles'}
              </span>
            </SelectTrigger>
            <SelectContent className="bg-white text-black [&>div]:text-black">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="top_management_tier_1">Management Tier 1</SelectItem>
              <SelectItem value="top_management_tier_2">Management Tier 2</SelectItem>
              <SelectItem value="top_management_tier_3">Management Tier 3</SelectItem>
              <SelectItem value="employee_tier_1">Employee Tier 1</SelectItem>
              <SelectItem value="employee_tier_2">Employee Tier 2</SelectItem>
              <SelectItem value="employee_tier_3">Employee Tier 3</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger className="min-w-[150px] bg-white rounded-lg text-black border border-gray-300 [&>span]:text-black focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-purple-500">
              <span className="block truncate">
                {statusFilter === 'all' ? 'All Status' :
                 statusFilter === 'active' ? 'Active' :
                 statusFilter === 'inactive' ? 'Inactive' : 'All Status'}
              </span>
            </SelectTrigger>
            <SelectContent className="bg-white text-black [&>div]:text-black">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              {/* Removed pending option - pending users only show in manage signups tab */}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Error and success messages are now handled by toast notifications */}
      
      <div className="min-w-[800px] bg-white text-black shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="w-full">
          <table className="w-full text-sm text-left min-w-full">
            <thead className="text-xs uppercase bg-purple-100">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600 rounded-tl-lg">USER</th>
                <th className="px-6 py-3 font-semibold text-gray-600">EMAIL</th>
                <th className="px-6 py-3 font-semibold text-gray-600">ROLE</th>
                <th className="px-6 py-3 font-semibold text-gray-600">STATUS</th>
                <th className="px-6 py-3 font-semibold text-gray-600 rounded-tr-lg">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex justify-center">
                      <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user._id} className="bg-white text-black border-b hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <FiUser className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.username}
                        </div>
                        <div className="text-gray-500">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`${getRoleBadgeClass(user.role)} px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
                        {displayRole(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusClass(user.status)}>
                        {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4" data-tour="user-actions">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => onEditUser(user)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-700 hover:bg-purple-100 hover:text-purple-700 rounded-lg"
                        >
                          <FiEdit className="h-4 w-4" />
                          <span className="ml-1">Edit</span>
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-700 hover:bg-red-100 hover:text-red-700 rounded-lg"
                        >
                          <FiTrash2 className="h-4 w-4" />
                          <span className="ml-1">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > usersPerPage && (
          <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastUser, filteredUsers.length)}
              </span>{' '}
              of <span className="font-medium">{filteredUsers.length}</span> users
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show page numbers around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className={currentPage === pageNum ? 'bg-purple-600 text-white' : ''}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 