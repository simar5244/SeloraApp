'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FaSearch, FaSpinner, FaUserPlus, FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Employee {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  department?: string;
}

interface EmployeeSearchInputProps {
  onEmployeeSelect: (employee: Employee) => void;
  searchFunction: (term: string) => Promise<Employee[]>;
  placeholder?: string;
  label?: string;
  className?: string;
  allowManualEmail?: boolean;
}

export default function EmployeeSearchInput({
  onEmployeeSelect,
  searchFunction,
  placeholder = "Search employees by name or email...",
  label = "Assign Employee",
  className = "",
  allowManualEmail = true
}: EmployeeSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [manualEmailMode, setManualEmailMode] = useState(false);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch(searchTerm);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    setIsSearching(true);
    setManualEmailMode(false);
    try {
      const results = await searchFunction(term);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching employees:', error);
      toast.error('Failed to search employees');
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    onEmployeeSelect(employee);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
    setManualEmailMode(false);
  };

  const handleManualEmailAdd = () => {
    if (!searchTerm || !searchTerm.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    const manualEmployee: Employee = {
      id: `manual_${Date.now()}`,
      email: searchTerm,
      name: searchTerm.split('@')[0],
      role: 'External'
    };

    handleEmployeeSelect(manualEmployee);
  };

  const isValidEmail = (email: string) => {
    return email.includes('@') && email.includes('.');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true);
                }
              }}
              onBlur={() => {
                // Delay hiding results to allow clicking on them
                setTimeout(() => setShowResults(false), 200);
              }}
            />
          </div>
          
          {allowManualEmail && searchTerm && isValidEmail(searchTerm) && searchResults.length === 0 && !isSearching && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualEmailAdd}
              className="flex items-center space-x-1 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <FaEnvelope className="h-3 w-3" />
              <span>Add Email</span>
            </Button>
          )}
        </div>

        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg p-3">
            <div className="flex items-center justify-center space-x-2">
              <FaSpinner className="animate-spin h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">Searching employees...</span>
            </div>
          </div>
        )}

        {/* Search results */}
        {showResults && searchResults.length > 0 && !isSearching && (
          <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b bg-gray-50">
              <p className="text-xs text-gray-600">Click to select an employee:</p>
            </div>
            {searchResults.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleEmployeeSelect(employee)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email.split('@')[0]}
                  </div>
                  <div className="text-sm text-gray-600">{employee.email}</div>
                  {employee.department && (
                    <div className="text-xs text-gray-500">{employee.department}</div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {employee.role || 'Employee'}
                  </Badge>
                  <FaUserPlus className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {showResults && searchResults.length === 0 && !isSearching && searchTerm.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">No employees found matching "{searchTerm}"</p>
              {allowManualEmail && isValidEmail(searchTerm) && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">You can add this email address manually:</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualEmailAdd}
                    className="flex items-center space-x-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <FaEnvelope className="h-3 w-3" />
                    <span>Add {searchTerm}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Start typing to search for employees{allowManualEmail ? ', or enter an email address to add manually' : ''}.
      </p>
    </div>
  );
}
