import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import initializeServer from './server/init';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const hostname = isProduction ? '0.0.0.0' : 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : (isProduction ? 3000 : 3000);

// Log environment details
console.log(`Starting server in ${isProduction ? 'production' : 'development'} mode`);
console.log(`Port: ${port}, Hostname: ${hostname}`);
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Not set'}`);
console.log(`NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set'}`);

// Prepare the Next.js app
const app = next({ 
  dev: !isProduction, 
  hostname, 
  port,
  // Enable production optimizations in production
  ...(isProduction && {
    conf: {
      // Add any production-specific Next.js config here
      compress: true,
      poweredByHeader: false,
      generateEtags: true,
      reactStrictMode: true,
    }
  })
});
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Initialize server components including the integration monitor
  await initializeServer();
  
  // Create HTTP server
  createServer(async (req, res) => {
    try {
      // Extract URL
      const parsedUrl = parse(req.url || '', true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
}); 