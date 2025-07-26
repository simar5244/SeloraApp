const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const os = require('os');
const util = require('util');
const process = require('process');

// Track script execution state
const executionState = {
  startTime: null,
  lastRun: null,
  currentScript: null,
  scriptStartTime: null,
  memoryUsage: {
    heapUsed: 0,
    heapTotal: 0,
    rss: 0,
    external: 0,
    arrayBuffers: 0
  },
  systemStats: {
    freeMem: 0,
    totalMem: 0,
    loadAvg: [0, 0, 0],
    uptime: 0
  },
  errors: [],
  warnings: [],
  scriptsRun: 0,
  scriptsFailed: 0,
  lastError: null
};

// Track performance metrics
const performanceMetrics = {
  scriptRuntimes: {},
  scriptMemoryUsage: {},
  systemLoad: []
};

// Track resource usage over time
const resourceHistory = {
  timestamps: [],
  memory: [],
  cpu: [],
  script: []
};

// Maximum number of history entries to keep
const MAX_HISTORY_ENTRIES = 10;

// Load environment variables - try .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log('Loading environment from .env');
  dotenv.config({ path: envPath });
} else {
  console.log('No .env or .env.local file found');
}

// Configuration
const CHECK_INTERVAL_HOURS = 10; // Run every 10 hours
const CHECK_INTERVAL_MS = CHECK_INTERVAL_HOURS * 60 * 60 * 1000;
const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';

// Create logs directory if it doesn't exist
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file setup - create a new log file for each day
function getLogFilePath() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  return path.resolve(logsDir, `data-update-${dateStr}.log`);
}

// Enhanced logger function with log levels and colors
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

const LOG_COLORS = {
  DEBUG: '\x1b[36m',  // Cyan
  INFO: '\x1b[32m',   // Green
  WARN: '\x1b[33m',   // Yellow
  ERROR: '\x1b[31m',  // Red
  FATAL: '\x1b[41m\x1b[37m', // Red background, white text
  RESET: '\x1b[0m'    // Reset colors
};

// Default log level (can be overridden by environment variable)
const LOG_LEVEL = process.env.LOG_LEVEL?.toUpperCase() in LOG_LEVELS 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
  : LOG_LEVELS.INFO;

// Logger function with log levels and colors
function log(message, level = 'INFO', context = {}) {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  const color = LOG_COLORS[levelUpper] || '';
  const reset = LOG_COLORS.RESET;
  
  // Add context to message if provided
  let fullMessage = message;
  if (Object.keys(context).length > 0) {
    try {
      fullMessage += ' ' + JSON.stringify(context, null, 2);
    } catch (e) {
      fullMessage += ' [Context could not be stringified]';
    }
  }
  
  const logMessage = `[${timestamp}] [${levelUpper}] ${fullMessage}`;
  const coloredMessage = `${color}[${timestamp}] [${levelUpper}]${reset} ${fullMessage}`;
  
  // Only log if the level is at or above the threshold
  if ((LOG_LEVELS[levelUpper] || 0) >= LOG_LEVEL) {
    if (levelUpper === 'ERROR' || levelUpper === 'FATAL') {
      console.error(coloredMessage);
      // Record errors for debugging
      executionState.errors.push({
        timestamp,
        message: fullMessage,
        level: levelUpper,
        script: executionState.currentScript
      });
    } else if (levelUpper === 'WARN') {
      console.warn(coloredMessage);
      executionState.warnings.push({
        timestamp,
        message: fullMessage,
        script: executionState.currentScript
      });
    } else {
      console.log(coloredMessage);
    }
  }
  
  // Always write to log file, regardless of log level
  try {
    fs.appendFileSync(getLogFilePath(), logMessage + '\n');
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
  
  // Log resource usage periodically
  logResourceUsage();
  
  return logMessage;
}

// Helper functions for different log levels
function debug(message, context = {}) {
  return log(message, 'DEBUG', context);
}

function info(message, context = {}) {
  return log(message, 'INFO', context);
}

function warn(message, context = {}) {
  return log(message, 'WARN', context);
}

function error(message, context = {}) {
  return log(message, 'ERROR', context);
}

function fatal(message, context = {}) {
  const msg = log(message, 'FATAL', context);
  // Consider exiting on fatal errors
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  return msg;
}

// Function to update system stats
function updateSystemStats() {
  try {
    executionState.systemStats = {
      freeMem: os.freemem(),
      totalMem: os.totalmem(),
      loadAvg: os.loadavg(),
      uptime: os.uptime()
    };
    
    // Record resource usage
    const memUsage = process.memoryUsage();
    executionState.memoryUsage = memUsage;
    
    // Update resource history
    const now = new Date().toISOString();
    resourceHistory.timestamps.push(now);
    resourceHistory.memory.push(memUsage.heapUsed / 1024 / 1024); // MB
    resourceHistory.cpu.push(process.cpuUsage().user / 1000000); // Convert to ms
    resourceHistory.script.push(executionState.currentScript || 'idle');
    
    // Keep history size in check
    if (resourceHistory.timestamps.length > MAX_HISTORY_ENTRIES) {
      resourceHistory.timestamps.shift();
      resourceHistory.memory.shift();
      resourceHistory.cpu.shift();
      resourceHistory.script.shift();
    }
    
    return true;
  } catch (error) {
    console.error('Error updating system stats:', error);
    return false;
  }
}

// Function to get system info
function getSystemInfo() {
  try {
    const cpus = os.cpus();
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      cpu: {
        model: cpus[0]?.model || 'unknown',
        cores: cpus.length,
        speed: cpus[0]?.speed || 'unknown'
      },
      memory: {
        total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        free: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        usage: ((1 - (os.freemem() / os.totalmem())) * 100).toFixed(2) + '%'
      },
      load: os.loadavg(),
      network: Object.values(os.networkInterfaces())
        .flat()
        .filter(i => i && !i.internal && i.family === 'IPv4')
        .map(i => ({
          name: i.address,
          mac: i.mac,
          netmask: i.netmask
        }))
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return { error: error.message };
  }
}

// Function to log resource usage
function logResourceUsage(force = false) {
  const now = new Date();
  // Only log every 30 seconds unless forced
  if (!force && executionState.lastResourceLog && 
      (now - executionState.lastResourceLog) < 30000) {
    return;
  }
  
  executionState.lastResourceLog = now;
  const mem = process.memoryUsage();
  const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);
  const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(2);
  const rss = (mem.rss / 1024 / 1024).toFixed(2);
  const load = os.loadavg();
  
  log(`[RESOURCE] Memory: ${heapUsed}MB used, ${heapTotal}MB total, ${rss}MB RSS | ` +
       `Load: ${load[0].toFixed(2)}, ${load[1].toFixed(2)}, ${load[2].toFixed(2)}`);
  
  // Log detailed memory usage if above threshold
  if (mem.heapUsed / mem.heapTotal > 0.7) {
    log(`[WARNING] High memory usage: ${(mem.heapUsed / mem.heapTotal * 100).toFixed(1)}% of heap used`, 'WARN');
    // Take a heap snapshot if memory is critically high
    if (mem.heapUsed / mem.heapTotal > 0.9) {
      log('[WARNING] Critical memory usage - consider increasing Node.js memory limit', 'WARN');
    }
  }
}

// Function to run a Python script with enhanced error handling and retries
async function runPythonScript(scriptName, args = [], options = {}) {
  const scriptPath = path.resolve(process.cwd(), scriptName);
  const argsStr = args.map(arg => `"${arg}"`).join(' ');
  const command = `"${PYTHON_PATH}" "${scriptPath}" ${argsStr}`.trim();
  
  // Default options
  const {
    timeout = 0, // No timeout by default
    maxBuffer = 50 * 1024 * 1024, // 50MB buffer for large outputs
    maxRetries = 2,
    retryDelay = 5000, // 5 seconds between retries
    logOutput = true,
    logErrors = true,
    captureOutput = true,
    ...execOptions
  } = options;
  
  // Track execution time
  const startTime = Date.now();
  let attempt = 0;
  let lastError = null;
  
  // Prepare environment variables
  const processEnv = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    PYTHONIOENCODING: 'utf-8',
    ...(options.env || {})
  };
  
  // Log script execution
  log(`Executing script: ${scriptName}`, 'DEBUG', {
    args,
    pid: process.pid,
    cwd: process.cwd(),
    pythonPath: PYTHON_PATH,
    timeout: timeout || 'No timeout',
    maxRetries
  });
  
  // Retry logic
  while (attempt <= maxRetries) {
    attempt++;
    
    if (attempt > 1) {
      log(`Retry attempt ${attempt} of ${maxRetries} after ${retryDelay}ms...`, 'WARN', {
        script: scriptName,
        previousError: lastError?.message
      });
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    try {
      const { stdout, stderr } = await execPromise(command, {
        maxBuffer,
        timeout,
        env: processEnv,
        ...execOptions
      });
      
      // Log success
      const duration = Date.now() - startTime;
      log(`Script completed successfully: ${scriptName}`, 'INFO', {
        duration: `${duration}ms`,
        exitCode: 0,
        attempt
      });
      
      // Log output if needed
      if (logOutput && stdout) {
        log(`[${scriptName} OUTPUT] ${stdout}`, 'DEBUG');
      }
      
      // Log errors if any
      if (logErrors && stderr) {
        log(`[${scriptName} STDERR] ${stderr}`, 'WARN');
      }
      
      return {
        success: true,
        exitCode: 0,
        stdout: captureOutput ? stdout : '',
        stderr: captureOutput ? stderr : '',
        duration,
        attempt
      };
      
    } catch (error) {
      lastError = error;
      
      // Log the error
      const duration = Date.now() - startTime;
      const errorDetails = {
        script: scriptName,
        duration: `${duration}ms`,
        exitCode: error.code || -1,
        signal: error.signal || null,
        attempt,
        maxAttempts: maxRetries + 1,
        error: error.message
      };
      
      if (attempt <= maxRetries) {
        log(`Script attempt ${attempt} failed, will retry: ${scriptName}`, 'WARN', errorDetails);
      } else {
        log(`Script failed after ${maxRetries + 1} attempts: ${scriptName}`, 'ERROR', errorDetails);
        
        // Log full error for debugging
        if (error.stderr) {
          log(`[${scriptName} STDERR] ${error.stderr}`, 'ERROR');
        }
        
        // Re-throw the error if we're out of retries
        throw new Error(`Script failed after ${maxRetries + 1} attempts: ${error.message}`, {
          cause: error,
          details: errorDetails
        });
      }
    }
  }
  
  // This should never be reached due to the throw above, but TypeScript needs it
  throw lastError;
}

// Function to run all update scripts in sequence with proper error handling and monitoring
async function runAllUpdates() {
  // Define the scripts to run in order with their configurations
  const scripts = [
    {
      name: 'employee_utilization_analyzer.py',
      args: [],
      description: 'Employee Utilization Analysis',
      timeout: 30 * 60 * 1000, // 30 minutes
      retries: 2,
      retryDelay: 10000, // 10 seconds
      success: false,
      attempts: 0,
      startTime: null,
      endTime: null,
      error: null,
      output: ''
    },
    {
      name: 'attrition_score.py',
      args: [],
      description: 'Attrition Score Calculation',
      timeout: 60 * 60 * 1000, // 60 minutes
      retries: 2,
      retryDelay: 15000, // 15 seconds
      success: false,
      attempts: 0,
      startTime: null,
      endTime: null,
      error: null,
      output: ''
    },
    {
      name: 'successor_identification.py',
      args: ['--refresh', '--batch-size=10'],
      description: 'Successor Identification',
      timeout: 45 * 60 * 1000, // 45 minutes
      retries: 1,
      retryDelay: 20000, // 20 seconds
      success: false,
      attempts: 0,
      startTime: null,
      endTime: null,
      error: null,
      output: ''
    },
    
  ];
  
  // Log system info at the start
  const systemInfo = getSystemInfo();
  log('🚀 Starting scheduled data updates...', 'INFO', {
    system: {
      platform: systemInfo.platform,
      arch: systemInfo.arch,
      node: systemInfo.nodeVersion,
      pid: systemInfo.pid,
      cpus: systemInfo.cpu.cores,
      memory: systemInfo.memory
    },
    totalScripts: scripts.length,
    logLevel: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === LOG_LEVEL) || 'INFO'
  });
  
  executionState.startTime = new Date();
  executionState.scriptsRun = 0;
  executionState.scriptsFailed = 0;
  executionState.errors = [];
  executionState.warnings = [];
  
  const startTime = Date.now();
  const results = [];
  
  try {
    // Run scripts in sequence to avoid overloading the system
    for (const script of scripts) {
      const scriptIndex = scripts.indexOf(script) + 1;
      const { name, description, timeout, retries = 0, retryDelay = 5000, ...scriptOptions } = script;
      const scriptStartTime = Date.now();
      executionState.currentScript = name;
      executionState.scriptStartTime = scriptStartTime;
      
      // Log script start with sequence info
      log(`\n📋 [${scriptIndex}/${scripts.length}] Starting script: ${description}`, 'INFO', {
        script: name,
        args: script.args.join(' '),
        timeout: timeout ? `${timeout / 1000}s` : 'No timeout',
        maxRetries: retries,
        retryDelay: `${retryDelay}ms`
      });
      
      script.startTime = new Date();
      script.attempts = 0;
      
      try {
        // Update system stats before running the script
        updateSystemStats();
        
        // Run the script with retries and timeout
        const result = await runPythonScript(name, script.args, {
          ...scriptOptions,
          timeout,
          maxRetries: retries,
          retryDelay,
          logOutput: true,
          logErrors: true,
          captureOutput: true
        });
        
        const duration = Date.now() - scriptStartTime;
        script.endTime = new Date();
        script.duration = duration;
        script.success = true;
        script.output = result.stdout || '';
        script.attempts = result.attempt;
        
        executionState.scriptsRun++;
        
        // Log success with duration and stats
        log(`✅ [${scriptIndex}/${scripts.length}] ${description} completed successfully in ${(duration / 1000).toFixed(1)}s`, 'SUCCESS', {
          script: name,
          duration: `${duration}ms`,
          attempts: script.attempts,
          startTime: script.startTime.toISOString(),
          endTime: script.endTime.toISOString()
        });
        
        // Record performance metrics
        performanceMetrics.scriptRuntimes[name] = performanceMetrics.scriptRuntimes[name] || [];
        performanceMetrics.scriptRuntimes[name].push(duration);
        
        // Add to results
        results.push({
          name,
          description,
          success: true,
          duration,
          attempts: script.attempts,
          startTime: script.startTime,
          endTime: script.endTime,
          output: result.stdout,
          error: null
        });
        
      } catch (error) {
        const duration = Date.now() - scriptStartTime;
        script.endTime = new Date();
        script.duration = duration;
        script.success = false;
        script.error = {
          message: error.message,
          code: error.code,
          signal: error.signal,
          stack: error.stack,
          stderr: error.stderr
        };
        script.attempts = error.attempt || 1;
        
        executionState.scriptsFailed++;
        executionState.lastError = {
          script: name,
          time: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          code: error.code,
          signal: error.signal
        };
        
        // Log the error with detailed information
        log(`❌ [${scriptIndex}/${scripts.length}] ${description} failed after ${(duration / 1000).toFixed(1)}s (attempt ${script.attempts})`, 'ERROR', {
          script: name,
          duration: `${duration}ms`,
          code: error.code,
          signal: error.signal,
          attempts: script.attempts,
          startTime: script.startTime.toISOString(),
          endTime: script.endTime.toISOString()
        });
        
        // Log the full error for debugging if available
        if (error.stderr) {
          log(`[${name} STDERR] ${error.stderr}`, 'ERROR');
        }
        
        // Add to results
        results.push({
          name,
          description,
          success: false,
          duration,
          attempts: script.attempts,
          startTime: script.startTime,
          endTime: script.endTime,
          output: null,
          error: script.error
        });
        
        // Log a summary of the failure
        log(`💥 Script failed: ${name} (attempt ${script.attempts}/${retries + 1})`, 'ERROR', {
          duration: `${duration}ms`,
          error: error.message,
          code: error.code || 'N/A',
          signal: error.signal || 'N/A'
        });
        
      } finally {
        // Add a small delay between scripts to prevent resource contention
        const delay = 5000; // 5 seconds
        log(`⏳ Waiting ${delay/1000}s before next script...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Update system stats after script completion
        updateSystemStats();
        
        // Log resource usage after each script
        logResourceUsage(true);
      }
    }
    
    // Calculate final statistics
    const totalDurationMs = Date.now() - startTime;
    const totalDurationMinutes = totalDurationMs / 1000 / 60;
    const successRate = (executionState.scriptsRun / scripts.length) * 100;
    const endTime = new Date();
    
    // Generate a detailed summary of all scripts
    const scriptSummary = scripts.map((script, index) => ({
      '#': index + 1,
      Script: script.description,
      Status: script.success ? '✅ SUCCESS' : '❌ FAILED',
      Duration: script.duration ? `${(script.duration / 1000).toFixed(1)}s` : 'N/A',
      Attempts: script.attempts || 0,
      'Start Time': script.startTime?.toISOString() || 'N/A',
      'End Time': script.endTime?.toISOString() || 'N/A',
      'Error': script.error?.message || 'N/A'
    }));
    
    // Log completion with detailed summary
    log('\n📊 ====== DATA UPDATE SUMMARY ======', 'INFO');
    log(`📅 Started: ${new Date(startTime).toISOString()}`, 'INFO');
    log(`🏁 Finished: ${endTime.toISOString()}`, 'INFO');
    log(`⏱️  Total Duration: ${(totalDurationMs / 1000 / 60).toFixed(1)} minutes`, 'INFO');
    log(`📋 Scripts: ${scripts.length} total, ${executionState.scriptsRun} successful, ${executionState.scriptsFailed} failed`, 'INFO');
    log(`📈 Success Rate: ${successRate.toFixed(1)}%`, 'INFO');
    
    // Log detailed script status
    log('\n📋 SCRIPT EXECUTION STATUS:', 'INFO');
    console.table(scriptSummary);
    
    // Log system resource usage
    const memUsage = process.memoryUsage();
    log('\n💾 SYSTEM RESOURCE USAGE:', 'INFO');
    log(`Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB used / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB total`, 'INFO');
    log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`, 'INFO');
    log(`Load: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}`, 'INFO');
    
    // Final status message
    if (executionState.scriptsFailed > 0) {
      log(`\n⚠️  COMPLETED WITH ${executionState.scriptsFailed} OF ${scripts.length} SCRIPTS FAILING`, 'WARN');
    } else {
      log('\n🎉 ALL DATA UPDATES COMPLETED SUCCESSFULLY!', 'SUCCESS');
    }
    
    return {
      success: executionState.scriptsFailed === 0,
      total: scripts.length,
      successful: executionState.scriptsRun,
      failed: executionState.scriptsFailed,
      duration: totalDurationMs,
      results
    };
    
  } catch (error) {
    // This should only catch unexpected errors in the runAllUpdates function itself
    const endTime = new Date();
    const totalDurationMs = endTime - startTime;
    const errorMessage = `Fatal error during data updates: ${error.message}`;
    
    log(errorMessage, 'FATAL', {
      error: error.message,
      stack: error.stack,
      script: executionState.currentScript,
      duration: executionState.currentScript ? 
        `${((Date.now() - executionState.scriptStartTime) / 1000).toFixed(1)}s` : 'N/A',
      totalDuration: `${(totalDurationMs / 1000).toFixed(1)}s`
    });
    
    return {
      success: false,
      total: scripts.length,
      successful: executionState.scriptsRun,
      failed: scripts.length - executionState.scriptsRun,
      error: errorMessage,
      results
    };
  } finally {
    // Cleanup
    executionState.currentScript = null;
    executionState.scriptStartTime = null;
    executionState.lastRun = new Date();
    
    // Log final resource usage
    logResourceUsage(true);
  }
}

// Enhanced promisified version of child_process.exec
const execPromise = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = exec(command, {
      ...options,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 0, // No timeout
      killSignal: 'SIGTERM',
      encoding: 'utf8',
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        error.execError = error;
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });

    // Add error handlers to prevent unhandled rejections
    child.on('error', (error) => {
      error.isChildProcessError = true;
      reject(error);
    });

    // Handle process exit
    process.on('exit', () => {
      if (!child.killed) {
        child.killed = true;
        child.kill('SIGTERM');
      }
    });
  });
};

// Function to handle process termination gracefully
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    log(`Received ${signal}, shutting down gracefully...`, 'WARN');
    
    // Set a timeout to force exit if shutdown takes too long
    const forceShutdown = setTimeout(() => {
      log('Force shutdown after timeout', 'ERROR');
      process.exit(1);
    }, 30000); // 30 seconds
    
    // Clear the force shutdown timeout if we exit normally
    forceShutdown.unref();
    
    // Perform cleanup
    try {
      // Add any cleanup logic here
      log('Cleanup completed, exiting...');
      process.exit(0);
    } catch (error) {
      log(`Error during shutdown: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  };
  
  // Set up signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`, 'FATAL', {
      stack: error.stack,
      currentScript: executionState.currentScript
    });
    // Attempt to continue running if possible
    if (executionState.currentScript) {
      log('Attempting to continue with next script...', 'WARN');
    } else {
      shutdown('uncaughtException');
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    log('Unhandled Rejection at:', 'ERROR', {
      promise,
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined
    });
  });
}

// Export the runAllUpdates function for direct execution
module.exports = {
  runAllUpdates,
  runDaemon
};

// Function to run the daemon with enhanced monitoring
async function runDaemon() {
  try {
    // Log startup information
    const systemInfo = getSystemInfo();
    log('🚀 Starting data update daemon...', 'INFO', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      cwd: process.cwd(),
      system: {
        cpus: systemInfo.cpu.cores,
        memory: systemInfo.memory,
        load: systemInfo.load
      },
      env: process.env.NODE_ENV || 'development'
    });
    
    // Set up signal handlers and error monitoring
    setupGracefulShutdown();
    
    // Initial run
    log('Performing initial data update...');
    const result = await runAllUpdates();
    
    if (!result.success) {
      log(`Initial update completed with ${result.failed} failures`, 'WARN');
    }
    
    // Schedule periodic runs (e.g., every 24 hours)
    const interval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    log(`Initial update completed. Next update in ${interval / 1000 / 60} minutes.`);
    
    // Set up interval for periodic updates
    const updateInterval = setInterval(async () => {
      try {
        log('Starting scheduled data update...');
        const updateResult = await runAllUpdates();
        const nextUpdate = new Date(Date.now() + interval).toISOString();
        
        if (updateResult.success) {
          log(`✅ Scheduled update completed successfully. Next update at ${nextUpdate}`);
        } else {
          log(`⚠️  Scheduled update completed with ${updateResult.failed} failures. Next update at ${nextUpdate}`, 'WARN');
        }
      } catch (error) {
        log(`❌ Error during scheduled update: ${error.message}`, 'ERROR', {
          stack: error.stack,
          nextUpdate: new Date(Date.now() + interval).toISOString()
        });
      }
    }, interval);
    
    // Keep the process alive by keeping an open handle
    // This prevents the process from exiting when there are no other operations
    const keepAlive = setInterval(() => {
      log(`[${new Date().toISOString()}] Daemon is running...`, 'DEBUG');
    }, 3600000); // Log every hour to show it's still alive
    
    // Clean up intervals on process exit
    process.on('exit', () => {
      clearInterval(updateInterval);
      clearInterval(keepAlive);
    });
    
    // Handle uncaught exceptions in the interval
    // Remove unref() to keep the process alive
    
  } catch (error) {
    log(`Fatal error in daemon: ${error.message}`, 'FATAL', {
      stack: error.stack,
      currentScript: executionState.currentScript
    });
    process.exit(1);
  }
}

// Export the runAllUpdates function for direct execution
module.exports = {
  runAllUpdates,
  runDaemon
};

// Only start the daemon if this script is run directly
if (require.main === module) {
  runDaemon().catch(error => {
    console.error('Failed to start daemon:', error);
    process.exit(1);
  });
}
