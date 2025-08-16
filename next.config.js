/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

// Check if we're running in a Docker container
const isDocker = process.env.RUNNING_IN_DOCKER === 'true';

// Environment variables to expose to the client
const env = {
  // Preserve existing env vars
  ...(process.env.NEXT_PUBLIC_BASE_URL && { NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL }),
  ...(process.env.NEXT_PUBLIC_APP_URL && { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL }),
  // Add other public environment variables as needed
};

const nextConfig = {
  // React Strict Mode configured below
  
  // Enable production optimizations in production
  productionBrowserSourceMaps: false,
  
  // Configure output for standalone build
  output: 'standalone',
  
  // Configure base path if needed (e.g., if using a subdirectory)
  // basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // Configure images
  images: {
    domains: ['lh3.googleusercontent.com', 'randomuser.me'],
    unoptimized: process.env.NODE_ENV === 'production', // Disable Image Optimization API in production
  },
  
  // Environment variables
  env: {
    // Expose environment variables to the client-side
    ...env,
    // Keep existing environment variables
    MONGODB_URI: process.env.MONGODB_URI,
  },
  
  // Use SWC minification (default in Next.js 15+)
  // swcMinify removed (always enabled in Next.js 15+)
  
  // Experimental features
  experimental: {
    // Required for Railway - Next.js 15 expects an object here
    serverActions: {},
  },
  // Next.js 15: moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: ['mongoose'],
  
  // Configure output file tracing
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Disable ESLint during builds entirely
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
    // @ts-ignore - Force ignore all TypeScript errors
  },
  
  // Disable React Strict Mode to prevent double rendering in development
  reactStrictMode: false,
  
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `buffer` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        util: require.resolve('util/'),
        dns: false,
        net: false,
        tls: false,
        fs: false,
        path: false,
        os: false,
        child_process: false,
        stream: require.resolve('stream-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        crypto: require.resolve('crypto-browserify'),
      };
      
      // Add polyfills explicitly
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }
    
    return config;
  },
  
  // Configure security headers
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
    ];

    // Apply these headers to all routes
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Additional headers for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
  
  // Configure logging for production
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Use rewrites to handle both API and page paths
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      {
        source: '/:path*',
        destination: `/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;