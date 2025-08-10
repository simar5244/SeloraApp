'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkUserAuth, handleAuthRedirect } from '@/utils/authUtils';
import { FaSpinner, FaCopy, FaPlus, FaTrash, FaUpload, FaEnvelope } from 'react-icons/fa';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

export default function InvitePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [emails, setEmails] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'bulk' | 'code'>('email');

  // Check user authentication and authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authState = await checkUserAuth(['admin', 'superadmin']);
        if (handleAuthRedirect(router, authState)) {
          return; // Will redirect if not authenticated/authorized
        }
        
        setCurrentUser(authState.user);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setError('Authentication failed. Please try logging in again.');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // Extract emails from CSV (assume first column or single column)
      const csvEmails = lines.map(line => {
        const columns = line.split(',');
        return columns[0].trim().replace(/"/g, ''); // Remove quotes if present
      }).filter(email => email.includes('@')); // Basic email validation

      if (csvEmails.length > 0) {
        setEmails(csvEmails);
      }
    };
    reader.readAsText(file);
  };

  const copyCompanyCode = async () => {
    if (currentUser?.companyCode) {
      try {
        await navigator.clipboard.writeText(currentUser.companyCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy company code:', err);
      }
    }
  };

  const sendInvitations = async () => {
    if (!currentUser) return;

    const validEmails = emails.filter(email => email.trim() && email.includes('@'));
    if (validEmails.length === 0) {
      setError('Please enter at least one valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setShowResults(false);

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          emails: validEmails,
          adminName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email,
          companyCode: currentUser.companyCode,
          organizationName: currentUser.organizationName || 'your organization'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        setShowResults(true);
        // Clear form on success
        setEmails(['']);
      } else {
        setError(data.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      setError('Failed to send invitations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="mb-4">
          <FaSpinner className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 bg-gray-50 min-h-screen">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mt-4">
          <span className="text-purple-700">Invite</span> Your Team
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
          Send invitations to your team members to join your organization on Selora.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <Tabs defaultValue="email" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 gap-2 w-full p-1 bg-purple-100 rounded-xl">
              <TabsTrigger
                value="email"
                className="rounded-lg flex items-center justify-center gap-2 text-black data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                Email
              </TabsTrigger>
              <TabsTrigger
                value="bulk"
                className="rounded-lg flex items-center justify-center gap-2 text-black data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                Bulk CSV
              </TabsTrigger>
              <TabsTrigger
                value="code"
                className="rounded-lg flex items-center justify-center gap-2 text-black data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                Company Code
              </TabsTrigger>
            </TabsList>

            {/* Tab Panels */}
            <TabsContent value="email" className="mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-medium text-gray-800 mb-3">Send Email Invitations</h2>

            {/* Manual Email Entry */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Addresses
              </label>
              <div className="space-y-3">
                {emails.map((email, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {emails.length > 1 && (
                      <button
                        onClick={() => removeEmailField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addEmailField}
                className="mt-3 text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                Add another email
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Send Button */}
            <div className="flex justify-center">
            <button
              onClick={sendInvitations}
              disabled={isSubmitting}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Sending Invitations...
                </>
              ) : (
                <>
                  <FaEnvelope className="w-4 h-4" />
                  Send Invitations
                </>
              )}
            </button>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="bulk" className="mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-medium text-gray-800 mb-3">Bulk Upload</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                You can upload a CSV file with email addresses to invite multiple users at once. Make sure the first column contains their email addresses. We'll send everyone an invitation email automatically.
              </label>
              <div className="mt-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2 w-auto"
                >
                  <FaUpload className="w-4 h-4" />
                  Upload
                </label>
                
              </div>
            </div>

            {/* Preview parsed emails */}
            {emails.length > 0 && emails.some(e => e.trim()) && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-2">Parsed Emails ({emails.filter(e=>e.trim()).length})</h3>
                <div className="max-h-48 overflow-auto border rounded-md p-3 bg-gray-50 text-sm text-gray-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {emails.filter(e=>e.trim()).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            <button
              onClick={sendInvitations}
              disabled={isSubmitting}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 block mx-auto"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Sending Invitations...
                </>
              ) : (
                <>
                  <FaEnvelope className="w-4 h-4" />
                  Send Invitations
                </>
              )}
            </button>
          </div>
            </TabsContent>

            <TabsContent value="code" className="mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-medium text-gray-800 mb-3">Your Company Code</h2>
            <p className="text-gray-600 mb-3 text-sm">
              Share this code with your team members so they can join your organization during signup.
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-3 flex-1">
                <span className="text-lg font-mono font-semibold text-purple-700">
                  {currentUser?.companyCode || 'Loading...'}
                </span>
              </div>
              <button
                onClick={copyCompanyCode}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  copiedCode
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <FaCopy className="w-4 h-4" />
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Paste this code in your company Slack or group chat and ask employees to sign up at Selora.
            </p>
          </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Results Section (global) */}
        {showResults && results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Invitation Results</h2>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  <span className="font-medium">{result.email}</span>
                  <span className="text-sm">
                    {result.success ? '✓ Sent' : `✗ ${result.error || 'Failed'}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Summary:</strong> {results.filter(r => r.success).length} sent, {results.filter(r => !r.success).length} failed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
