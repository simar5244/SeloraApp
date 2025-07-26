'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { FaSearch, FaStar, FaChartLine, FaUsers, FaLightbulb, FaRegLightbulb, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import FeedbackTour from '@/components/tour/FeedbackTour';

type Feedback = {
  id: string;
  title: string;
  description: string;
  rating: number;
  category: string;
  date: string;
  status: 'new' | 'in-progress' | 'resolved';
  votes: number;
};

const FeedbackPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);

  // Sample feedback data
  useEffect(() => {
    const sampleFeedback: Feedback[] = [
      {
        id: '1',
        title: 'Improve project management tools',
        description: 'The current project management interface could be more intuitive with better visualization of task dependencies.',
        rating: 4,
        category: 'feature-request',
        date: '2025-07-20',
        status: 'in-progress',
        votes: 24
      },
      {
        id: '2',
        title: 'Performance issues on dashboard',
        description: 'The dashboard becomes very slow when loading multiple data visualizations.',
        rating: 2,
        category: 'bug',
        date: '2025-07-18',
        status: 'new',
        votes: 15
      },
      {
        id: '3',
        title: 'Add dark mode',
        description: 'A dark mode would be great for reducing eye strain during evening work.',
        rating: 5,
        category: 'feature-request',
        date: '2025-07-15',
        status: 'new',
        votes: 42
      },
      {
        id: '4',
        title: 'Export reports to PDF',
        description: 'Ability to export reports directly to PDF format would save a lot of time.',
        rating: 4,
        category: 'enhancement',
        date: '2025-07-10',
        status: 'resolved',
        votes: 31
      },
    ];
    setFeedbackList(sampleFeedback);
  }, []);

  const filteredFeedback = feedbackList.filter(feedback => {
    const matchesSearch = feedback.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || feedback.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-gray-300" />);
      }
    }
    
    return <div className="flex space-x-1">{stars}</div>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">New</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Portal</h1>
          <p className="text-gray-600">Share your thoughts and help us improve</p>
        </div>
        <Button 
          onClick={() => setIsTourOpen(true)}
          variant="outline"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200"
          data-tour="feedback-tour-button"
        >
          <FaLightbulb className="text-yellow-500" />
          Take Feedback Tour
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-sm hover:shadow-md transition-shadow" data-tour="feedback-stats">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{feedbackList.length}</div>
            <p className="text-sm text-gray-500 mt-1">Suggestions and issues</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-3xl font-bold mr-2">
                {(feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / feedbackList.length).toFixed(1)}
              </span>
              <div className="flex">
                {renderStars(feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / feedbackList.length)}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Out of 5 stars</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {feedbackList.filter(f => f.status === 'in-progress').length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Being worked on</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {feedbackList.filter(f => f.status === 'resolved').length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Completed feedback</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8" data-tour="feedback-filters">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Feedback Items</CardTitle>
              <CardDescription>
                Share your ideas and report issues to help us improve
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search feedback..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="feature-request">Feature Requests</TabsTrigger>
              <TabsTrigger value="bug">Bugs</TabsTrigger>
              <TabsTrigger value="enhancement">Enhancements</TabsTrigger>
            </TabsList>
            
            <div className="mt-6 space-y-4" data-tour="feedback-items">
              {filteredFeedback.length > 0 ? (
                filteredFeedback.map((feedback) => (
                  <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-lg">{feedback.title}</h3>
                            {getStatusBadge(feedback.status)}
                          </div>
                          <p className="text-gray-600 mb-3">{feedback.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FaStar className="text-yellow-400" />
                              {feedback.rating}/5
                            </span>
                            <span>•</span>
                            <span>{new Date(feedback.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="capitalize">{feedback.category.replace('-', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" data-tour="feedback-actions">
                          <Button variant="outline" size="sm" className="gap-1">
                            <span>▲</span>
                            <span>{feedback.votes}</span>
                          </Button>
                          <Button variant="outline" size="sm">
                            Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <FaRegLightbulb className="mx-auto text-4xl text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No feedback found</h3>
                  <p className="text-gray-500 mt-1">
                    {searchQuery 
                      ? 'Try adjusting your search or filter to find what you\'re looking for.'
                      : 'Be the first to share your feedback!'}
                  </p>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <FeedbackTour open={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </div>
  );
};

export default FeedbackPage;
