'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

function ResetPasswordVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Get email from URL parameters
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  // Abstract Connections - Symbolizing interconnected relationships
  const AbstractConnectionsArt = () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <radialGradient id="connectionGradient1" cx="30%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="40%" stopColor="#764ba2" />
          <stop offset="80%" stopColor="#f093fb" />
          <stop offset="100%" stopColor="#fecfef" />
        </radialGradient>
        <radialGradient id="connectionGradient2" cx="70%" cy="60%" r="70%">
          <stop offset="0%" stopColor="#a8edea" />
          <stop offset="50%" stopColor="#fed6e3" />
          <stop offset="100%" stopColor="#d299c2" />
        </radialGradient>
        <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="connectionBlur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>

      {/* Invisible threads of connection - abstract interpretation */}
      <path d="M50,80 Q120,40 200,80 Q280,120 350,80 Q380,100 360,140 Q320,180 280,160 Q200,140 120,180 Q80,200 60,160 Q40,120 50,80 Z"
            fill="url(#connectionGradient1)" opacity="0.3" filter="url(#connectionGlow)">
        <animate attributeName="d" values="M50,80 Q120,40 200,80 Q280,120 350,80 Q380,100 360,140 Q320,180 280,160 Q200,140 120,180 Q80,200 60,160 Q40,120 50,80 Z;
                                           M60,90 Q130,50 210,90 Q290,130 340,90 Q370,110 350,150 Q310,170 290,150 Q210,130 130,170 Q90,190 70,150 Q50,110 60,90 Z;
                                           M55,85 Q125,45 205,85 Q285,125 345,85 Q375,105 355,145 Q315,175 285,155 Q205,135 125,175 Q85,195 65,155 Q45,115 55,85 Z;
                                           M50,80 Q120,40 200,80 Q280,120 350,80 Q380,100 360,140 Q320,180 280,160 Q200,140 120,180 Q80,200 60,160 Q40,120 50,80 Z"
                dur="20s" repeatCount="indefinite"/>
      </path>

      {/* Deeper connection layer */}
      <path d="M100,120 Q160,80 220,120 Q280,160 340,120 Q370,140 350,200 Q310,260 250,220 Q190,180 130,220 Q90,200 110,160 Q130,120 100,120 Z"
            fill="url(#connectionGradient2)" opacity="0.2" filter="url(#connectionGlow)">
        <animate attributeName="d" values="M100,120 Q160,80 220,120 Q280,160 340,120 Q370,140 350,200 Q310,260 250,220 Q190,180 130,220 Q90,200 110,160 Q130,120 100,120 Z;
                                           M110,130 Q170,90 230,130 Q290,170 330,130 Q360,150 340,210 Q300,250 260,210 Q200,170 140,210 Q100,190 120,150 Q140,110 110,130 Z;
                                           M105,125 Q165,85 225,125 Q285,165 335,125 Q365,145 345,205 Q305,255 255,215 Q195,175 135,215 Q95,195 115,155 Q135,115 105,125 Z;
                                           M100,120 Q160,80 220,120 Q280,160 340,120 Q370,140 350,200 Q310,260 250,220 Q190,180 130,220 Q90,200 110,160 Q130,120 100,120 Z"
                dur="25s" repeatCount="indefinite"/>
      </path>

      {/* Abstract connection nodes - not literal but symbolic */}
      <g opacity="0.6">
        <ellipse cx="150" cy="110" rx="20" ry="8" fill="url(#connectionGradient1)" opacity="0.8" filter="url(#connectionBlur)">
          <animate attributeName="ry" values="8;15;8" dur="8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="6s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="280" cy="170" rx="15" ry="12" fill="url(#connectionGradient2)" opacity="0.7" filter="url(#connectionBlur)">
          <animate attributeName="rx" values="15;25;15" dur="10s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="7s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="200" cy="200" rx="18" ry="10" fill="url(#connectionGradient1)" opacity="0.9" filter="url(#connectionBlur)">
          <animate attributeName="ry" values="10;18;10" dur="9s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.5;0.9" dur="5s" repeatCount="indefinite"/>
        </ellipse>
      </g>

      {/* Ethereal connection streams */}
      <g opacity="0.3">
        <path d="M40,150 Q100,130 160,150 Q220,170 280,150 Q340,130 380,150"
              fill="none" stroke="url(#connectionGradient1)" strokeWidth="2" filter="url(#connectionBlur)">
          <animate attributeName="d" values="M40,150 Q100,130 160,150 Q220,170 280,150 Q340,130 380,150;
                                             M40,150 Q100,170 160,150 Q220,130 280,150 Q340,170 380,150;
                                             M40,150 Q100,130 160,150 Q220,170 280,150 Q340,130 380,150"
                  dur="18s" repeatCount="indefinite"/>
        </path>
        <path d="M60,100 Q120,80 180,100 Q240,120 300,100 Q360,80 400,100"
              fill="none" stroke="url(#connectionGradient2)" strokeWidth="1.5" filter="url(#connectionBlur)">
          <animate attributeName="d" values="M60,100 Q120,80 180,100 Q240,120 300,100 Q360,80 400,100;
                                             M60,100 Q120,120 180,100 Q240,80 300,100 Q360,120 400,100;
                                             M60,100 Q120,80 180,100 Q240,120 300,100 Q360,80 400,100"
                  dur="22s" repeatCount="indefinite"/>
        </path>
      </g>
    </svg>
  );

  // Liquid Data Art
  const LiquidDataArt = () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <radialGradient id="liquidGradient1" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF9A9E" />
          <stop offset="50%" stopColor="#FECFEF" />
          <stop offset="100%" stopColor="#FECFEF" />
        </radialGradient>
        <radialGradient id="liquidGradient2" cx="70%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#A8EDEA" />
          <stop offset="50%" stopColor="#FED6E3" />
          <stop offset="100%" stopColor="#D299C2" />
        </radialGradient>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
        <filter id="liquidGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="liquidBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>

      {/* Large liquid blob 1 */}
      <path d="M80,120 Q140,60 220,100 Q300,140 320,200 Q280,260 200,240 Q120,220 80,160 Q60,140 80,120 Z"
            fill="url(#liquidGradient1)" opacity="0.8" filter="url(#liquidGlow)">
        <animate attributeName="d" values="M80,120 Q140,60 220,100 Q300,140 320,200 Q280,260 200,240 Q120,220 80,160 Q60,140 80,120 Z;
                                           M90,110 Q150,70 210,110 Q290,150 310,210 Q270,250 210,230 Q130,210 90,150 Q70,130 90,110 Z;
                                           M80,120 Q140,60 220,100 Q300,140 320,200 Q280,260 200,240 Q120,220 80,160 Q60,140 80,120 Z"
                dur="8s" repeatCount="indefinite"/>
      </path>

      {/* Large liquid blob 2 */}
      <path d="M150,80 Q220,40 280,80 Q340,120 320,180 Q280,240 220,220 Q160,200 140,140 Q130,100 150,80 Z"
            fill="url(#liquidGradient2)" opacity="0.6" filter="url(#liquidGlow)">
        <animate attributeName="d" values="M150,80 Q220,40 280,80 Q340,120 320,180 Q280,240 220,220 Q160,200 140,140 Q130,100 150,80 Z;
                                           M160,90 Q210,50 270,90 Q330,130 310,190 Q270,230 230,210 Q170,190 150,130 Q140,110 160,90 Z;
                                           M150,80 Q220,40 280,80 Q340,120 320,180 Q280,240 220,220 Q160,200 140,140 Q130,100 150,80 Z"
                dur="10s" repeatCount="indefinite"/>
      </path>

      {/* Floating liquid drops */}
      <circle cx="120" cy="100" r="15" fill="#FF9A9E" opacity="0.7" filter="url(#liquidBlur)">
        <animate attributeName="cy" values="100;90;100" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="r" values="15;18;15" dur="3s" repeatCount="indefinite"/>
      </circle>

      <ellipse cx="300" cy="160" rx="12" ry="18" fill="#A8EDEA" opacity="0.8" filter="url(#liquidBlur)">
        <animate attributeName="rx" values="12;16;12" dur="5s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="18;14;18" dur="5s" repeatCount="indefinite"/>
      </ellipse>

      <circle cx="180" cy="220" r="10" fill="#FECFEF" opacity="0.6" filter="url(#liquidBlur)">
        <animate attributeName="cx" values="180;190;180" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="r" values="10;14;10" dur="4s" repeatCount="indefinite"/>
      </circle>

      {/* Flowing data streams */}
      <path d="M50,150 Q100,130 150,150 Q200,170 250,150 Q300,130 350,150"
            fill="none" stroke="url(#waveGradient)" strokeWidth="4" opacity="0.5" filter="url(#liquidBlur)">
        <animate attributeName="d" values="M50,150 Q100,130 150,150 Q200,170 250,150 Q300,130 350,150;
                                           M50,150 Q100,170 150,150 Q200,130 250,150 Q300,170 350,150;
                                           M50,150 Q100,130 150,150 Q200,170 250,150 Q300,130 350,150"
                dur="6s" repeatCount="indefinite"/>
      </path>

      {/* Particle system */}
      <g opacity="0.8">
        <circle cx="100" cy="80" r="3" fill="#667eea">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;50,-20;100,-40" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="250" cy="200" r="2" fill="#764ba2">
          <animate attributeName="opacity" values="0;1;0" dur="4s" begin="1s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;-30,-30;-60,-60" dur="4s" begin="1s" repeatCount="indefinite"/>
        </circle>
        <circle cx="320" cy="120" r="2.5" fill="#FF9A9E">
          <animate attributeName="opacity" values="0;1;0" dur="3.5s" begin="2s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;-40,20;-80,40" dur="3.5s" begin="2s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>
  );

  // Abstract Ocean Depths
  const AbstractOceanDepthsArt = () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <linearGradient id="oceanGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="30%" stopColor="#764ba2" />
          <stop offset="60%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
        <radialGradient id="oceanGradient2" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#a8edea" />
          <stop offset="40%" stopColor="#fed6e3" />
          <stop offset="80%" stopColor="#d299c2" />
          <stop offset="100%" stopColor="#667eea" />
        </radialGradient>
        <filter id="oceanGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="oceanBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
      </defs>

      {/* Deep ocean currents - abstract representation of growth and improvement */}
      <path d="M0,200 Q50,120 100,180 Q150,240 200,160 Q250,80 300,140 Q350,200 400,120"
            fill="none" stroke="url(#oceanGradient1)" strokeWidth="8" opacity="0.4" filter="url(#oceanGlow)">
        <animate attributeName="d" values="M0,200 Q50,120 100,180 Q150,240 200,160 Q250,80 300,140 Q350,200 400,120;
                                           M0,200 Q50,140 100,160 Q150,220 200,140 Q250,60 300,120 Q350,180 400,100;
                                           M0,200 Q50,160 100,140 Q150,200 200,120 Q250,40 300,100 Q350,160 400,80;
                                           M0,200 Q50,140 100,160 Q150,220 200,140 Q250,60 300,120 Q350,180 400,100;
                                           M0,200 Q50,120 100,180 Q150,240 200,160 Q250,80 300,140 Q350,200 400,120"
                dur="20s" repeatCount="indefinite"/>
      </path>

      {/* Mid-level ocean flow */}
      <path d="M0,150 Q80,100 160,150 Q240,200 320,150 Q360,120 400,150"
            fill="none" stroke="url(#oceanGradient1)" strokeWidth="5" opacity="0.6" filter="url(#oceanBlur)">
        <animate attributeName="d" values="M0,150 Q80,100 160,150 Q240,200 320,150 Q360,120 400,150;
                                           M0,150 Q80,130 160,150 Q240,170 320,150 Q360,140 400,150;
                                           M0,150 Q80,170 160,150 Q240,130 320,150 Q360,160 400,150;
                                           M0,150 Q80,150 160,150 Q240,150 320,150 Q360,150 400,150;
                                           M0,150 Q80,170 160,150 Q240,130 320,150 Q360,160 400,150;
                                           M0,150 Q80,130 160,150 Q240,170 320,150 Q360,140 400,150;
                                           M0,150 Q80,100 160,150 Q240,200 320,150 Q360,120 400,150"
                dur="18s" repeatCount="indefinite"/>
      </path>

      {/* Surface ripples - representing continuous improvement */}
      <path d="M0,100 Q100,60 200,100 Q300,140 400,100"
            fill="none" stroke="url(#oceanGradient2)" strokeWidth="3" opacity="0.8" filter="url(#oceanBlur)">
        <animate attributeName="d" values="M0,100 Q100,60 200,100 Q300,140 400,100;
                                           M0,100 Q100,80 200,100 Q300,120 400,100;
                                           M0,100 Q100,100 200,100 Q300,100 400,100;
                                           M0,100 Q100,120 200,100 Q300,80 400,100;
                                           M0,100 Q100,140 200,100 Q300,60 400,100;
                                           M0,100 Q100,120 200,100 Q300,80 400,100;
                                           M0,100 Q100,100 200,100 Q300,100 400,100;
                                           M0,100 Q100,80 200,100 Q300,120 400,100;
                                           M0,100 Q100,60 200,100 Q300,140 400,100"
                dur="16s" repeatCount="indefinite"/>
      </path>

      {/* Abstract depth layers - symbolizing layers of growth - more subtle */}
      <g opacity="0.2">
        <ellipse cx="120" cy="180" rx="60" ry="20" fill="url(#oceanGradient2)" filter="url(#oceanGlow)">
          <animate attributeName="ry" values="20;25;20" dur="16s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.4;0.2" dur="12s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="280" cy="140" rx="50" ry="15" fill="url(#oceanGradient1)" filter="url(#oceanGlow)">
          <animate attributeName="rx" values="50;60;50" dur="18s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="14s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="200" cy="220" rx="40" ry="25" fill="url(#oceanGradient2)" filter="url(#oceanGlow)">
          <animate attributeName="ry" values="25;30;25" dur="20s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.3;0.2" dur="16s" repeatCount="indefinite"/>
        </ellipse>
      </g>

      {/* Ascending elements - representing self-improvement journey */}
      <g opacity="0.4">
        <circle cx="100" cy="250" r="4" fill="url(#oceanGradient1)">
          <animate attributeName="opacity" values="0;0.4;0" dur="6s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;20,-80;40,-160" dur="6s" repeatCount="indefinite"/>
        </circle>
        <circle cx="200" cy="260" r="3" fill="url(#oceanGradient2)">
          <animate attributeName="opacity" values="0;0.4;0" dur="7s" begin="2s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;-15,-90;-30,-180" dur="7s" begin="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="300" cy="240" r="5" fill="url(#oceanGradient1)">
          <animate attributeName="opacity" values="0;0.4;0" dur="8s" begin="4s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;-25,-70;-50,-140" dur="8s" begin="4s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>
  );

  // Final 3 Artistic Compositions - Representing Selora's Core Capabilities
  const slides = [
    {
      component: <AbstractConnectionsArt />,
      title: "Organizational Harmony",
      subtitle: "Where invisible networks of talent, skills, and relationships converge into strategic advantage"
    },
    {
      component: <LiquidDataArt />,
      title: "Intelligence Flow",
      subtitle: "ERP data transforms into living insights, revealing hidden patterns in your workforce ecosystem"
    },
    {
      component: <AbstractOceanDepthsArt />,
      title: "Succession Currents",
      subtitle: "Deep currents of potential rise through layers of development, surfacing tomorrow's leaders"
    }
  ];

  // Slideshow functionality
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          newPassword: password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      
      setSuccess(true);
      
      // Redirect to login page after a delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Reset form */}
      <div className="w-2/5 flex flex-col px-16 py-8 relative">
        {/* Logo - Fixed at top */}
        <div className="mb-8 -ml-1">
          <img
            src="/logo1.png"
            alt="Selora"
            className="h-8 w-auto"
          />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md mx-auto">

          <div className="mb-8">
            <h1 className="text-2xl font-light text-gray-900 mb-2">
              {success ? 'Password Reset Complete' : 'Verify & Set New Password'}
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <p className="font-medium text-sm">Password Reset Successful!</p>
                <p className="text-sm mt-1">Your password has been updated. You can now sign in with your new password.</p>
              </div>

              <Link
                href="/login"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="Enter your email"
                  required
                  readOnly={!!searchParams?.get('email')}
                />
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-lg tracking-widest text-gray-900"
                  placeholder="000000"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    placeholder="Enter new password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    placeholder="Confirm new password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{' '}
                  <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>

      {/* Right side - Slideshow - Same as login and reset password pages */}
      <div className="w-3/5 relative overflow-hidden bg-white">
        <div className="absolute inset-0 m-8 rounded-2xl overflow-hidden bg-white shadow-lg">
          {/* Slideshow Container */}
          <div className="absolute inset-0">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentSlide
                    ? 'opacity-100 transform translate-x-0'
                    : index < currentSlide
                      ? 'opacity-0 transform -translate-x-full'
                      : 'opacity-0 transform translate-x-full'
                }`}
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50" />

                {/* SVG Illustration - Bigger */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="w-full max-w-2xl h-96">
                    {slide.component}
                  </div>
                </div>

                {/* Simple Text - Bottom Left */}
                <div className="absolute bottom-12 left-12 font-sans">
                  <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">
                    {slide.title}
                  </h3>
                  <p className="text-lg text-gray-600 max-w-md font-light">
                    {slide.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="absolute bottom-8 right-8 flex items-center space-x-4 z-10">
            <button
              onClick={prevSlide}
              className="w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-purple-600 rounded-full shadow-md transition-all duration-200 hover:scale-105"
              aria-label="Previous slide"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-purple-600 rounded-full shadow-md transition-all duration-200 hover:scale-105"
              aria-label="Next slide"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/70 w-2'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <ResetPasswordVerifyContent />
    </Suspense>
  );
}