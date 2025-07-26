#!/usr/bin/env python3
import logging
import os
import json
from pymongo import MongoClient, UpdateOne
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
import time
from datetime import datetime, timedelta
import re
import sys
import subprocess
import requests
import math
import argparse
from urllib.parse import urlparse, urlunparse
# LLM fallback removed as requested

# Ensure required libraries are installed
try:
    import faiss
except ImportError:
    print("Installing FAISS for vector search...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faiss-cpu"])
    import faiss

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logging.info("Employee Utilization Analyzer starting up...")

# --- Configuration ---
# Load environment variables
load_dotenv('.env.local', override=True)
load_dotenv()

# MongoDB connection settings
MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URI_BASE") or "mongodb://localhost:27017/"

# Normalize MongoDB URI by removing any default DB path for multi-tenancy
parsed = urlparse(MONGO_URI)
if parsed.path and parsed.path not in ['', '/']:
    parsed = parsed._replace(path='')
    MONGO_URI = urlunparse(parsed)
# Log the effective connection URI without DB path
logging.info(f"MongoDB URI: {MONGO_URI.replace('user:.*@', '***:***@')}")

# Collection names for multi-tenant setup
OUTPUT_COLLECTION = "users"  # operate only on users collection
USERS_COLLECTION = "users"

def load_benchmark_tasks() -> List[Dict[str, Any]]:
    """
    Load benchmark tasks from the JSON file.
    Returns a list of task dictionaries.
    """
    try:
        with open('benchmarktasks.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading benchmark tasks: {e}")
        return []

# Load benchmark tasks
BENCHMARK_TASKS = load_benchmark_tasks()

def get_representative_benchmark_tasks(n: int) -> List[Dict[str, Any]]:
    """
    Return top-n benchmark tasks as examples.
    """
    return BENCHMARK_TASKS[:n]

def load_role_complexity() -> Dict[str, float]:
    """
    Load role complexity data from JSON file.
    Returns a dictionary mapping role names to complexity scores.
    """
    try:
        with open('rolecomplexity.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading role complexity: {e}")
        return {"default": 0.5}

def load_job_role_ontology() -> Dict[str, str]:
    """
    Load job role ontology from JSON file.
    Returns a dictionary mapping specific job titles to canonical forms.
    """
    try:
        with open('jobroleontology.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading job role ontology: {e}")
        return {}

def load_job_categories() -> Dict[str, List[str]]:
    """
    Load job categories from JSON file.
    Returns a dictionary mapping categories to keyword lists.
    """
    try:
        with open('jobcategories.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading job categories: {e}")
        return {}

def load_tool_complexity() -> Dict[str, float]:
    """
    Load tool complexity data from JSON file.
    Returns a dictionary mapping tool names to complexity scores.
    """
    try:
        with open('toolcomplexity.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading tool complexity: {e}")
        return {"default": 0.5}

# --- Job Role Complexity by Seniority ---
ROLE_COMPLEXITY = load_role_complexity()

# --- Job Role Ontology ---
JOB_ROLE_ONTOLOGY = load_job_role_ontology()

# --- Job Categories ---
JOB_CATEGORIES = load_job_categories()

# --- Tool Complexity ---
TOOL_COMPLEXITY = load_tool_complexity()

# --- Project Status Weights ---
PROJECT_STATUS_WEIGHT = {
    "planning": 0.4,
    "in progress": 0.8,
    "active": 0.8,
    "on hold": 0.3,
    "completed": 0.1,
    "cancelled": 0.0,
    "default": 0.5
}

# --- Project Priority Weights ---
PROJECT_PRIORITY_WEIGHT = {
    "low": 0.3,
    "medium": 0.6,
    "high": 0.9,
    "critical": 1.0,
    "default": 0.5
}

# --- MongoDB Connection ---
client = None
db = None
model = None

def connect_db():
    global client, db
    try:
        if client is None:
            logging.info(f"Connecting to MongoDB at {MONGO_URI}...")
            client = MongoClient(MONGO_URI)
            client.admin.command('ismaster')
            logging.info("MongoDB connection successful.")
            # No default DB set for multi-tenancy; db will be selected per company
    except ConnectionFailure as e:
        logging.error(f"MongoDB connection failed: {e}")
        client = None
        db = None
    except Exception as e:
        logging.error(f"An error occurred during DB connection: {e}")
        client = None
        db = None

def load_model():
    global model
    try:
        logging.info("Loading sentence transformer model...")
        start_time = time.time()
        # Use a lightweight model for efficiency
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logging.info(f"Model loaded in {time.time() - start_time:.2f} seconds")
        
        # Pre-compute embeddings for benchmark tasks
        logging.info("Pre-computing benchmark task embeddings...")
        benchmark_embeddings()
    except Exception as e:
        logging.error(f"Error loading model: {e}")
        model = None

# --- Embedding and Similarity ---
benchmark_descriptions = []
benchmark_scores = []
benchmark_embeddings_cache = None

def benchmark_embeddings():
    """Pre-compute and cache benchmark task embeddings, then initialize vector search"""
    global benchmark_embeddings_cache, benchmark_descriptions, benchmark_scores
    
    benchmark_descriptions = [task["task_description"] for task in BENCHMARK_TASKS]
    benchmark_scores = [task["intensity_score"] for task in BENCHMARK_TASKS]
    
    if model is not None and benchmark_embeddings_cache is None:
        benchmark_embeddings_cache = model.encode(benchmark_descriptions, convert_to_numpy=True)
        logging.info(f"Cached embeddings for {len(benchmark_descriptions)} benchmark tasks")
        
        # Initialize vector search after generating embeddings
        initialize_vector_search()

def initialize_vector_search():
    """Initialize task and role vector indexes for semantic search"""
    global benchmark_embeddings_cache, benchmark_descriptions, benchmark_scores, task_vector_index, role_vector_index
    if model is None:
        logging.error("Model not loaded, cannot initialize vector search")
        return
    # Task index
    if benchmark_embeddings_cache is not None:
        try:
            dim = benchmark_embeddings_cache.shape[1]
            task_vector_index = faiss.IndexFlatL2(dim)
            task_vector_index.add(benchmark_embeddings_cache.astype(np.float32))
            logging.info(f"Initialized task vector index with {len(benchmark_descriptions)} items")
        except Exception as e:
            logging.error(f"Error initializing task vector index: {e}")
    # Role index
    try:
        role_keys = list(ROLE_COMPLEXITY.keys())
        role_embeddings = model.encode(role_keys, convert_to_numpy=True)
        dim_r = role_embeddings.shape[1]
        role_vector_index = faiss.IndexFlatL2(dim_r)
        role_vector_index.add(role_embeddings.astype(np.float32))
        logging.info(f"Initialized role vector index with {len(role_keys)} items")
    except Exception as e:
        logging.error(f"Error initializing role vector index: {e}")

def normalize_job_title(job_title: str) -> str:
    """
    Normalize job title using the job role ontology
    Returns the canonical form if found, otherwise returns the original
    """
    if not job_title:
        return ""
    
    # Preprocess job title
    normalized = job_title.lower().strip()
    
    # Check for exact match in ontology
    if normalized in JOB_ROLE_ONTOLOGY:
        return JOB_ROLE_ONTOLOGY[normalized]
    
    # Check for partial matches
    for specific, canonical in JOB_ROLE_ONTOLOGY.items():
        if specific in normalized:
            return canonical
    
    # If no match found, return original (preprocessed)
    return normalized
        
def get_job_categories(job_title: str) -> List[str]:
    """
    Identify categories that a job title belongs to
    Used for context-aware matching
    """
    if not job_title:
        return []
    
    # Preprocess job title
    normalized = job_title.lower().strip()
    
    # Check each category
    matched_categories = []
    for category, keywords in JOB_CATEGORIES.items():
        if any(keyword in normalized for keyword in keywords):
            matched_categories.append(category)
    
    return matched_categories

def vector_search_tasks(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Perform vector search against benchmark tasks
    Returns top k matches with scores and details
    """
    if not query or model is None or task_vector_index is None:
        return []
    
    try:
        # Encode the query
        query_embedding = model.encode([query], convert_to_numpy=True).astype(np.float32)
        
        # Search the index
        distances, indices = task_vector_index.search(query_embedding, top_k)
        
        # Convert L2 distances to cosine similarities
        # sim = 1 - (L2^2 / 2) for normalized vectors
        similarities = 1 - (distances[0] / 2)
        
        # Build results
        results = []
        for i, (idx, sim) in enumerate(zip(indices[0], similarities)):
            if idx >= 0 and idx < len(benchmark_descriptions):  # Ensure index is valid
                results.append({
                    "matched_task": benchmark_descriptions[idx],
                    "similarity": float(sim),
                    "intensity_score": benchmark_scores[idx],
                    "rank": i + 1
                })
        
        return results
    
    except Exception as e:
        logging.error(f"Error in vector search for tasks: {e}")
        return []

def vector_search_roles(query: str, categories: List[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Perform vector search against role complexity dictionary
    With optional category filtering for context-aware matching
    Returns top k matches with scores and details
    """
    if not query or model is None or role_vector_index is None:
        return []
    
    try:
        # Get all role keys
        role_keys = list(ROLE_COMPLEXITY.keys())
        
        # Filter by categories if provided
        if categories:
            filtered_roles = []
            for role in role_keys:
                role_categories = get_job_categories(role)
                # Only include roles that have matching categories
                if role_categories and any(cat in categories for cat in role_categories):
                    filtered_roles.append(role)
            
            # Debug logging
            logging.info(f"Categories to match: {categories}")
            logging.info(f"Filtered roles found: {len(filtered_roles)} roles")
            
            # If we have filtered roles, use those
            if filtered_roles:
                # Need to re-encode and create a new index for filtered roles
                filtered_embeddings = model.encode(filtered_roles, convert_to_numpy=True)
                
                # Create a temporary index
                dimension = filtered_embeddings.shape[1]
                temp_index = faiss.IndexFlatL2(dimension)
                temp_index.add(filtered_embeddings.astype(np.float32))
                
                # Encode the query
                query_embedding = model.encode([query], convert_to_numpy=True).astype(np.float32)
                
                # Search the filtered index
                distances, indices = temp_index.search(query_embedding, min(top_k, len(filtered_roles)))
                
                # Convert L2 distances to cosine similarities
                similarities = 1 - (distances[0] / 2)
                
                # Build results
                results = []
                for i, (idx, sim) in enumerate(zip(indices[0], similarities)):
                    if idx >= 0 and idx < len(filtered_roles):  # Ensure index is valid
                        role = filtered_roles[idx]
                        results.append({
                            "role": role,
                            "similarity": float(sim),
                            "complexity": ROLE_COMPLEXITY[role],
                            "rank": i + 1
                        })
                
                return results
        
        # If no categories provided or filtering yielded no results, search all roles
        # Encode the query
        query_embedding = model.encode([query], convert_to_numpy=True).astype(np.float32)
        
        # Search the index
        distances, indices = role_vector_index.search(query_embedding, top_k)
        
        # Convert L2 distances to cosine similarities
        similarities = 1 - (distances[0] / 2)
        
        # Build results
        results = []
        for i, (idx, sim) in enumerate(zip(indices[0], similarities)):
            if idx >= 0 and idx < len(role_keys):  # Ensure index is valid
                role = role_keys[idx]
                results.append({
                    "role": role,
                    "similarity": float(sim),
                    "complexity": ROLE_COMPLEXITY[role],
                    "rank": i + 1
                })
        
        return results
    
    except Exception as e:
        logging.error(f"Error in vector search for roles: {e}")
        return []

def preprocess_text(text: str) -> str:
    """Clean and standardize text for better embedding results"""
    if not text:
        return ""
    # Simple preprocessing: lowercase and strip extra whitespace
    return text.lower().strip()

def find_best_match(query: str, candidates: List[str]) -> Tuple[str, float]:
    """
    Find the best matching string from candidates based on semantic similarity
    Returns the best match and similarity score
    """
    if not query or not candidates or model is None:
        return "", 0.0
    
    query_embedding = model.encode([query], convert_to_numpy=True)
    candidate_embeddings = model.encode(candidates, convert_to_numpy=True)
    
    similarities = cosine_similarity(query_embedding, candidate_embeddings)[0]
    best_idx = np.argmax(similarities)
    
    return candidates[best_idx], float(similarities[best_idx])

def get_tool_complexity_score(tools_list: List[str]) -> Dict[str, Any]:
    """
    Calculate complexity score for a list of tools
    Returns a dict with overall score and details
    """
    # Handle empty or None input
    if not tools_list:
        return {
            "overall_score": 0.0,
            "tool_details": [],
            "avg_complexity": 0.0,
            "max_complexity": 0.0,
            "tool_count": 0
        }
    
    # Handle case where tools_proficient is a string (common in the data model)
    if isinstance(tools_list, str):
        # Convert comma-separated string to list
        tools_list = [tool.strip() for tool in tools_list.split(",") if tool.strip()]
    
    # If tools_list is still not a list or is empty after conversion
    if not isinstance(tools_list, list) or not tools_list:
        logging.warning(f"Invalid tools format after conversion: {type(tools_list)}")
        return {
            "overall_score": 0.0,
            "tool_details": [],
            "avg_complexity": 0.0,
            "max_complexity": 0.0,
            "tool_count": 0
        }
    
    tool_details = []
    total_complexity = 0.0
    max_complexity = 0.0
    
    for tool in tools_list:
        if not tool:  # Skip empty strings
            continue
            
        normalized_tool = preprocess_text(tool)
        # Try exact match first
        complexity = TOOL_COMPLEXITY.get(normalized_tool)
        
        # If no exact match, try fuzzy matching using the model
        if complexity is None and model is not None:
            best_match, best_score = find_best_match(normalized_tool, list(TOOL_COMPLEXITY.keys()))
            # Only use match if similarity is high enough
            if best_score > 0.8:
                complexity = TOOL_COMPLEXITY.get(best_match)
                logging.debug(f"Fuzzy matched '{normalized_tool}' to '{best_match}' with score {best_score}")
        
        # Use default if still no match
        if complexity is None:
            complexity = TOOL_COMPLEXITY["default"]
        
        tool_details.append({
            "tool": tool,
            "complexity": complexity
        })
        
        total_complexity += complexity
        max_complexity = max(max_complexity, complexity)
    
    # Protect against division by zero
    if len(tool_details) == 0:
        return {
            "overall_score": 0.0,
            "tool_details": [],
            "avg_complexity": 0.0,
            "max_complexity": 0.0,
            "tool_count": 0
        }
    
    avg_complexity = total_complexity / len(tool_details)
    
    # Calculate overall score, giving more weight to max complexity than average
    overall_score = (0.7 * max_complexity) + (0.3 * avg_complexity)
    
    return {
        "overall_score": overall_score,
        "tool_details": tool_details,
        "avg_complexity": avg_complexity,
        "max_complexity": max_complexity,
        "tool_count": len(tool_details)
    }

def get_role_complexity(job_title: str, role: str) -> Dict[str, Any]:
    """
    Calculate role complexity based on job title using vector search and job role ontology
    Uses semantic vector search to find the closest matching role
    Returns a dict with complexity score and matched role
    """
    # Default values
    complexity = 0.5
    matched_role = "default"
    
    # Normalize input
    normalized_title = preprocess_text(job_title) if job_title else ""
    
    # Quick return for empty input
    if not normalized_title:
        return {
            "complexity": complexity,
            "matched_role": matched_role,
            "input_job_title": job_title,
            "input_role": role,
            "categories": [],
            "analysis_method": "default"
        }
    
    # Step 1: Normalize job title using ontology
    canonical_title = normalize_job_title(normalized_title)
    
    # Step 2: Identify job categories for context-aware matching
    categories = get_job_categories(normalized_title)
    
    # Step 3: Direct match against ROLE_COMPLEXITY dictionary
    if canonical_title in ROLE_COMPLEXITY:
        complexity = ROLE_COMPLEXITY[canonical_title]
        matched_role = canonical_title
        return {
            "complexity": complexity,
            "matched_role": matched_role,
            "input_job_title": job_title,
            "canonical_title": canonical_title,
            "categories": categories,
            "analysis_method": "ontology_direct_match"
        }
    
    # Step 4: Vector search within the same category
    if model is not None and role_vector_index is not None:
        # Perform vector search with category filtering
        matches = vector_search_roles(canonical_title, categories=categories, top_k=3)
        
        if matches:
            best_match = matches[0]
            matched_role = best_match["role"]
            complexity = best_match["complexity"]
            
            # Log the match details for debugging
            logging.info(f"Vector matched '{normalized_title}' (canonical: '{canonical_title}') to '{matched_role}' with similarity {best_match['similarity']:.3f}")
            
            # If confidence is too low (0.5 or below), use default score
            if best_match["similarity"] <= 0.5:
                logging.info(f"Similarity {best_match['similarity']:.3f} too low, using default complexity 0.5")
                complexity = 0.5
            
            return {
                "complexity": complexity,
                "matched_role": matched_role,
                "input_job_title": job_title,
                "canonical_title": canonical_title,
                "categories": categories,
                "vector_match": best_match,
                "all_matches": matches,
                "analysis_method": "vector_search_match"
            }
    
    # Special case handling
    if "assistant" in normalized_title:
        # Check for domain-specific assistants
        if "software" in normalized_title or "developer" in normalized_title or "engineer" in normalized_title:
            # Map software assistants to junior developers with adjusted complexity
            matched_role = "junior developer"
            complexity = ROLE_COMPLEXITY.get("junior developer", 0.4)
            logging.info(f"Special case: Mapped 'software assistant' to 'junior developer'")
        elif "executive" in normalized_title:
            # Executive assistants have higher responsibility
            matched_role = "executive assistant"
            complexity = 0.6
            logging.info(f"Special case: Recognized 'executive assistant'")
        else:
            # Default assistant mapping
            matched_role = "administrative assistant"
            complexity = 0.3
            logging.info(f"Special case: Mapped generic assistant to 'administrative assistant'")
            
        return {
            "complexity": complexity,
            "matched_role": matched_role,
            "input_job_title": job_title,
            "canonical_title": canonical_title,
            "categories": categories,
            "analysis_method": "special_case_handling"
        }
    
    # Manager type differentiation
    if "manager" in normalized_title:
        # Check for manager domains to set appropriate complexity
        high_importance_domains = ["hr", "human resources", "engineering", "finance", "software", "product", 
                                   "sales", "marketing", "operations", "development"]
        medium_importance_domains = ["project", "account", "customer", "support", "it", "facility", "office"]
        low_importance_domains = ["snack", "party", "certificate", "entertainment"]
        
        if any(domain in normalized_title for domain in high_importance_domains):
            complexity = 0.8
            matched_role = "manager"  # Generic high-importance manager
        elif any(domain in normalized_title for domain in medium_importance_domains):
            complexity = 0.6
            matched_role = "coordinator"  # Medium-importance role
        elif any(domain in normalized_title for domain in low_importance_domains):
            complexity = 0.4
            matched_role = "coordinator"  # Low-importance role
        else:
            complexity = 0.6  # Default manager complexity
            matched_role = "manager"
            
        return {
            "complexity": complexity,
            "matched_role": matched_role,
            "input_job_title": job_title,
            "canonical_title": canonical_title,
            "categories": categories,
            "analysis_method": "manager_domain_analysis"
        }
    
    # If we have categories but no match yet, use the first category as a fallback
    if categories:
        category_mapping = {
            "software_development": ("software developer", 0.6),
            "data_science": ("data analyst", 0.6),
            "design": ("designer", 0.6),
            "management": ("manager", 0.7),
            "administrative": ("administrative assistant", 0.3),
            "customer_service": ("customer service representative", 0.4),
            "sales": ("sales representative", 0.5),
            "marketing": ("marketing specialist", 0.5),
            "finance": ("financial analyst", 0.6),
            "hr": ("hr specialist", 0.5),
            "operations": ("operations coordinator", 0.5),
            "it": ("it support", 0.5)
        }
        
        primary_category = categories[0]
        if primary_category in category_mapping:
            matched_role, complexity = category_mapping[primary_category]
            
            return {
                "complexity": complexity,
                "matched_role": matched_role,
                "input_job_title": job_title,
                "canonical_title": canonical_title,
                "categories": categories,
                "primary_category": primary_category,
                "analysis_method": "category_fallback"
            }
    
    # Last resort - use default values
    return {
        "complexity": complexity,
        "matched_role": matched_role,
        "input_job_title": job_title,
        "canonical_title": canonical_title if normalized_title else "",
        "categories": categories,
        "analysis_method": "default_fallback"
    }

def calculate_project_load(projects: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate project load based on projects array with an improved mathematical model
    Considers project count, status, priority, deadline proximity, and role responsibility
    Uses logarithmic scaling for project count to prevent runaway scores
    Includes pressure_handling score based on deadline management and project complexity
    """
    if not projects:
        return {
            "project_count": 0,
            "active_project_count": 0,
            "average_priority": 0.0,
            "time_pressure_score": 0.0,
            "overlap_score": 0.0,
            "overall_load_score": 0.0,
            "project_details": []
        }
    
    active_count = 0
    total_priority = 0.0
    project_details = []
    now = datetime.now()
    
    # Time pressure variables
    time_pressure_scores = []
    
    # Pressure handling variables
    critical_projects = 0
    high_priority_projects = 0
    medium_priority_projects = 0
    low_priority_projects = 0
    tight_deadline_projects = 0  # Projects due within 14 days
    complex_task_projects = 0    # Projects with high complexity tasks
    
    # Proximity importance - projects due within these days get higher weights
    critical_proximity = 7   # Within a week (highest pressure)
    high_proximity = 14      # Within two weeks
    medium_proximity = 30    # Within a month
    
    # Role importance factors - certain roles have more responsibility
    role_importance_factors = {
        "lead": 1.3,
        "manager": 1.4,
        "owner": 1.3,
        "architect": 1.3,
        "primary": 1.2,
        "coordinator": 1.2,
        "director": 1.5,
        "responsible": 1.2,
        "key": 1.2,
        "critical": 1.3,
        "default": 1.0
    }
    
    # Track project overlap for time periods
    timeline_segments = {}  # Maps time periods to active project count
    
    # Process each project
    for project in projects:
        # Extract basic project info
        project_id = project.get("project_id", "unknown")
        project_title = project.get("project_title", "Untitled Project")
        status = preprocess_text(project.get("project_status", ""))
        priority = preprocess_text(project.get("project_priority", ""))
        
        # Extract user's role in the project
        user_contribution = project.get("user_contribution", {})
        role_in_project = preprocess_text(user_contribution.get("role_in_project", ""))
        
        # Track project hours (explicitly mentioned or estimated)
        hours_per_week = user_contribution.get("hours_per_week", 0)
        if hours_per_week == 0:
            # Estimate based on role and priority if not specified
            if "lead" in role_in_project or "manager" in role_in_project:
                hours_per_week = 8  # Default for leadership roles
            elif "critical" in priority or "high" in priority:
                hours_per_week = 6  # Default for high priority projects
            else:
                hours_per_week = 4  # Default for standard projects
        
        # Determine role importance factor
        role_factor = role_importance_factors["default"]
        for role_key, factor in role_importance_factors.items():
            if role_key in role_in_project:
                role_factor = factor
                break
        
        # Get status weight (default 0.5 if not found)
        status_weight = PROJECT_STATUS_WEIGHT.get(status, PROJECT_STATUS_WEIGHT["default"])
        
        # Get priority weight (default 0.5 if not found)
        priority_weight = PROJECT_PRIORITY_WEIGHT.get(priority, PROJECT_PRIORITY_WEIGHT["default"])
        
        # Count active projects with adjusted definition of "active"
        if status_weight >= 0.5:  # Consider as active if status weight is significant
            active_count += 1
        
        # Add to total priority
        total_priority += priority_weight
        
        # Track projects by priority for pressure handling calculation
        if "critical" in priority:
            critical_projects += 1
        elif "high" in priority:
            high_priority_projects += 1
        elif "medium" in priority:
            medium_priority_projects += 1
        else:
            low_priority_projects += 1
        
        # Process dates for time pressure analysis
        start_date_str = project.get("project_start_date")
        end_date_str = project.get("project_end_date")
        start_date = None
        end_date = None
        
        # Parse dates if available
        try:
            if start_date_str:
                if isinstance(start_date_str, str):
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                elif isinstance(start_date_str, datetime):
                    start_date = start_date_str
            if end_date_str:
                if isinstance(end_date_str, str):
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                elif isinstance(end_date_str, datetime):
                    end_date = end_date_str
        except (ValueError, TypeError) as e:
            logging.debug(f"Error parsing dates for project {project_id}: {e}")
        
        # Calculate days remaining if end date exists
        days_remaining = None
        if end_date and end_date > now:
            days_remaining = (end_date - now).days
        
        # Calculate time pressure with exponential decay as deadline approaches
        time_pressure = 0.0
        if days_remaining is not None:
            if days_remaining <= 0:
                # Overdue projects get maximum pressure
                time_pressure = 1.0
            elif days_remaining <= critical_proximity:
                # Critical proximity: 7 days or less (exponential increase)
                time_pressure = 0.7 + (0.3 * (1 - (days_remaining / critical_proximity)))
            elif days_remaining <= high_proximity:
                # High proximity: 14 days or less
                time_pressure = 0.5 + (0.2 * (1 - ((days_remaining - critical_proximity) / (high_proximity - critical_proximity))))
                tight_deadline_projects += 1  # Track tight deadline projects
            elif days_remaining <= medium_proximity:
                # Medium proximity: 30 days or less
                time_pressure = 0.3 + (0.2 * (1 - ((days_remaining - high_proximity) / (medium_proximity - high_proximity))))
            else:
                # Low proximity: more than 30 days
                time_pressure = 0.3 * np.exp(-0.02 * (days_remaining - medium_proximity))
        
        # Adjust time pressure by priority and status
        adjusted_time_pressure = time_pressure * priority_weight * status_weight * role_factor
        
        if adjusted_time_pressure > 0:
            time_pressure_scores.append(adjusted_time_pressure)
        
        # Track project timeline for overlap analysis
        if start_date and end_date and status_weight >= 0.5:
            current_date = start_date
            while current_date <= end_date:
                week_key = current_date.strftime("%Y-%W")  # Year and week number
                if week_key in timeline_segments:
                    timeline_segments[week_key] += 1
                else:
                    timeline_segments[week_key] = 1
                
                # Move to next week
                current_date += timedelta(days=7)
        
        # Build project detail record
        project_detail = {
            "project_id": project_id,
            "project_title": project_title,
            "status": status,
            "status_weight": status_weight,
            "priority": priority,
            "priority_weight": priority_weight,
            "role": role_in_project,
            "role_factor": role_factor
        }
        
        if days_remaining is not None:
            project_detail["days_remaining"] = days_remaining
            project_detail["time_pressure"] = time_pressure
            project_detail["adjusted_time_pressure"] = adjusted_time_pressure
        
        project_details.append(project_detail)
    
    # Calculate average priority
    avg_priority = total_priority / len(projects) if projects else 0.0
    
    # Calculate time pressure score using combination of max and average
    # This puts more weight on high-pressure projects but considers all projects
    max_time_pressure = max(time_pressure_scores) if time_pressure_scores else 0.0
    avg_time_pressure = sum(time_pressure_scores) / len(time_pressure_scores) if time_pressure_scores else 0.0
    time_pressure_score = (0.7 * max_time_pressure) + (0.3 * avg_time_pressure)
    
    # Calculate overlap score using the maximum concurrent projects and logarithmic scaling
    max_concurrent = max(timeline_segments.values()) if timeline_segments else 0
    # Logarithmic scaling prevents extreme values for many concurrent projects
    # Formula: min(1.0, 0.3*ln(x+1)+0.4) where x is max_concurrent
    overlap_score = min(1.0, 0.3 * np.log(max_concurrent + 1) + 0.4) if max_concurrent > 1 else 0.0
    
    # Calculate project count factor with logarithmic scaling
    # Formula: min(1.0, 0.3*ln(x+1)+0.2) where x is active_count
    project_count_factor = min(1.0, 0.3 * np.log(active_count + 1) + 0.2)
    
    # Calculate overall load score with weighted components
    # 30% time pressure, 25% project count, 25% overlap, 20% average priority
    overall_load_score = (0.30 * time_pressure_score) + \
                         (0.25 * project_count_factor) + \
                         (0.25 * overlap_score) + \
                         (0.20 * avg_priority)
    
    # Ensure overall score is between 0 and 1
    overall_load_score = max(0.0, min(1.0, overall_load_score))
    
    # Return comprehensive analysis
    return {
        "project_count": len(projects),
        "active_project_count": active_count,
        "average_priority": avg_priority,
        "time_pressure_score": time_pressure_score,
        "project_count_factor": project_count_factor,
        "overlap_score": overlap_score,
        "max_concurrent_projects": max_concurrent,
        "overall_load_score": overall_load_score,
        "project_details": project_details
    }

def calculate_responsibility_breadth(projects: List[Dict[str, Any]], role: str, job_title: str) -> Dict[str, Any]:
    """
    Calculate responsibility breadth based on role, job title, and project roles
    Enhanced to detect role overlaps and compare against seniority expectations
    Returns detailed analysis of responsibility distribution and overlaps
    """
    normalized_role = preprocess_text(role) if role else ""
    normalized_title = preprocess_text(job_title) if job_title else ""
    
    # Check for management indicators in role/title
    management_keywords = ["manager", "director", "lead", "chief", "head", "vp", "president", "officer", "supervisor"]
    is_management_role = any(keyword in normalized_role or keyword in normalized_title for keyword in management_keywords)
    
    # Determine expected seniority level
    seniority_keywords = {
        "junior": 0.3,
        "associate": 0.4,
        "entry": 0.3,
        "mid": 0.5,
        "intermediate": 0.5,
        "senior": 0.7,
        "staff": 0.7,
        "principal": 0.9,
        "lead": 0.8,
        "head": 0.9,
        "chief": 1.0,
        "vp": 0.9,
        "executive": 0.9,
        "director": 0.9,
        "manager": 0.8,
        "supervisor": 0.7
    }
    
    # Extract seniority level from job title
    seniority_level = 0.5  # Default mid-level
    for keyword, level in seniority_keywords.items():
        if keyword in normalized_title:
            seniority_level = level
            break
    
    # Get expected responsibilities based on seniority
    expected_responsibility_distribution = {}
    if seniority_level <= 0.4:  # Junior
        expected_responsibility_distribution = {
            "execution": 0.8,
            "technical_leadership": 0.1,
            "mentoring": 0.0,
            "management": 0.1
        }
    elif seniority_level <= 0.6:  # Mid-level
        expected_responsibility_distribution = {
            "execution": 0.6,
            "technical_leadership": 0.2,
            "mentoring": 0.1,
            "management": 0.1
        }
    elif seniority_level <= 0.8:  # Senior
        expected_responsibility_distribution = {
            "execution": 0.4,
            "technical_leadership": 0.3,
            "mentoring": 0.2,
            "management": 0.1
        }
    else:  # Lead/Principal/Management
        expected_responsibility_distribution = {
            "execution": 0.2,
            "technical_leadership": 0.3,
            "mentoring": 0.2,
            "management": 0.3
        }
    
    # Initialize counters for different responsibility types
    management_count = 0
    mentoring_count = 0
    technical_lead_count = 0
    execution_count = 0
    
    # Dictionary to track role overlaps
    role_types = set()
    domain_overlaps = {}
    responsibility_overlaps = []
    
    # Count project roles by type
    if projects:
        for project in projects:
            user_contribution = project.get("user_contribution", {})
            role_in_project = preprocess_text(user_contribution.get("role_in_project", ""))
            
            # Count role by type
            role_classified = False
            
            # Check for management roles
            if any(keyword in role_in_project for keyword in ["manager", "director", "lead", "chief", "head"]):
                management_count += 1
                role_types.add("management")
                role_classified = True
            
            # Check for mentoring roles
            if any(keyword in role_in_project for keyword in ["mentor", "coach", "train", "supervise"]):
                mentoring_count += 1
                role_types.add("mentoring")
                role_classified = True
            
            # Check for technical leadership
            if any(keyword in role_in_project for keyword in ["architect", "principal", "senior", "tech lead", "expert", "specialist"]):
                technical_lead_count += 1
                role_types.add("technical_leadership")
                role_classified = True
            
            # Otherwise count as execution
            if not role_classified:
                execution_count += 1
                role_types.add("execution")
            
            # Track domain overlaps
            project_domain = project.get("project_domain", "")
            tech_stack = project.get("tech_stack", [])
            
            if project_domain:
                if project_domain in domain_overlaps:
                    domain_overlaps[project_domain] += 1
                else:
                    domain_overlaps[project_domain] = 1
            
            if isinstance(tech_stack, list):
                for tech in tech_stack:
                    if tech in domain_overlaps:
                        domain_overlaps[tech] += 1
                    else:
                        domain_overlaps[tech] = 1
    
    # Calculate percentages
    total_roles = max(1, management_count + mentoring_count + technical_lead_count + execution_count)
    management_pct = management_count / total_roles
    mentoring_pct = mentoring_count / total_roles
    technical_lead_pct = technical_lead_count / total_roles
    execution_pct = execution_count / total_roles
    
    # Detect significant role overlaps
    actual_role_distribution = {
        "management": management_pct,
        "mentoring": mentoring_pct,
        "technical_leadership": technical_lead_pct,
        "execution": execution_pct
    }
    
    # Check for overlapping responsibilities (performing multiple roles)
    if len(role_types) > 2:  # More than 2 different types of roles
        responsibility_overlaps.append("Multiple role types (management, technical, execution)")
    
    # Check for domain overlaps (working across multiple domains)
    multiple_domain_count = sum(1 for count in domain_overlaps.values() if count > 1)
    if multiple_domain_count > 1:
        responsibility_overlaps.append(f"Working across {multiple_domain_count} overlapping domains")
    
    # Compare against expected distribution based on seniority
    distribution_gaps = {}
    for role_type, expected_pct in expected_responsibility_distribution.items():
        actual_pct = actual_role_distribution.get(role_type, 0.0)
        gap = actual_pct - expected_pct
        distribution_gaps[role_type] = gap
        
        # Flag significant deviations
        if gap > 0.2:
            responsibility_overlaps.append(f"Overloaded with {role_type} responsibilities (+{gap:.2f})")
    
    # Calculate overutilization due to role mismatch
    role_mismatch_score = 0.0
    positive_gaps = [gap for gap in distribution_gaps.values() if gap > 0]
    if positive_gaps:
        role_mismatch_score = sum(positive_gaps) / len(positive_gaps)
    
    # Calculate breadth score
    # Higher weights for management and mentoring roles
    breadth_score = (management_pct * 1.0) + (mentoring_pct * 0.8) + (technical_lead_pct * 0.6) + (execution_pct * 0.3)
    
    # Adjust score based on formal role
    if is_management_role:
        breadth_score = max(breadth_score, 0.7)  # Ensure minimum breadth for management roles
    
    # Look for multiple technical domains in projects
    unique_domains = set()
    for project in projects if projects else []:
        tech_stack = project.get("tech_stack", [])
        if isinstance(tech_stack, list):
            unique_domains.update(tech_stack)
    
    # Adjust breadth score based on technical domain variety
    domain_variety_score = min(1.0, len(unique_domains) / 5.0)  # Normalize to max of 1.0
    breadth_score = (breadth_score * 0.7) + (domain_variety_score * 0.3)
    
    # Expected score based on role complexity
    role_complexity_info = get_role_complexity(job_title, role)
    expected_breadth = role_complexity_info["complexity"]
    
    # Calculate gap between actual and expected
    breadth_gap = breadth_score - expected_breadth
    
    # Calculate overlap factor (higher when doing many different roles)
    overlap_factor = min(1.0, len(role_types) / 3.0)
    
    # Determine if employee is overutilized due to role overlaps
    is_overutilized = len(responsibility_overlaps) >= 2 or role_mismatch_score > 0.3 or breadth_gap > 0.2
    
    return {
        "breadth_score": breadth_score,
        "expected_breadth": expected_breadth,
        "breadth_gap": breadth_gap,
        "is_management_role": is_management_role,
        "seniority_level": seniority_level,
        "role_distribution": {
            "management": management_pct,
            "mentoring": mentoring_pct,
            "technical_leadership": technical_lead_pct,
            "execution": execution_pct
        },
        "expected_distribution": expected_responsibility_distribution,
        "distribution_gaps": distribution_gaps,
        "domain_variety": {
            "unique_domains": len(unique_domains),
            "domains": list(unique_domains) if len(unique_domains) <= 10 else list(unique_domains)[:10]
        },
        "role_overlaps": {
            "overlap_count": len(role_types),
            "overlap_factor": overlap_factor,
            "role_types": list(role_types),
            "domain_overlaps": {k: v for k, v in domain_overlaps.items() if v > 1},
            "responsibility_overlaps": responsibility_overlaps,
            "is_overutilized": is_overutilized,
            "role_mismatch_score": role_mismatch_score
        }
    }

def calculate_utilization_score(
    tools_analysis: Dict[str, Any],
    role_analysis: Dict[str, Any],
    project_analysis: Dict[str, Any],
    responsibility_analysis: Dict[str, Any],
    job_intensity_analysis: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Calculate overall utilization score based on all dimensions with improved mathematical model
    Now incorporates pressure_handling score and enhanced role overlap detection
    Returns detailed utilization assessment with multiple dimensional scores
    """
    # Extract key scores from each dimension
    tool_complexity = tools_analysis.get("overall_score", 0.5)
    role_complexity = role_analysis.get("complexity", 0.5)
    project_load = project_analysis.get("overall_load_score", 0.5)
    pressure_handling = project_analysis.get("pressure_handling_score", 0.5)
    breadth_score = responsibility_analysis.get("breadth_score", 0.5)
    breadth_gap = responsibility_analysis.get("breadth_gap", 0.0)
    
    # Get role overlap information
    role_overlaps = responsibility_analysis.get("role_overlaps", {})
    is_overutilized_by_roles = role_overlaps.get("is_overutilized", False)
    overlap_factor = role_overlaps.get("overlap_factor", 0.0)
    role_mismatch_score = role_overlaps.get("role_mismatch_score", 0.0)
    
    # Include job intensity if available
    job_intensity = 0.0
    workload_factor = 1.0  # Default factor (neutral) if no job intensity data
    
    if job_intensity_analysis:
        # Use adjusted intensity if available, otherwise use weighted intensity
        if "adjusted_intensity" in job_intensity_analysis:
            job_intensity = job_intensity_analysis.get("adjusted_intensity", 0.0)
        else:
            job_intensity = job_intensity_analysis.get("weighted_intensity", 0.0)
        
        # Get workload factor which accounts for total hours worked
        workload_factor = job_intensity_analysis.get("workload_factor", 1.0)
    
    # Calculate raw utilization score with pressure handling component
    # Formula: (0.15 * tool complexity) + (0.2 * project load) + (0.1 * pressure handling) + 
    #          (0.2 * breadth score) + (0.15 * role complexity) + (0.2 * job intensity)
    raw_utilization = (0.15 * tool_complexity) + \
                      (0.2 * project_load) + \
                      (0.1 * pressure_handling) + \
                      (0.2 * breadth_score) + \
                      (0.15 * role_complexity)
    
    # Add job intensity component if available
    if job_intensity_analysis:
        raw_utilization += (0.2 * job_intensity)
    else:
        # Redistribute weights if no job intensity
        raw_utilization = (0.15 * tool_complexity) + \
                          (0.25 * project_load) + \
                          (0.1 * pressure_handling) + \
                          (0.3 * breadth_score) + \
                          (0.2 * role_complexity)
    
    # Apply workload factor to the raw score
    # This accounts for total hours worked (part-time vs full-time vs overtime)
    workload_adjusted_utilization = raw_utilization * workload_factor
    
    # Role overlap adjustment
    # If employee has significant role overlaps, increase utilization score
    role_overlap_adjustment = 0.0
    if is_overutilized_by_roles:
        role_overlap_adjustment = overlap_factor * role_mismatch_score * 0.3
    
    # Adjust for breadth gap
    # Positive gap means doing more than expected for role
    breadth_adjustment = breadth_gap * 0.2
    
    # Calculate final adjusted score
    adjusted_utilization = workload_adjusted_utilization + role_overlap_adjustment + breadth_adjustment
    
    # Ensure score is between 0-1
    final_utilization = max(0.0, min(1.0, adjusted_utilization))
    
    # Determine utilization status with more detailed categories
    if final_utilization < 0.3:
        status = "severely_underutilized"
    elif final_utilization < 0.45:
        status = "underutilized"
    elif final_utilization < 0.75:
        status = "optimal"
    elif final_utilization < 0.9:
        status = "highly_utilized"
    else:
        status = "overutilized"
    
    # Override status if clearly overutilized by role overlaps
    if is_overutilized_by_roles and role_overlaps.get("responsibility_overlaps", []):
        if final_utilization >= 0.7:  # Already somewhat high
            status = "overutilized"
        else:  # Otherwise mark as highly utilized
            status = "highly_utilized"
    
    # Calculate confidence score based on data completeness
    confidence_factors = []
    
    # Tool data confidence
    if tools_analysis.get("tool_count", 0) > 2:
        confidence_factors.append(1.0)
    elif tools_analysis.get("tool_count", 0) > 0:
        confidence_factors.append(0.7)
    else:
        confidence_factors.append(0.3)  # Low confidence if no tools data
    
    # Role data confidence
    if role_analysis.get("matched_role") != "default":
        confidence_factors.append(1.0)
    else:
        confidence_factors.append(0.5)  # Medium confidence if role not matched
    
    # Project data confidence
    if project_analysis.get("project_count", 0) > 2:
        confidence_factors.append(1.0)
    elif project_analysis.get("project_count", 0) > 0:
        confidence_factors.append(0.7)
    else:
        confidence_factors.append(0.4)  # Low-medium confidence if no projects
    
    # Job duties confidence
    if job_intensity_analysis and job_intensity_analysis.get("total_hours", 0) >= 35:
        confidence_factors.append(1.0)  # High confidence with nearly full workweek
    elif job_intensity_analysis and job_intensity_analysis.get("total_hours", 0) > 0:
        # Scale confidence based on hours reported (more hours = more confidence)
        hours_confidence = min(1.0, job_intensity_analysis.get("total_hours", 0) / 40)
        confidence_factors.append(0.5 + (0.5 * hours_confidence))
    elif job_intensity_analysis:
        confidence_factors.append(0.5)  # Medium confidence if job intensity exists but no hours
    else:
        confidence_factors.append(0.3)  # Low confidence if no job intensity data
    
    confidence_score = sum(confidence_factors) / len(confidence_factors)
    
    # Calculate dimensional breakdown for explaining utilization
    dimensional_factors = {
        "tool_complexity": tool_complexity,
        "project_load": project_load,
        "pressure_handling": pressure_handling, 
        "responsibility_breadth": breadth_score,
        "role_complexity": role_complexity
    }
    
    if job_intensity_analysis:
        dimensional_factors["job_intensity"] = job_intensity
    
    return {
        "utilization_score": final_utilization,
        "utilization_status": status,
        "confidence_score": confidence_score,
        "raw_score": raw_utilization,
        "workload_factor": workload_factor,
        "workload_adjusted_score": workload_adjusted_utilization,
        "breadth_adjustment": breadth_adjustment,
        "role_overlap_adjustment": role_overlap_adjustment,
        "dimensional_breakdown": dimensional_factors,
        "role_overlap_analysis": {
            "is_overutilized_by_roles": is_overutilized_by_roles,
            "overlap_factor": overlap_factor,
            "role_mismatch_score": role_mismatch_score,
            "responsibility_overlaps": role_overlaps.get("responsibility_overlaps", [])
        },
        "includes_job_intensity": job_intensity_analysis is not None
    }

def get_task_intensity(duty_description: str) -> Dict[str, Any]:
    """
    Calculate intensity score for a given duty description using vector semantic search
    Uses FAISS-based vector index for efficient semantic matching
    Falls back to LLM analysis for cases with no good match
    Returns a dict with original task, matched tasks, similarity scores, and intensity score
    """
    if model is None or task_vector_index is None:
        logging.error("Model or task vector index not available")
        return {
            "original_task": duty_description,
            "matched_task": "unknown",
            "similarity": 0.0,
            "intensity_score": 0.5  # Default score
        }
    
    # Preprocess the duty description
    processed_description = preprocess_text(duty_description)
    if not processed_description:
        return {
            "original_task": duty_description,
            "matched_task": "empty description",
            "similarity": 0.0,
            "intensity_score": 0.1  # Minimal score for empty descriptions
        }
    
    # Check if this is a compound task by looking for conjunctions and separators
    conjunctions = [" and ", " & ", ", ", "; "]
    is_compound = any(conj in processed_description for conj in conjunctions)
    
    # If it's not compound, process using vector search
    if not is_compound:
        # Get top 3 matches
        top_matches = vector_search_tasks(processed_description, top_k=3)
        
        # Higher threshold for direct match acceptance (tightened from 0.6 to 0.65)
        DIRECT_MATCH_THRESHOLD = 0.65
        
        if not top_matches:
            # No matches at all - use default values
            return {
                "original_task": duty_description,
                "matched_task": "no matches found",
                "similarity": 0.0,
                "intensity_score": 0.5,
                "explanation": "No good matches found",
                "analysis_method": "default"
            }
        
        # Use the best match if it's above threshold
        best_match = top_matches[0]
        if best_match["similarity"] >= DIRECT_MATCH_THRESHOLD:
            return {
                "original_task": duty_description,
                "matched_task": best_match["matched_task"],
                "similarity": best_match["similarity"],
                "intensity_score": best_match["intensity_score"],
                "analysis_method": "vector_search_direct_match"
            }
        
        # If best match is below threshold but still decent (0.55-0.65), calculate weighted average of top matches
        if best_match["similarity"] >= 0.55:
            weighted_sum = sum(match["intensity_score"] * match["similarity"] for match in top_matches)
            total_similarity = sum(match["similarity"] for match in top_matches)
            
            if total_similarity > 0:
                weighted_intensity = weighted_sum / total_similarity
            else:
                weighted_intensity = 0.5
            
            return {
                "original_task": duty_description,
                "top_matches": top_matches,
                "similarity": best_match["similarity"],  # Use best match similarity
                "intensity_score": weighted_intensity,
                "analysis_method": "vector_search_weighted_average"
            }
        
        # For lower similarity (below 0.55), use default values
        return {
            "original_task": duty_description,
            "matched_task": "low similarity matches",
            "similarity": best_match["similarity"],
            "intensity_score": 0.5,
            "top_matches": top_matches[:2],  # Include top 2 matches for reference
            "explanation": "Low similarity to benchmark tasks",
            "analysis_method": "default_low_similarity"
        }
    
    # For compound tasks, split and analyze each component
    else:
        sub_tasks = []
        
        # Try different splitting strategies
        for conj in conjunctions:
            if conj in processed_description:
                sub_task_descriptions = processed_description.split(conj)
                # Process each sub-task
                for sub_desc in sub_task_descriptions:
                    if sub_desc.strip():  # Skip empty strings
                        sub_task_result = get_task_intensity(sub_desc.strip())
                        sub_tasks.append(sub_task_result)
                
                # If we found sub-tasks, calculate weighted average of intensity scores
                if sub_tasks:
                    weights = [st.get("similarity", 0.5) for st in sub_tasks]
                    total_weight = sum(weights)
                    
                    # Protect against division by zero
                    if total_weight > 0:
                        weighted_intensity = sum(st["intensity_score"] * st.get("similarity", 0.5) for st in sub_tasks) / total_weight
                    else:
                        weighted_intensity = sum(st["intensity_score"] for st in sub_tasks) / len(sub_tasks)
                    
                    # Ensure we're using the highest intensity when appropriate
                    # For tasks that include high-intensity components
                    max_intensity = max(st["intensity_score"] for st in sub_tasks)
                    if max_intensity > 0.7:
                        # Bias toward the higher intensity tasks
                        weighted_intensity = (weighted_intensity * 0.7) + (max_intensity * 0.3)
                    
                    return {
                        "original_task": duty_description,
                        "compound_task": True,
                        "sub_tasks": sub_tasks,
                        "intensity_score": weighted_intensity,
                        "analysis_method": "vector_search_compound_analysis"
                    }
                
                # If we split but didn't find valid sub-tasks, break and fall back to normal analysis
                break
        
        # Fallback: analyze as a single task if splitting didn't work well
        top_matches = vector_search_tasks(processed_description, top_k=5)
        
        # Higher threshold for direct match acceptance
        COMPOUND_MATCH_THRESHOLD = 0.6  # Slightly lower than single task threshold
        
        if not top_matches:
            # No matches at all - use default values
            return {
                "original_task": duty_description,
                "matched_task": "no matches found",
                "similarity": 0.0,
                "intensity_score": 0.5,
                "explanation": "No good matches found",
                "analysis_method": "default"
            }
        
        # Best match above threshold - use it directly
        best_match = top_matches[0]
        if best_match["similarity"] >= COMPOUND_MATCH_THRESHOLD:
            return {
                "original_task": duty_description,
                "matched_task": best_match["matched_task"],
                "similarity": best_match["similarity"],
                "intensity_score": best_match["intensity_score"],
                "analysis_method": "vector_search_direct_match_compound"
            }
        
        # For reasonable similarity, use weighted average
        if best_match["similarity"] >= 0.5:
            # Calculate weighted average from top matches
            weighted_sum = sum(match["intensity_score"] * match["similarity"] for match in top_matches)
            total_similarity = sum(match["similarity"] for match in top_matches)
            
            if total_similarity > 0:
                weighted_intensity = weighted_sum / total_similarity
            else:
                weighted_intensity = top_matches[0]["intensity_score"] if top_matches else 0.5
            
            return {
                "original_task": duty_description,
                "top_matches": top_matches[:3],  # Include top 3 matches for reference
                "similarity": best_match["similarity"],
                "intensity_score": weighted_intensity,
                "analysis_method": "vector_search_multiple_matches"
            }
        
        # For low similarity, use default values
        return {
            "original_task": duty_description,
            "matched_task": "low similarity compound",
            "similarity": best_match["similarity"],
            "intensity_score": 0.5,
            "top_matches": top_matches[:2],  # Include top 2 matches for reference
            "explanation": "Low similarity compound task",
            "analysis_method": "default_compound"
        }

def process_job_responsibilities(job_responsibilities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Process a list of job responsibilities and calculate overall intensity
    Properly weighs duties by their hours and accounts for total weekly workload
    Returns a dict with detailed duty analysis and aggregated intensity metrics
    """
    # Handle empty or None input
    if not job_responsibilities:
        return {
            "overall_intensity": 0.0,
            "duties_analysis": [],
            "weighted_intensity": 0.0,
            "total_hours": 0,
            "workload_factor": 0.0
        }
    
    # Ensure job_responsibilities is a list
    if not isinstance(job_responsibilities, list):
        logging.warning(f"Invalid job_responsibilities format: {type(job_responsibilities)}")
        return {
            "overall_intensity": 0.0,
            "duties_analysis": [],
            "weighted_intensity": 0.0,
            "total_hours": 0,
            "workload_factor": 0.0
        }
    
    duties_analysis = []
    total_hours = 0
    weighted_intensity_sum = 0
    
    # Process each duty
    for duty in job_responsibilities:
        # Ensure duty is a dictionary
        if not isinstance(duty, dict):
            logging.warning(f"Invalid duty format: {type(duty)}")
            continue
            
        # Use jobDuties field if available instead of duty
        duty_description = duty.get("jobDuties", duty.get("duty", ""))
        if not duty_description and "description" in duty:
            duty_description = duty.get("description", "")
        
        # Try to get hours, with fallback types
        hours = 0
        try:
            hours_value = duty.get("hours", 0)
            if isinstance(hours_value, (int, float)):
                hours = hours_value
            elif isinstance(hours_value, str) and hours_value.strip():
                hours = float(hours_value.strip())
        except (ValueError, TypeError) as e:
            logging.warning(f"Error converting hours to number: {e}")
            hours = 0
        
        # Skip duties with no description
        if not duty_description:
            continue
            
        # If hours is zero but we have a description, assume 1 hour
        # This prevents valid tasks from being excluded just because hours wasn't specified
        if hours <= 0:
            hours = 1
            logging.debug(f"Assigned default 1 hour to duty: {duty_description}")
            
        try:
            intensity_data = get_task_intensity(duty_description)
            intensity_data["hours"] = hours
            intensity_data["original_description"] = duty_description  # Store original description for reference
            duties_analysis.append(intensity_data)
            
            total_hours += hours
            weighted_intensity_sum += intensity_data["intensity_score"] * hours
        except Exception as e:
            logging.error(f"Error processing duty '{duty_description}': {e}")
            continue
    
    # Handle case with no valid duties
    if not duties_analysis:
        return {
            "overall_intensity": 0.0,
            "duties_analysis": [],
            "weighted_intensity": 0.0,
            "total_hours": 0,
            "workload_factor": 0.0
        }
    
    # Calculate weighted average intensity
    weighted_intensity = weighted_intensity_sum / total_hours if total_hours > 0 else 0
    
    # Calculate overall intensity (simple average if needed)
    overall_intensity = sum(d["intensity_score"] for d in duties_analysis) / len(duties_analysis) if duties_analysis else 0
    
    # Calculate workload factor (relative to 40-hour work week)
    # For hours < 40, apply diminishing factor; for hours > 40, apply increasing factor
    standard_work_week = 40
    if total_hours < standard_work_week:
        # Calculate workload factor using sigmoid function to create smooth transition
        # Formula: 2 / (1 + e^(-0.15*(x-20))) where x is total_hours
        # This gives values around:
        # 10hrs → 0.38, 20hrs → 0.5, 30hrs → 0.77, 40hrs → 1.0
        workload_factor = 2 / (1 + np.exp(-0.15 * (total_hours - 20)))
        if workload_factor > 1.0:
            workload_factor = 1.0
    else:
        # For hours > 40, increase factor up to a cap (prevent runaway values)
        # Formula: 1 + log(hours/40) gives a reasonable curve 
        # 40hrs → 1.0, 50hrs → 1.22, 60hrs → 1.4, 80hrs → 1.69
        workload_factor = 1.0 + np.log(total_hours / standard_work_week)
        if workload_factor > 2.0:
            workload_factor = 2.0
    
    # Return comprehensive analysis
    return {
        "overall_intensity": overall_intensity,
        "duties_analysis": duties_analysis,
        "weighted_intensity": weighted_intensity,
        "adjusted_intensity": weighted_intensity * workload_factor,
        "total_hours": total_hours,
        "workload_factor": workload_factor,
        "standard_work_week": standard_work_week
    }

def calculate_collaboration_index(skillsFeedback: Dict[str, Any], projects: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Calculate collaboration index based on skills feedback data and project participation
    Properly handles feedback_given and feedback_received data
    Now also leverages project data to enhance collaboration metrics
    """
    collaboration_score = 0.0
    feedback_activity_score = 0.0
    feedback_quality_score = 0.0
    feedback_given_count = 0
    feedback_received_count = 0
    avg_rating = 0.0
    weighted_rating = 0.0
    has_feedback_data = False
    
    # First try to extract from skillsFeedback
    if skillsFeedback and isinstance(skillsFeedback, dict):
        # Extract feedback counts
        feedback_given = skillsFeedback.get("feedbackGiven", 0) 
        feedback_received = skillsFeedback.get("feedbackReceived", 0)
        
        # Handle different data types for feedback counts
        if isinstance(feedback_given, list):
            feedback_given_count = len(feedback_given)
        elif isinstance(feedback_given, (int, float)):
            feedback_given_count = feedback_given
        else:
            feedback_given_count = 0
            
        if isinstance(feedback_received, list):
            feedback_received_count = len(feedback_received)
        elif isinstance(feedback_received, (int, float)):
            feedback_received_count = feedback_received
        else:
            feedback_received_count = 0
        
        # Extract ratings
        avg_rating = skillsFeedback.get("averageRating", 0) or 0
        weighted_rating = skillsFeedback.get("weightedRating", 0) or 0
        
        has_feedback_data = True
    
    # Try to check for feedbackMetrics as well
    if not has_feedback_data or (feedback_given_count == 0 and feedback_received_count == 0):
        feedback_metrics = skillsFeedback.get("feedbackMetrics", {})
        if feedback_metrics and isinstance(feedback_metrics, dict):
            # Extract data from feedbackMetrics
            feedback_given = feedback_metrics.get("given", {})
            feedback_received = feedback_metrics.get("received", {})
            
            # Get counts from objects
            if isinstance(feedback_given, dict):
                feedback_given_count = feedback_given.get("count", 0)
                
            if isinstance(feedback_received, dict):
                feedback_received_count = feedback_received.get("count", 0)
                avg_rating = feedback_received.get("averageRating", 0)
                weighted_rating = feedback_received.get("weightedAverageRating", 0)
            
            has_feedback_data = True
    
    # Calculate project-based collaboration metrics - Enhanced implementation
    project_collaboration_score = 0.0
    project_collaboration_detail = {
        "projects_with_collaborators": 0,
        "total_collaborators": 0,
        "avg_collaborators_per_project": 0,
        "cross_team_projects": 0,
        "collaboration_intensity": 0,
        "collaboration_breadth": 0
    }
    
    # Ensure we can find nested projects
    if projects is None and skillsFeedback and isinstance(skillsFeedback, dict):
        # Try to find projects in parent object
        projects = skillsFeedback.get("projects", [])
    
    if projects and isinstance(projects, list) and len(projects) > 0:
        # Count projects with collaborators
        projects_with_collaborators = 0
        total_collaborator_count = 0
        cross_team_count = 0
        
        # Track unique collaborators across all projects for breadth analysis
        all_unique_collaborators = set()
        departments_involved = set()
        projects_by_department = {}
        
        for project in projects:
            if isinstance(project, dict):
                # Check for team members or collaborators
                team_members = (project.get("team_members", []) or 
                               project.get("teamMembers", []) or 
                               project.get("team", []) or
                               project.get("members", []))
                
                collaborators = (project.get("collaborators", []) or
                                project.get("participants", []))
                
                # Get project department
                project_dept = project.get("department", "")
                if project_dept:
                    departments_involved.add(project_dept)
                    if project_dept not in projects_by_department:
                        projects_by_department[project_dept] = 0
                    projects_by_department[project_dept] += 1
                
                # Combine all collaborators
                all_collaborators = []
                if isinstance(team_members, list):
                    all_collaborators.extend(team_members)
                if isinstance(collaborators, list):
                    all_collaborators.extend(collaborators)
                
                # Count unique collaborators in this project
                project_unique_collaborators = set()
                for collab in all_collaborators:
                    collab_email = None
                    collab_dept = None
                    
                    if isinstance(collab, dict):
                        collab_email = collab.get("email")
                        collab_dept = collab.get("department")
                    elif isinstance(collab, str):
                        collab_email = collab
                    
                    if collab_email:
                        project_unique_collaborators.add(collab_email)
                        all_unique_collaborators.add(collab_email)
                    
                    if collab_dept:
                        project_departments.add(collab_dept)
                
                # Count unique collaborators in this project
                collab_count = len(project_unique_collaborators)
                
                # Consider it a collaborative project if it has collaborators
                if collab_count > 0:
                    projects_with_collaborators += 1
                    total_collaborator_count += collab_count
                
                # Consider it cross-team if it has multiple departments
                if len(project_departments) > 1:
                    cross_team_count += 1
        
        # Calculate project collaboration metrics
        if len(projects) > 0:
            # 1. Project collaboration ratio - percentage of projects with collaborators
            collab_project_ratio = projects_with_collaborators / len(projects)
            
            # 2. Average collaborators per collaborative project
            avg_collaborators = total_collaborator_count / max(1, projects_with_collaborators)
            
            # 3. Cross-team ratio - percentage of projects involving multiple departments
            cross_team_ratio = cross_team_count / len(projects)
            
            # 4. Collaboration breadth - how many unique people they collaborate with overall
            # Normalize to 0-1 scale using sigmoid function
            collab_breadth = 1 / (1 + math.exp(-0.2 * (len(all_unique_collaborators) - 5)))
            
            # 5. Department diversity - number of unique departments involved
            dept_diversity = len(departments_involved) / max(1, 5)  # Normalize to max of 5 departments
            
            # Scale average collaborators (optimal is 3-5)
            if avg_collaborators <= 1:
                collaborator_factor = 0.3  # Solo or paired work - lower collaboration
            elif avg_collaborators <= 3:
                collaborator_factor = 0.6  # Small team - medium collaboration
            elif avg_collaborators <= 5:
                collaborator_factor = 0.9  # Optimal team size - high collaboration
            else:
                collaborator_factor = 0.7  # Very large teams - moderate collaboration (diminishing returns)
            
            # Combine all factors into project collaboration score
            # Weighted average of different collaboration metrics
            project_collaboration_score = (
                (collab_project_ratio * 0.25) +      # 25% weight - having collaborative projects
                (collaborator_factor * 0.25) +       # 25% weight - team size factor
                (cross_team_ratio * 0.2) +           # 20% weight - cross-team collaboration
                (collab_breadth * 0.2) +             # 20% weight - breadth of collaboration network
                (dept_diversity * 0.1)               # 10% weight - departmental diversity
            )
            
            # Store detailed metrics for analysis
            project_collaboration_detail = {
                "projects_with_collaborators": projects_with_collaborators,
                "total_collaborators": total_collaborator_count,
                "unique_collaborators": len(all_unique_collaborators),
                "avg_collaborators_per_project": avg_collaborators,
                "cross_team_projects": cross_team_count,
                "collaboration_breadth": collab_breadth,
                "department_diversity": dept_diversity,
                "departments_involved": list(departments_involved),
                "collaborator_factor": collaborator_factor,
            }
            
            # Mark that we have data
            has_feedback_data = True
    
    # Calculate feedback activity score (0-1 scale)
    total_feedback = feedback_given_count + feedback_received_count
    
    # Use logarithmic scaling to prevent extremes
    # 0 feedback = 0, 5 feedback = 0.5, 20 feedback = 0.8, 50 feedback = 1.0
    feedback_activity_score = min(1.0, np.log(total_feedback + 1) / np.log(50))
    
    # Calculate feedback quality score (0-1 scale)
    # Use the higher of avg_rating or weighted_rating, normalized to 0-1 scale
    # If no ratings available but we have feedback, use a default moderate quality score
    if max(avg_rating, weighted_rating) > 0:
        quality_score = max(avg_rating, weighted_rating) / 5.0  # Assuming 5-star rating scale
    elif total_feedback > 0:
        # If we have feedback but no ratings, assume medium quality
        quality_score = 0.5
    else:
        quality_score = 0.0
    
    feedback_quality_score = quality_score
    
    # Combined collaboration score - enhanced weighting system
    # 35% based on direct feedback activity
    # 40% based on projects (more weight because it's more objective)
    # 25% based on feedback quality
    if has_feedback_data:
        collaboration_score = (0.35 * feedback_activity_score) + (0.4 * project_collaboration_score) + (0.25 * feedback_quality_score)
    else:
        collaboration_score = 0.0
    
    return {
        "collaboration_score": collaboration_score,
        "feedback_activity_score": feedback_activity_score,
        "feedback_quality_score": feedback_quality_score,
        "feedback_given": feedback_given_count,
        "feedback_received": feedback_received_count,
        "average_rating": avg_rating,
        "weighted_rating": weighted_rating,
        "project_collaboration_score": project_collaboration_score,
        "project_collaboration_detail": project_collaboration_detail,
        "has_feedback_data": has_feedback_data
    }

def analyze_employee_utilization(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze employee utilization based on various factors
    Now properly handles jobDuties field and uses improved mathematical models
    Returns comprehensive analysis with scores and details
    """
    # Ensure doc is a dictionary
    if not isinstance(doc, dict):
        logging.error(f"Invalid document format: {type(doc)}")
        return {
            "timestamp": datetime.now().isoformat(),
            "email": "unknown",
            "error": "Invalid document format"
        }
    
    # Extract relevant fields
    email = doc.get("email", "unknown")
    tools_proficient = doc.get("toolsProficient", [])
    job_title = doc.get("jobTitle", "")
    role = doc.get("role", "")  # This is for permissions only
    projects = doc.get("projects", [])
    salary = doc.get("salary")
    location = doc.get("location")
    department = doc.get("department")
    
    # Process job duties from either jobDuties (preferred) or jobResponsibilities (fallback)
    job_duties = doc.get("jobDuties", [])
    job_responsibilities = doc.get("jobResponsibilities", [])
    
    # Process skills feedback for collaboration index
    skills_feedback = doc.get("skillsFeedback", {})
    
    # Explicitly log if we're missing job duties
    if not job_duties and not job_responsibilities:
        logging.warning(f"No job duties or responsibilities found for {email}")
    
    # Initialize analysis containers
    job_intensity_analysis = None
    tools_analysis = None
    role_analysis = None
    project_analysis = None
    responsibility_analysis = None
    collaboration_analysis = None
    utilization = None
    
    # Track errors
    component_errors = []
    
    # Analyze job responsibilities intensity (if available)
    if job_duties:
        try:
            job_intensity_analysis = process_job_responsibilities(job_duties)
        except Exception as e:
            error_msg = f"Error analyzing job duties: {str(e)}"
            logging.error(f"{error_msg} for {email}")
            component_errors.append(error_msg)
            job_intensity_analysis = {
                "overall_intensity": 0.0,
                "duties_analysis": [],
                "weighted_intensity": 0.0,
                "total_hours": 0,
                "workload_factor": 0.0,
                "error": error_msg
            }
    # Fallback to jobResponsibilities if jobDuties is empty
    elif job_responsibilities:
        try:
            job_intensity_analysis = process_job_responsibilities(job_responsibilities)
        except Exception as e:
            error_msg = f"Error analyzing job responsibilities: {str(e)}"
            logging.error(f"{error_msg} for {email}")
            component_errors.append(error_msg)
            job_intensity_analysis = {
                "overall_intensity": 0.0,
                "duties_analysis": [],
                "weighted_intensity": 0.0,
                "total_hours": 0,
                "workload_factor": 0.0,
                "error": error_msg
            }
    
    # Calculate collaboration index
    try:
        projects = doc.get("projects", [])
        collaboration_analysis = calculate_collaboration_index(skills_feedback, projects)
    except Exception as e:
        error_msg = f"Error calculating collaboration index: {str(e)}"
        logging.error(f"{error_msg} for {email}")
        component_errors.append(error_msg)
        collaboration_analysis = {
            "collaboration_score": 0.0,
            "has_feedback_data": False,
            "error": error_msg
        }
    
    # Analyze tools proficiency
    try:
        tools_analysis = get_tool_complexity_score(tools_proficient)
    except Exception as e:
        error_msg = f"Error analyzing tools: {str(e)}"
        logging.error(f"{error_msg} for {email}")
        component_errors.append(error_msg)
        tools_analysis = {
            "overall_score": 0.0,
            "tool_details": [],
            "avg_complexity": 0.0,
            "max_complexity": 0.0,
            "tool_count": 0,
            "error": error_msg
        }
    
    # Analyze role complexity
    try:
        role_analysis = get_role_complexity(job_title, "")  # Ignore role field as it's for permissions
    except Exception as e:
        error_msg = f"Error analyzing role: {str(e)}"
        logging.error(f"{error_msg} for {email}")
        component_errors.append(error_msg)
        role_analysis = {
            "complexity": 0.5,
            "matched_role": "default",
            "input_job_title": job_title,
            "input_role": "",
            "error": error_msg
        }
    
    # Analyze project load
    try:
        projects = doc.get("projects", [])
        project_analysis = calculate_project_load(projects)
    except Exception as e:
        error_msg = f"Error analyzing project load: {str(e)}"
        logging.error(f"{error_msg} for {email}")
        component_errors.append(error_msg)
        project_analysis = {
            "project_count": 0,
            "active_project_count": 0,
            "average_priority": 0.0,
            "time_pressure_score": 0.0,
            "overlap_score": 0.0,
            "overall_load_score": 0.0,
            "project_details": [],
            "error": error_msg
        }
    
    # Analyze responsibility breadth
    try:
        combined_duties = list(job_duties) + list(job_responsibilities)
        responsibility_analysis = calculate_responsibility_breadth(projects, "", job_title)  # Ignore role field as it's for permissions
    except Exception as e:
        error_msg = f"Error analyzing responsibility breadth: {str(e)}"
        logging.error(f"{error_msg} for {email}")
        component_errors.append(error_msg)
        responsibility_analysis = {
            "breadth_score": 0.5,
            "expected_breadth": 0.5,
            "breadth_gap": 0.0,
            "is_management_role": False,
            "role_distribution": {
                "management": 0.0,
                "mentoring": 0.0,
                "technical_leadership": 0.0,
                "execution": 1.0
            },
            "error": error_msg
        }
    
    # Calculate overall utilization score
    try:
        utilization = calculate_utilization_score(
            tools_analysis, 
            role_analysis,
            project_analysis,
            responsibility_analysis,
            job_intensity_analysis
        )
    except Exception as e:
        error_msg = f"Error calculating utilization score: {str(e)}"
        logging.error(f"{error_msg} for {email}")
        component_errors.append(error_msg)
        utilization = {
            "utilization_score": 0.5,
            "utilization_status": "unknown",
            "confidence_score": 0.1,
            "raw_score": 0.5,
            "workload_factor": 1.0,
            "workload_adjusted_score": 0.5,
            "breadth_adjustment": 0.0,
            "includes_job_intensity": job_intensity_analysis is not None,
            "error": error_msg
        }
    
    # Combine all analyses
    result = {
        "timestamp": datetime.now().isoformat(),
        "email": email,
        "tool_complexity_analysis": tools_analysis,
        "role_complexity_analysis": role_analysis,
        "project_load_analysis": project_analysis,
        "responsibility_breadth_analysis": responsibility_analysis,
        "utilization_assessment": utilization,
        "utilization_score": utilization["utilization_score"],  # Add direct access to utilization score
        "collaboration_analysis": collaboration_analysis,
        "salary": salary,
        "location": location,
        "department": department
    }
    
    # Include job intensity analysis if available
    if job_intensity_analysis:
        result["job_intensity_analysis"] = job_intensity_analysis
    
    # Add any errors encountered
    if component_errors:
        result["errors"] = component_errors
        result["error_count"] = len(component_errors)
    
    return result

def parse_time_expression(time_str: str) -> Dict[str, Any]:
    """
    Parse time expressions like "3 years 4 months" or "6 months" into numerical values
    Returns dict with total_months, years, and months
    """
    if not time_str or not isinstance(time_str, str):
        return {"total_months": 0, "years": 0, "months": 0}
    
    time_str = time_str.lower().strip()
    
    # Initialize values
    years = 0
    months = 0
    
    # Extract years
    year_match = re.search(r'(\d+)\s*(?:year|years|yr|yrs)', time_str)
    if year_match:
        years = int(year_match.group(1))
    
    # Extract months
    month_match = re.search(r'(\d+)\s*(?:month|months|mo|mos)', time_str)
    if month_match:
        months = int(month_match.group(1))
    
    # Calculate total months
    total_months = (years * 12) + months
    
    return {
        "total_months": total_months,
        "years": years,
        "months": months
    }

def process_time_fields(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process time-related fields in the document
    Converts string time expressions to numerical values
    """
    updates = {}
    
    # First try the standard timeWithCompany and timeInCurrentRole fields
    time_with_company = doc.get("timeWithCompany")
    if time_with_company and isinstance(time_with_company, str):
        parsed_time = parse_time_expression(time_with_company)
        updates["timeWithCompanyMonths"] = parsed_time["total_months"]
        updates["timeWithCompanyParsed"] = parsed_time
    
    time_in_role = doc.get("timeInCurrentRole")
    if time_in_role and isinstance(time_in_role, str):
        parsed_time = parse_time_expression(time_in_role)
        updates["timeInCurrentRoleMonths"] = parsed_time["total_months"]
        updates["timeInCurrentRoleParsed"] = parsed_time
    
    # Check for alternative tenure fields
    total_duration = doc.get("totalduration")
    if total_duration:
        try:
            # Try to convert to integer
            total_months = int(total_duration)
            if "timeWithCompanyMonths" not in updates or updates["timeWithCompanyMonths"] == 0:
                updates["timeWithCompanyMonths"] = total_months
                updates["timeWithCompanyParsed"] = {
                    "total_months": total_months,
                    "years": total_months // 12,
                    "months": total_months % 12
                }
        except (ValueError, TypeError):
            # If not an integer, try to parse as a string
            if isinstance(total_duration, str):
                parsed_time = parse_time_expression(total_duration)
                if "timeWithCompanyMonths" not in updates or updates["timeWithCompanyMonths"] == 0:
                    updates["timeWithCompanyMonths"] = parsed_time["total_months"]
                    updates["timeWithCompanyParsed"] = parsed_time
    
    # Check for current role duration
    current_role_duration = doc.get("currentroleduration")
    if current_role_duration:
        try:
            # Try to convert to integer
            role_months = int(current_role_duration)
            if "timeInCurrentRoleMonths" not in updates or updates["timeInCurrentRoleMonths"] == 0:
                updates["timeInCurrentRoleMonths"] = role_months
                updates["timeInCurrentRoleParsed"] = {
                    "total_months": role_months,
                    "years": role_months // 12,
                    "months": role_months % 12
                }
        except (ValueError, TypeError):
            # If not an integer, try to parse as a string
            if isinstance(current_role_duration, str):
                parsed_time = parse_time_expression(current_role_duration)
                if "timeInCurrentRoleMonths" not in updates or updates["timeInCurrentRoleMonths"] == 0:
                    updates["timeInCurrentRoleMonths"] = parsed_time["total_months"]
                    updates["timeInCurrentRoleParsed"] = parsed_time
    
    return updates

def perform_bulk_update(operations, collection_name=USERS_COLLECTION):
    """Execute bulk update operations on specified collection"""
    if not operations:
        return
        
    try:
        result = db[collection_name].bulk_write(operations, ordered=False)
        logging.info(f"Bulk update completed: {result.modified_count} documents modified in {collection_name}")
    except Exception as e:
        logging.error(f"Error during bulk update on {collection_name}: {e}")

def process_all_documents():
    global db
    if db is None:
        logging.error("process_all_documents: db is None, skipping")
        return
    
    logging.info(f"Starting to process documents in {USERS_COLLECTION}...")
    
    # Find all applicable documents
    cursor = db[USERS_COLLECTION].find(
        {},  # No filter to get all documents
    )
    
    users_operations = []
    processed_count = 0
    
    for doc in cursor:
        try:
            doc_id = doc["_id"]
            email = doc.get("email", "unknown")
            
            # Process time-related fields
            time_updates = process_time_fields(doc)
            if time_updates:
                users_operations.append(
                    UpdateOne(
                        {"_id": doc_id},
                        {"$set": time_updates},
                        upsert=False
                    )
                )
            
            # Process job intensity if duties exist
            job_duties = doc.get("jobDuties", [])
            job_responsibilities = doc.get("jobResponsibilities", [])
            skills_feedback = doc.get("skillsFeedback", {})
            
            # Process collaboration index
            projects = doc.get("projects", [])
            collaboration_analysis = calculate_collaboration_index(skills_feedback, projects)
            users_operations.append(
                UpdateOne(
                    {"_id": doc_id},
                    {"$set": {"collaboration_analysis": collaboration_analysis}},
                    upsert=False
                )
            )
            
            job_intensity_analysis = None
            if job_duties:
                job_intensity_analysis = process_job_responsibilities(job_duties)
                # Add job intensity analysis to users collection
                users_operations.append(
                    UpdateOne(
                        {"_id": doc_id},
                        {"$set": {"job_intensity_analysis": job_intensity_analysis}},
                        upsert=False
                    )
                )
            elif job_responsibilities:
                job_intensity_analysis = process_job_responsibilities(job_responsibilities)
                # Add job intensity analysis to users collection
                users_operations.append(
                    UpdateOne(
                        {"_id": doc_id},
                        {"$set": {"job_intensity_analysis": job_intensity_analysis}},
                        upsert=False
                    )
                )
            
            # Process employee utilization
            utilization_analysis = analyze_employee_utilization(doc)
            
            # Extract the utilization score for other scripts to access easily
            utilization_score = utilization_analysis.get("utilization_assessment", {}).get("utilization_score", 0.5)
            
            # Add utilization assessment to users collection
            users_operations.append(
                UpdateOne(
                    {"_id": doc_id},
                    {"$set": {
                        "utilizationAssessment": utilization_analysis,
                        "utilization_score": utilization_score  # Add direct access to utilization score
                    }},
                    upsert=False
                )
            )
            
            # Remove any empty responsibilities field
            if "responsibilities" in doc and (not doc["responsibilities"] or doc["responsibilities"] == []):
                users_operations.append(
                    UpdateOne(
                        {"_id": doc_id},
                        {"$unset": {"responsibilities": "", "jobDescriptionIntensity": ""}},
                        upsert=False
                    )
                )
            
            processed_count += 1
            
            # Perform bulk writes in batches
            if len(users_operations) >= 100:
                perform_bulk_update(users_operations, USERS_COLLECTION)
                users_operations = []
                
            # Log progress
            if processed_count % 100 == 0:
                logging.info(f"Processed {processed_count} documents...")
                
        except Exception as e:
            logging.error(f"Error processing document {doc.get('email', 'unknown')}: {e}")
    
    # Process any remaining operations
    if users_operations:
        perform_bulk_update(users_operations, USERS_COLLECTION)
        
    logging.info(f"Completed processing {processed_count} documents")

def process_single_document(email: str) -> Optional[Dict[str, Any]]:
    """
    Process a single document by email
    Returns the utilization assessment or None if processing failed
    """
    if model is None:
        logging.error("Model not available")
        return None
        
    try:
        # Find the document
        doc = db[USERS_COLLECTION].find_one({"email": email})
        
        if not doc:
            logging.warning(f"Document not found for email: {email}")
            return None
        
        users_operations = []
        
        # Process time-related fields
        time_updates = process_time_fields(doc)
        if time_updates:
            users_operations.append(
                UpdateOne(
                    {"_id": doc["_id"]},
                    {"$set": time_updates},
                    upsert=False
                )
            )
        
        # Process job intensity if duties exist
        job_duties = doc.get("jobDuties", [])
        job_responsibilities = doc.get("jobResponsibilities", [])
        skills_feedback = doc.get("skillsFeedback", {})
            
        # Process collaboration index
        projects = doc.get("projects", [])
        collaboration_analysis = calculate_collaboration_index(skills_feedback, projects)
        users_operations.append(
            UpdateOne(
                {"_id": doc["_id"]},
                {"$set": {"collaboration_analysis": collaboration_analysis}},
                upsert=False
            )
        )
            
        job_intensity_analysis = None
        if job_duties:
            job_intensity_analysis = process_job_responsibilities(job_duties)
            # Add job intensity analysis to users collection
            users_operations.append(
                UpdateOne(
                    {"_id": doc["_id"]},
                    {"$set": {"job_intensity_analysis": job_intensity_analysis}},
                    upsert=False
                )
            )
        elif job_responsibilities:
            job_intensity_analysis = process_job_responsibilities(job_responsibilities)
            # Add job intensity analysis to users collection
            users_operations.append(
                UpdateOne(
                    {"_id": doc["_id"]},
                    {"$set": {"job_intensity_analysis": job_intensity_analysis}},
                    upsert=False
                )
            )
            
        # Process employee utilization
        utilization_analysis = analyze_employee_utilization(doc)
        
        # Extract the utilization score for other scripts to access easily
        utilization_score = utilization_analysis.get("utilization_assessment", {}).get("utilization_score", 0.5)
        
        # Add utilization assessment to users collection
        users_operations.append(
            UpdateOne(
                {"_id": doc["_id"]},
                {"$set": {
                    "utilizationAssessment": utilization_analysis,
                    "utilization_score": utilization_score  # Add direct access to utilization score
                }},
                upsert=False
            )
        )
        
        # Remove any empty responsibilities field
        if "responsibilities" in doc and (not doc["responsibilities"] or doc["responsibilities"] == []):
            users_operations.append(
                UpdateOne(
                    {"_id": doc["_id"]},
                    {"$unset": {"responsibilities": "", "jobDescriptionIntensity": ""}},
                    upsert=False
                )
            )
        
        # Apply updates to users
        if users_operations:
            perform_bulk_update(users_operations, USERS_COLLECTION)
            
        logging.info(f"Processed document for {email}")
        return utilization_analysis
        
    except Exception as e:
        logging.error(f"Error processing document for {email}: {e}")
        return None

# --- Change Stream Handling ---
def watch_for_changes():
    """Watch for changes in the users collection"""
    global db
    if db is None:
        logging.error("Database connection not available")
        return
        
    logging.info(f"Starting change stream on {USERS_COLLECTION}...")
    
    try:
        # Watch for any changes in any document in the collection
        # This will trigger analysis for any field change
        pipeline = [
            {"$match": {
                "ns.coll": USERS_COLLECTION,
                "operationType": {"$in": ["insert", "update", "replace"]}
            }}
        ]
        
        with db[USERS_COLLECTION].watch(
            pipeline=pipeline,
            full_document='updateLookup'
        ) as stream:
            for change in stream:
                try:
                    db_name = change.get("ns", {}).get("db")
                    if db_name in {"admin", "local", "auth_db"}:
                        continue  # skip system DBs
                    full = change.get("fullDocument", {})
                    email = full.get("email")
                    if email:
                        logging.info(f"Change for {email} in {db_name}")
                        db = client[db_name]
                        process_single_document(email)
                except Exception as e:
                    logging.error(f"Error handling change event: {e}")
                    
    except Exception as e:
        logging.error(f"Error setting up change stream: {e}")
        # Try to reconnect and restart the change stream after a delay
        time.sleep(10)
        connect_db()
        load_model()
        watch_for_changes()

def watch_all_companies_for_changes():
    """Watch for changes in users across all company databases."""
    global db
    if client is None:
        connect_db()
    logging.info("Starting cluster-level change stream for all company databases...")
    pipeline = [
        {"$match": {
            "ns.coll": USERS_COLLECTION,
            "operationType": {"$in": ["insert", "update", "replace"]}
        }}
    ]
    try:
        with client.watch(pipeline, full_document='updateLookup') as stream:
            for change in stream:
                try:
                    db_name = change.get("ns", {}).get("db")
                    if db_name in {"admin", "local", "auth_db", "auth", "config"}:
                        continue  # skip system DBs
                    full = change.get("fullDocument", {})
                    email = full.get("email")
                    if email:
                        logging.info(f"Change for {email} in {db_name}")
                        db = client[db_name]
                        process_single_document(email)
                except Exception as e:
                    logging.error(f"Error handling change event: {e}")
                    
    except Exception as e:
        logging.error(f"Error setting up cluster change stream: {e}")
        time.sleep(10)
        connect_db()
        load_model()
        watch_all_companies_for_changes()

# --- Global Variables for Vector Search ---
benchmark_embeddings_cache = None
benchmark_descriptions = None
benchmark_scores = None
task_vector_index = None
role_vector_index = None

# --- These are loaded at the top of the file ---
# JOB_ROLE_ONTOLOGY and JOB_CATEGORIES are already loaded above
# --- Multi-tenancy Helpers ---
def get_company_databases():
    """List all tenant databases excluding system DBs."""
    try:
        all_dbs = client.list_database_names()
    except Exception as e:
        logging.error(f"Failed listing databases: {e}")
        return []
    # Exclude system and global DBs
    excluded = {"auth_db", "admin", "local", "auth", "config", "org_sim_db"}
    return [db for db in all_dbs if db not in excluded]

def process_all_company_documents():
    global db
    if client is None:
        connect_db()
    if model is None:
        load_model()
        initialize_vector_search()
    db_list = get_company_databases()
    logging.info(f"Found tenant DBs: {db_list}")
    for company_db in db_list:
        db = client[company_db]
        logging.info(f"Processing all documents in {company_db}.{USERS_COLLECTION}...")
        # Ensure indexes per tenant
        try:
            db[USERS_COLLECTION].create_index("email", unique=True)
            logging.info(f"Ensured users index in {company_db}")
        except Exception as e:
            logging.error(f"Users index creation failed for {company_db}: {e}")
        process_all_documents()

def watch_all_companies_for_changes():
    """Watch for changes in users across all company databases."""
    if client is None:
        connect_db()
    logging.info("Starting cluster-level change stream for all company databases...")
    pipeline = [
        {"$match": {
            "ns.coll": USERS_COLLECTION,
            "operationType": {"$in": ["insert", "update", "replace"]}
        }}
    ]
    try:
        with client.watch(pipeline, full_document='updateLookup') as stream:
            for change in stream:
                try:
                    db_name = change.get("ns", {}).get("db")
                    if db_name in {"admin", "local", "auth_db", "auth", "config"}:
                        continue  # skip system DBs
                    full = change.get("fullDocument", {})
                    email = full.get("email")
                    if email:
                        logging.info(f"Change for {email} in {db_name}")
                        db = client[db_name]
                        process_single_document(email)
                except Exception as e:
                    logging.error(f"Error handling change event: {e}")
                    
    except Exception as e:
        logging.error(f"Error setting up cluster change stream: {e}")
        time.sleep(10)
        connect_db()
        load_model()
        watch_all_companies_for_changes()

# --- Main Execution ---
if __name__ == "__main__":
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Employee Utilization Analyzer')
    parser.add_argument('--watch', action='store_true', help='Run in continuous watch mode')
    parser.add_argument('--initial-run', action='store_true', default=True, help='Run initial processing (default: True)')
    args = parser.parse_args()
    
    logging.info("Starting Employee Utilization Analyzer...")
    connect_db()
    load_model()
    initialize_vector_search()
    
    # First run - process all documents if requested
    if args.initial_run:
        process_all_company_documents()
    
    if args.watch:
        logging.info("Running in continuous watch mode...")
        while True:  # Persistent watch with reconnect
            try:
                watch_all_companies_for_changes()
            except Exception as e:
                logging.error(f"Change stream error: {e}. Reconnecting in 10s...")
                time.sleep(10)
                connect_db()  # Reconnect if needed
    else:
        logging.info("Processing completed. Exiting.")