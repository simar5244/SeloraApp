'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FaEye, FaEyeSlash, FaCheck, FaArrowRight, FaArrowLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
// Removed unused loadStripe import
import { toast } from 'react-hot-toast';

// Removed unused stripePromise

type StripePrice = {
  priceId: string;
  productName: string;
  unitAmount: number;
  currency: string;
  interval: string | null;
  productDescription: string;
};

type CompanySignupFormData = {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
};

type SignupStep = 'company' | 'email' | 'password' | 'plans' | 'checkout' | 'success';

function generateRandomCompanyCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Reuse the same art components from login/signup page
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

    <path d="M50,80 Q120,40 200,80 Q280,120 350,80 Q380,100 360,140 Q320,180 280,160 Q200,140 120,180 Q80,200 60,160 Q40,120 50,80 Z"
          fill="url(#connectionGradient1)" opacity="0.3" filter="url(#connectionGlow)">
      <animate attributeName="d" values="M50,80 Q120,40 200,80 Q280,120 350,80 Q380,100 360,140 Q320,180 280,160 Q200,140 120,180 Q80,200 60,160 Q40,120 50,80 Z;
                                         M60,90 Q130,50 210,90 Q290,130 340,90 Q370,110 350,150 Q310,170 290,150 Q210,130 130,170 Q90,190 70,150 Q50,110 60,90 Z;
                                         M55,85 Q125,45 205,85 Q285,125 345,85 Q375,105 355,145 Q315,175 285,155 Q205,135 125,175 Q85,195 65,155 Q45,115 55,85 Z;
                                         M50,80 Q120,40 200,80 Q280,120 350,80 Q380,100 360,140 Q320,180 280,160 Q200,140 120,180 Q80,200 60,160 Q40,120 50,80 Z"
              dur="20s" repeatCount="indefinite"/>
    </path>

    <path d="M100,120 Q160,80 220,120 Q280,160 340,120 Q370,140 350,200 Q310,260 250,220 Q190,180 130,220 Q90,200 110,160 Q130,120 100,120 Z"
          fill="url(#connectionGradient2)" opacity="0.2" filter="url(#connectionGlow)">
      <animate attributeName="d" values="M100,120 Q160,80 220,120 Q280,160 340,120 Q370,140 350,200 Q310,260 250,220 Q190,180 130,220 Q90,200 110,160 Q130,120 100,120 Z;
                                         M110,130 Q170,90 230,130 Q290,170 330,130 Q360,150 340,210 Q300,250 260,210 Q200,170 140,210 Q100,190 120,150 Q140,110 110,130 Z;
                                         M105,125 Q165,85 225,125 Q285,165 335,125 Q365,145 345,205 Q305,255 255,215 Q195,175 135,215 Q95,195 115,155 Q135,115 105,125 Z;
                                         M100,120 Q160,80 220,120 Q280,160 340,120 Q370,140 350,200 Q310,260 250,220 Q190,180 130,220 Q90,200 110,160 Q130,120 100,120 Z"
              dur="25s" repeatCount="indefinite"/>
    </path>

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
  </svg>
);

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

    <path d="M80,120 Q140,60 220,100 Q300,140 320,200 Q280,260 200,240 Q120,220 80,160 Q60,140 80,120 Z"
          fill="url(#liquidGradient1)" opacity="0.8" filter="url(#liquidGlow)">
      <animate attributeName="d" values="M80,120 Q140,60 220,100 Q300,140 320,200 Q280,260 200,240 Q120,220 80,160 Q60,140 80,120 Z;
                                         M90,110 Q150,70 210,110 Q290,150 310,210 Q270,250 210,230 Q130,210 90,150 Q70,130 90,110 Z;
                                         M80,120 Q140,60 220,100 Q300,140 320,200 Q280,260 200,240 Q120,220 80,160 Q60,140 80,120 Z"
              dur="8s" repeatCount="indefinite"/>
    </path>

    <path d="M150,80 Q220,40 280,80 Q340,120 320,180 Q280,240 220,220 Q160,200 140,140 Q130,100 150,80 Z"
          fill="url(#liquidGradient2)" opacity="0.6" filter="url(#liquidGlow)">
      <animate attributeName="d" values="M150,80 Q220,40 280,80 Q340,120 320,180 Q280,240 220,220 Q160,200 140,140 Q130,100 150,80 Z;
                                         M160,90 Q210,50 270,90 Q330,130 310,190 Q270,230 230,210 Q170,190 150,130 Q140,110 160,90 Z;
                                         M150,80 Q220,40 280,80 Q340,120 320,180 Q280,240 220,220 Q160,200 140,140 Q130,100 150,80 Z"
              dur="10s" repeatCount="indefinite"/>
    </path>

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

    <path d="M50,150 Q100,130 150,150 Q200,170 250,150 Q300,130 350,150"
          fill="none" stroke="url(#waveGradient)" strokeWidth="4" opacity="0.5" filter="url(#liquidBlur)">
      <animate attributeName="d" values="M50,150 Q100,130 150,150 Q200,170 250,150 Q300,130 350,150;
                                         M50,150 Q100,170 150,150 Q200,130 250,150 Q300,170 350,150;
                                         M50,150 Q100,130 150,150 Q200,170 250,150 Q300,130 350,150"
              dur="6s" repeatCount="indefinite"/>
    </path>

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

    <path d="M0,200 Q50,120 100,180 Q150,240 200,160 Q250,80 300,140 Q350,200 400,120"
          fill="none" stroke="url(#oceanGradient1)" strokeWidth="8" opacity="0.4" filter="url(#oceanGlow)">
      <animate attributeName="d" values="M0,200 Q50,120 100,180 Q150,240 200,160 Q250,80 300,140 Q350,200 400,120;
                                         M0,200 Q50,140 100,160 Q150,220 200,140 Q250,60 300,120 Q350,180 400,100;
                                         M0,200 Q50,160 100,140 Q150,200 200,120 Q250,40 300,100 Q350,160 400,80;
                                         M0,200 Q50,140 100,160 Q150,220 200,140 Q250,60 300,120 Q350,180 400,100;
                                         M0,200 Q50,120 100,180 Q150,240 200,160 Q250,80 300,140 Q350,200 400,120"
              dur="20s" repeatCount="indefinite"/>
    </path>

    <path d="M0,150 Q80,100 160,150 Q240,200 320,150 Q360,120 400,150"
          fill="none" stroke="url(#oceanGradient1)" strokeWidth="5" opacity="0.6" filter="url(#oceanBlur)">
      <animate attributeName="d" values="M0,150 Q80,100 160,150 Q240,200 320,150 Q360,120 400,150;
                                         M0,150 Q80,130 160,150 Q240,170 320,150 Q360,140 400,150;
                                         M0,150 Q80,170 160,150 Q240,130 320,150 Q360,160 400,150;
                                         M0,150 Q80,150 160,150 Q240,150 320,150 Q360,150 400,150;
                                         M0,150 Q80,130 160,150 Q240,170 320,150 Q360,140 400,150;
                                         M0,150 Q80,100 160,150 Q240,200 320,150 Q360,120 400,150"
              dur="15s" repeatCount="indefinite"/>
    </path>

    <g opacity="0.7">
      <circle cx="120" cy="140" r="12" fill="url(#oceanGradient2)" filter="url(#oceanBlur)">
        <animate attributeName="r" values="12;18;12" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="140;130;140" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="280" cy="180" r="8" fill="url(#oceanGradient1)" filter="url(#oceanBlur)">
        <animate attributeName="r" values="8;14;8" dur="7s" repeatCount="indefinite"/>
      </circle>
      <ellipse cx="200" cy="120" rx="16" ry="10" fill="url(#oceanGradient2)" opacity="0.8" filter="url(#oceanBlur)">
        <animate attributeName="ry" values="10;16;10" dur="5s" repeatCount="indefinite"/>
      </ellipse>
    </g>
  </svg>
);

export default function CompanySignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CompanySignupFormData>();
  
  const [currentStep, setCurrentStep] = useState<SignupStep>('company');
  const [formData, setFormData] = useState<Partial<CompanySignupFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyCode, setCompanyCode] = useState('');
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StripePrice | null>(null);
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesCache, setPricesCache] = useState<Record<string, StripePrice[]>>({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Watch password for confirmation validation
  const password = watch('adminPassword');

  // Slideshow slides
  const slides = [
    {
      component: <AbstractConnectionsArt />,
      title: "Build Your Organization",
      subtitle: "Create powerful workforce insights and optimize your team's potential"
    },
    {
      component: <LiquidDataArt />,
      title: "Smart Integration", 
      subtitle: "Seamlessly blend your skills and experience into powerful workforce insights"
    },
    {
      component: <AbstractOceanDepthsArt />,
      title: "Growth Journey",
      subtitle: "Dive deep into development opportunities and surface as tomorrow's leader"
    }
  ];

  // Slideshow navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [slides.length]);

  // Preload Stripe prices early to make them instantly available
  useEffect(() => {
    // Preload prices for both billing cycles when component mounts
    fetchPrices('month');
    fetchPrices('year');
  }, []);

  // Update prices when billing cycle changes
  useEffect(() => {
    if (pricesCache[billingCycle]) {
      // Use cached data for instant display
      setPrices(pricesCache[billingCycle]);
      if (pricesCache[billingCycle].length > 0 && !selectedPlan) {
        setSelectedPlan(pricesCache[billingCycle][0]);
      }
    } else if (currentStep === 'plans') {
      // Fetch if not cached and we're on plans step
      fetchPrices(billingCycle);
    }
  }, [currentStep, billingCycle, pricesCache]);

  // Check for successful payment from URL params
  useEffect(() => {
    const success = searchParams?.get('success');
    const companyCodeParam = searchParams?.get('company_code');
    
    if (success === 'true' && companyCodeParam) {
      setCompanyCode(companyCodeParam);
      setCurrentStep('success');
    }
  }, [searchParams]);

  const fetchPrices = async (cycle: 'month' | 'year' = billingCycle) => {
    // Check cache first
    if (pricesCache[cycle]) {
      if (cycle === billingCycle) {
        setPrices(pricesCache[cycle]);
        if (pricesCache[cycle].length > 0 && !selectedPlan) {
          setSelectedPlan(pricesCache[cycle][0]);
        }
      }
      return;
    }

    try {
      setPricesLoading(true);
      const res = await fetch(`/api/stripe/prices?interval=${cycle}`);
      const json = await res.json();

      if (json.prices && Array.isArray(json.prices)) {
        const filteredPrices = json.prices.filter((price: StripePrice) => {
          const productNameLower = price.productName.toLowerCase();
          if (cycle === 'month') {
            return productNameLower.includes('monthly') ||
                  (price.interval === 'month' && !productNameLower.includes('yearly'));
          } else {
            return productNameLower.includes('yearly') ||
                  (price.interval === 'year' && !productNameLower.includes('monthly'));
          }
        });

        // Cache the results
        setPricesCache(prev => ({ ...prev, [cycle]: filteredPrices }));

        // Only update current prices if this is for the current billing cycle
        if (cycle === billingCycle) {
          setPrices(filteredPrices);

          if (filteredPrices.length > 0 && !selectedPlan) {
            setSelectedPlan(filteredPrices[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast.error('Failed to load plans');
    } finally {
      setPricesLoading(false);
    }
  };

  const transitionToStep = (nextStep: SignupStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsTransitioning(false);
    }, 150);
  };

  const handleStepSubmit = (data: any) => {
    setSignupError(null);

    switch (currentStep) {
      case 'company':
        if (!data.companyName?.trim()) {
          setSignupError('Company name is required');
          return;
        }
        setFormData(prev => ({ ...prev, companyName: data.companyName.trim() }));
        transitionToStep('email');
        break;

      case 'email':
        if (!data.adminEmail?.trim()) {
          setSignupError('Email is required');
          return;
        }
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(data.adminEmail)) {
          setSignupError('Please enter a valid email address');
          return;
        }
        setFormData(prev => ({ ...prev, adminEmail: data.adminEmail.trim() }));
        transitionToStep('password');
        break;

      case 'password':
        if (!data.adminPassword) {
          setSignupError('Password is required');
          return;
        }
        if (data.adminPassword.length < 8) {
          setSignupError('Password must be at least 8 characters');
          return;
        }
        if (data.adminPassword !== data.confirmPassword) {
          setSignupError('Passwords do not match');
          return;
        }
        setFormData(prev => ({
          ...prev,
          adminPassword: data.adminPassword,
          firstName: data.firstName || '',
          lastName: data.lastName || ''
        }));
        transitionToStep('plans');
        break;

      case 'plans':
        if (!selectedPlan) {
          setSignupError('Please select a plan');
          return;
        }
        handleCheckout();
        break;

      default:
        break;
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !formData.companyName || !formData.adminEmail || !formData.adminPassword) {
      setSignupError('Missing required information');
      return;
    }

    setIsLoading(true);
    setSignupError(null);

    // Generate company code
    const generatedCompanyCode = generateRandomCompanyCode();
    setCompanyCode(generatedCompanyCode);

    try {
      const response = await fetch('/api/auth/company-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyCode: generatedCompanyCode,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminFirstName: formData.firstName || '',
          adminLastName: formData.lastName || '',
          priceId: selectedPlan.priceId,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      if (result.data?.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.sessionUrl;
      } else {
        throw new Error('No checkout session created');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setSignupError(error.message || 'Failed to process signup');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setSignupError(null);

    switch (currentStep) {
      case 'email':
        transitionToStep('company');
        break;
      case 'password':
        transitionToStep('email');
        break;
      case 'plans':
        transitionToStep('password');
        break;
      default:
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'company': return 'Company Information';
      case 'email': return 'Admin Email';
      case 'password': return 'Set Password';
      case 'plans': return 'Choose Your Plan';
      case 'success': return 'Welcome to Selora!';
      default: return 'Company Signup';
    }
  };

  const getStepNumber = () => {
    const stepNumbers: Record<SignupStep, number> = {
      company: 1,
      email: 2,
      password: 3,
      plans: 4,
      checkout: 5,
      success: 6
    };
    return stepNumbers[currentStep] || 1;
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Form */}
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
            {/* Step Progress - Moved to right side */}
            {currentStep !== 'success' && (
              <div className="absolute top-8 right-8">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`w-2 h-2 rounded-full ${
                        step <= getStepNumber() ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <h1 className="text-2xl font-light text-gray-900 mb-2">{getStepTitle()}</h1>
              {currentStep !== 'success' && (
                <p className="text-gray-600 text-sm">
                  {currentStep === 'company' && 'Enter your company name to get started'}
                  {currentStep === 'email' && 'This will be your admin login email'}
                  {currentStep === 'password' && 'Create a secure password for your account'}
                  {currentStep === 'plans' && 'Select the plan that fits your organization'}
                </p>
              )}
            </div>
            
            {signupError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="text-sm">{signupError}</p>
              </div>
            )}

            {/* Step Content */}
            <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {currentStep === 'company' && (
              <form onSubmit={handleSubmit(handleStepSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    {...register('companyName', { required: 'Company name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    placeholder="Enter your company name"
                    defaultValue={formData.companyName || ''}
                  />
                  {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  Continue
                  <FaArrowRight className="ml-2 w-4 h-4" />
                </button>
              </form>
            )}

            {currentStep === 'email' && (
              <form onSubmit={handleSubmit(handleStepSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Email
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    {...register('adminEmail', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    placeholder="Enter admin email address"
                    defaultValue={formData.adminEmail || ''}
                  />
                  {errors.adminEmail && <p className="mt-1 text-sm text-red-500">{errors.adminEmail.message}</p>}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                  >
                    <FaArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                  >
                    Continue
                    <FaArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {currentStep === 'password' && (
              <form onSubmit={handleSubmit(handleStepSubmit)} className="space-y-6">
                {/* Optional Name Fields */}
                

                <div>
                  <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      {...register('adminPassword', {
                        required: 'Password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  {errors.adminPassword && <p className="mt-1 text-sm text-red-500">{errors.adminPassword.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', {
                        required: 'Confirm password is required',
                        validate: value =>
                          value === password || 'Passwords do not match',
                      })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                  >
                    <FaArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                  >
                    Continue
                    <FaArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {currentStep === 'plans' && (
              <div className="space-y-6">
                {/* Billing Toggle */}
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm w-16 text-right ${billingCycle === 'month' ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                      Monthly
                    </span>
                    <button
                      onClick={() => setBillingCycle(billingCycle === 'month' ? 'year' : 'month')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        billingCycle === 'year' ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          billingCycle === 'year' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm w-16 text-left ${billingCycle === 'year' ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                      Yearly
                    </span>
                    <div className="w-16 flex justify-center">
                      {billingCycle === 'year' }
                    </div>
                  </div>
                </div>

                {/* Plans */}
                <div className="space-y-4">
                  {pricesLoading && prices.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading plans...</p>
                    </div>
                  ) : (
                    prices.map((price) => (
                    <div
                      key={price.priceId}
                      onClick={() => setSelectedPlan(price)}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPlan?.priceId === price.priceId
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{price.productName}</h3>
                          <p className="text-sm text-gray-500 mt-1">{price.productDescription}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            ${(price.unitAmount / 100).toFixed(0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            per {price.interval}
                          </div>
                        </div>
                        {selectedPlan?.priceId === price.priceId && (
                          <div className="absolute top-3 right-3">
                            <div className="w-5 h-5 text-purple-600" />
                          </div>
                        )}
                      </div>
                    </div>
                    ))
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                  >
                    <FaArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={() => handleStepSubmit({})}
                    disabled={isLoading || !selectedPlan}
                    className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                  >
                    {isLoading ? 'Processing...' : 'Continue'}
                    {!isLoading && <FaArrowRight className="ml-2 w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'success' && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <FaCheck className="w-8 h-8 text-green-600" />
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
                  <p className="text-gray-600">Your company account has been created successfully.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Your Company Code:</p>
                  <p className="text-2xl font-mono font-bold text-purple-600">{companyCode}</p>
                  <p className="text-xs text-gray-500 mt-2">Share this code with your team members to join your organization</p>
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Go to Dashboard
                </button>
              </div>
            )}

            {/* Login Link */}
            {currentStep !== 'success' && (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Slideshow */}
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
              onClick={() => setCurrentSlide(index)}
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