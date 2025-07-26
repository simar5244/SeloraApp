#!/bin/bash

# LIGHTWEIGHT ANALYZER DEPLOYMENT SCRIPT
# Target: <200MB memory usage

echo "🚀 Starting Lightweight Employee Utilization Analyzer"
echo "📊 Memory target: <200MB"

# Function to monitor memory usage
monitor_memory() {
    while true; do
        sleep 5
        MEMORY=$(ps -p $1 -o rss= | awk '{print $1/1024}')
        echo "📊 Memory usage: ${MEMORY}MB"
        if (( $(echo "${MEMORY} > 200" | bc -l) )); then
            echo "⚠️  WARNING: Memory threshold exceeded!"
        fi
    done
}

# Function to choose analyzer based on memory constraints
choose_analyzer() {
    AVAILABLE_MEMORY=$(free -m | awk 'NR==2{print $7}')
    echo "Available memory: ${AVAILABLE_MEMORY}MB"
    
    if [ $AVAILABLE_MEMORY -lt 300 ]; then
        echo "🔧 Using rule-based analyzer (ultra-lightweight)"
        return 1
    else
        echo "🔧 Using lightweight ML analyzer"
        return 0
    fi
}

# Main execution
main() {
    cd "$(dirname "$0")"
    
    # Check Python dependencies
    echo "📋 Checking dependencies..."
    python3 -c "import pymongo, psutil, dotenv" 2>/dev/null || {
        echo "❌ Missing dependencies. Installing..."
        pip3 install pymongo psutil python-dotenv
    }
    
    # Choose analyzer based on available memory
    choose_analyzer
    USE_ML=$?
    
    if [ $USE_ML -eq 0 ]; then
        echo "🧠 Starting lightweight ML analyzer..."
        python3 lightweight_analyzer.py &
        PID=$!
    else
        echo "⚡ Starting rule-based analyzer..."
        python3 rule_based_analyzer.py &
        PID=$!
    fi
    
    # Monitor memory usage
    monitor_memory $PID &
    MONITOR_PID=$!
    
    # Wait for completion
    wait $PID
    EXIT_CODE=$?
    
    # Stop monitoring
    kill $MONITOR_PID 2>/dev/null
    
    echo "✅ Analysis complete with exit code: $EXIT_CODE"
    return $EXIT_CODE
}

# Error handling
trap 'echo "❌ Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"