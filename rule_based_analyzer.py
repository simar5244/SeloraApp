#!/usr/bin/env python3
"""
RULE-BASED ANALYZER - NO ML DEPENDENCIES
Target: <50MB memory usage
Ultra-fast, no model loading required
"""

import logging
import os
import json
import time
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple
from pymongo import MongoClient
from dotenv import load_dotenv
import psutil

# Ultra-lightweight logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class RuleBasedUtilizationAnalyzer:
    """Rule-based analyzer using keyword matching and scoring patterns"""
    
    def __init__(self):
        self.task_patterns = self._load_task_patterns()
        self.keyword_weights = self._load_keyword_weights()
        self.industry_modifiers = self._load_industry_modifiers()
    
    def _load_task_patterns(self) -> Dict[str, float]:
        """Load task patterns with intensity scores"""
        return {
            # High intensity patterns (0.8-1.0)
            r'strategic|transformation|restructuring|merger|acquisition': 0.9,
            r'crisis|emergency|critical|urgent|deadline': 0.95,
            r'leadership|executive|c-level|board|director': 0.85,
            r'innovation|research|development|breakthrough': 0.8,
            r'complex|sophisticated|advanced|expert': 0.8,
            r'analysis|analytics|modeling|forecasting': 0.8,
            r'consultation|advisory|expert|specialist': 0.85,
            
            # Medium-high intensity patterns (0.6-0.8)
            r'project|program|initiative|implementation': 0.7,
            r'planning|strategy|roadmap|architecture': 0.75,
            r'optimization|improvement|enhancement': 0.7,
            r'negotiation|deal|contract|agreement': 0.75,
            r'management|coordination|supervision': 0.65,
            r'presentation|communication|stakeholder': 0.6,
            r'review|assessment|evaluation|audit': 0.65,
            
            # Medium intensity patterns (0.4-0.6)
            r'training|education|learning|development': 0.5,
            r'meeting|discussion|collaboration|teamwork': 0.45,
            r'documentation|reporting|record|log': 0.4,
            r'support|assistance|help|guidance': 0.5,
            r'monitoring|tracking|observation|watch': 0.45,
            r'testing|quality|validation|verification': 0.55,
            
            # Low intensity patterns (0.2-0.4)
            r'administrative|clerical|filing|organizing': 0.3,
            r'routine|regular|standard|normal': 0.35,
            r'data entry|input|basic|simple': 0.25,
            r'email|correspondence|communication|message': 0.3,
            r'scheduling|calendar|appointment|booking': 0.3,
            r'maintenance|upkeep|cleaning|housekeeping': 0.25,
        }
    
    def _load_keyword_weights(self) -> Dict[str, float]:
        """Load keyword weights for fine-tuning"""
        return {
            # Intensity amplifiers
            'critical': 0.2, 'urgent': 0.15, 'complex': 0.1, 'advanced': 0.1,
            'strategic': 0.15, 'senior': 0.1, 'lead': 0.1, 'principal': 0.1,
            'expert': 0.1, 'specialist': 0.1, 'manager': 0.05, 'director': 0.15,
            
            # Intensity reducers
            'basic': -0.1, 'simple': -0.1, 'routine': -0.1, 'standard': -0.05,
            'junior': -0.1, 'entry': -0.15, 'assistant': -0.05, 'support': -0.05,
            'maintenance': -0.1, 'clerical': -0.1, 'administrative': -0.05,
        }
    
    def _load_industry_modifiers(self) -> Dict[str, float]:
        """Load industry-specific modifiers"""
        return {
            'finance': 0.1, 'banking': 0.1, 'investment': 0.15, 'trading': 0.15,
            'consulting': 0.1, 'legal': 0.1, 'medical': 0.1, 'healthcare': 0.1,
            'technology': 0.05, 'software': 0.05, 'engineering': 0.05,
            'research': 0.1, 'academic': 0.05, 'education': 0.0,
            'retail': -0.05, 'hospitality': -0.05, 'service': -0.05,
        }
    
    def analyze_task_utilization(self, task_description: str, 
                               department: str = '', 
                               role: str = '', 
                               industry: str = '') -> Dict[str, Any]:
        """Analyze task utilization using rule-based approach"""
        
        if not task_description:
            return self._default_result()
        
        # Normalize text
        text = task_description.lower().strip()
        
        # Base score from pattern matching
        base_score = self._calculate_pattern_score(text)
        
        # Apply keyword weights
        keyword_score = self._calculate_keyword_score(text)
        
        # Apply industry modifier
        industry_modifier = self._calculate_industry_modifier(text, industry)
        
        # Apply role modifier
        role_modifier = self._calculate_role_modifier(role)
        
        # Apply department modifier
        dept_modifier = self._calculate_department_modifier(department)
        
        # Calculate final score
        final_score = base_score + keyword_score + industry_modifier + role_modifier + dept_modifier
        
        # Clamp to valid range
        final_score = max(0.1, min(1.0, final_score))
        
        return {
            'utilization_score': round(final_score, 3),
            'analysis_method': 'rule_based',
            'components': {
                'base_pattern_score': round(base_score, 3),
                'keyword_adjustment': round(keyword_score, 3),
                'industry_modifier': round(industry_modifier, 3),
                'role_modifier': round(role_modifier, 3),
                'department_modifier': round(dept_modifier, 3)
            },
            'confidence': self._calculate_confidence(text),
            'matched_patterns': self._get_matched_patterns(text)
        }
    
    def _calculate_pattern_score(self, text: str) -> float:
        """Calculate base score from pattern matching"""
        scores = []
        
        for pattern, score in self.task_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                scores.append(score)
        
        if not scores:
            return 0.5  # Default middle score
        
        # Use weighted average, giving more weight to higher scores
        scores.sort(reverse=True)
        if len(scores) == 1:
            return scores[0]
        
        # Weighted average with diminishing returns
        weighted_sum = scores[0]
        for i, score in enumerate(scores[1:], 1):
            weighted_sum += score * (0.5 ** i)
        
        return weighted_sum / (1 + sum(0.5 ** i for i in range(1, len(scores))))
    
    def _calculate_keyword_score(self, text: str) -> float:
        """Calculate keyword-based score adjustment"""
        adjustment = 0.0
        
        for keyword, weight in self.keyword_weights.items():
            if keyword in text:
                adjustment += weight
        
        return adjustment
    
    def _calculate_industry_modifier(self, text: str, industry: str) -> float:
        """Calculate industry-specific modifier"""
        modifier = 0.0
        
        # Direct industry modifier
        if industry and industry.lower() in self.industry_modifiers:
            modifier += self.industry_modifiers[industry.lower()]
        
        # Text-based industry detection
        for industry_key, industry_mod in self.industry_modifiers.items():
            if industry_key in text:
                modifier += industry_mod * 0.5  # Reduced weight for text-based
        
        return modifier
    
    def _calculate_role_modifier(self, role: str) -> float:
        """Calculate role-based modifier"""
        if not role:
            return 0.0
        
        role_lower = role.lower()
        
        # Senior roles
        if any(keyword in role_lower for keyword in ['senior', 'lead', 'principal', 'chief', 'director', 'vp', 'manager']):
            return 0.1
        
        # Junior roles
        if any(keyword in role_lower for keyword in ['junior', 'entry', 'intern', 'assistant', 'associate']):
            return -0.1
        
        return 0.0
    
    def _calculate_department_modifier(self, department: str) -> float:
        """Calculate department-based modifier"""
        if not department:
            return 0.0
        
        dept_lower = department.lower()
        
        # High-intensity departments
        if any(keyword in dept_lower for keyword in ['executive', 'strategy', 'finance', 'legal', 'risk']):
            return 0.05
        
        # Lower-intensity departments
        if any(keyword in dept_lower for keyword in ['admin', 'support', 'maintenance', 'operations']):
            return -0.05
        
        return 0.0
    
    def _calculate_confidence(self, text: str) -> float:
        """Calculate confidence score based on text analysis"""
        # Longer, more detailed descriptions tend to be more accurate
        length_score = min(1.0, len(text) / 100)
        
        # Presence of specific keywords increases confidence
        specific_keywords = ['project', 'analysis', 'management', 'development', 'strategy']
        keyword_score = sum(1 for keyword in specific_keywords if keyword in text) / len(specific_keywords)
        
        return (length_score + keyword_score) / 2
    
    def _get_matched_patterns(self, text: str) -> List[str]:
        """Get list of matched patterns for debugging"""
        matched = []
        
        for pattern, score in self.task_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                matched.append(f"{pattern} ({score})")
        
        return matched
    
    def _default_result(self) -> Dict[str, Any]:
        """Default result for empty/invalid input"""
        return {
            'utilization_score': 0.5,
            'analysis_method': 'rule_based_default',
            'components': {},
            'confidence': 0.0,
            'matched_patterns': []
        }

class BatchProcessor:
    """Process documents in batches with minimal memory footprint"""
    
    def __init__(self, batch_size: int = 10):
        self.batch_size = batch_size
        self.analyzer = RuleBasedUtilizationAnalyzer()
        self.processed_count = 0
        self.start_time = time.time()
    
    def process_company_documents(self, company_db_name: str):
        """Process all documents for a company"""
        
        # Connect to database
        load_dotenv()
        client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
        db = client[company_db_name]
        collection = db['users']
        
        # Get document count
        total_docs = collection.count_documents({})
        logging.info(f"Processing {total_docs} documents for {company_db_name}")
        
        # Process in batches
        skip = 0
        while skip < total_docs:
            batch_docs = list(collection.find({}, {
                'task_description': 1,
                'department': 1,
                'role': 1,
                'industry': 1,
                '_id': 1
            }).skip(skip).limit(self.batch_size))
            
            if not batch_docs:
                break
            
            # Process batch
            updates = []
            for doc in batch_docs:
                try:
                    result = self.analyzer.analyze_task_utilization(
                        task_description=doc.get('task_description', ''),
                        department=doc.get('department', ''),
                        role=doc.get('role', ''),
                        industry=doc.get('industry', '')
                    )
                    
                    updates.append({
                        'filter': {'_id': doc['_id']},
                        'update': {'$set': {
                            'utilization_score': result['utilization_score'],
                            'analysis_method': result['analysis_method'],
                            'analysis_components': result['components'],
                            'analysis_confidence': result['confidence'],
                            'last_analyzed': time.time()
                        }}
                    })
                    
                except Exception as e:
                    logging.error(f"Error processing document {doc.get('_id')}: {e}")
            
            # Execute batch update
            if updates:
                try:
                    from pymongo import UpdateOne
                    operations = [UpdateOne(update['filter'], update['update']) for update in updates]
                    result = collection.bulk_write(operations, ordered=False)
                    logging.info(f"Updated {result.modified_count} documents")
                    
                except Exception as e:
                    logging.error(f"Batch update failed: {e}")
            
            skip += self.batch_size
            self.processed_count += len(batch_docs)
            
            # Log progress
            elapsed = time.time() - self.start_time
            rate = self.processed_count / elapsed if elapsed > 0 else 0
            logging.info(f"Processed {self.processed_count}/{total_docs} documents ({rate:.1f}/sec)")
            
            # Memory check
            memory_mb = psutil.Process().memory_info().rss / (1024*1024)
            if memory_mb > 100:  # Warning threshold
                logging.warning(f"Memory usage: {memory_mb:.1f}MB")
        
        client.close()

def main():
    """Main entry point"""
    
    # Log initial memory
    initial_memory = psutil.Process().memory_info().rss / (1024*1024)
    logging.info(f"🚀 Rule-Based Analyzer starting - Initial memory: {initial_memory:.1f}MB")
    
    try:
        # Initialize processor
        processor = BatchProcessor(batch_size=20)  # Larger batches for rule-based
        
        # Connect to find company databases
        load_dotenv()
        client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
        
        # Find all company databases
        db_names = [name for name in client.list_database_names() 
                   if name.startswith('company_') and name != 'company_template']
        
        logging.info(f"Found {len(db_names)} company databases")
        
        for db_name in db_names:
            logging.info(f"Processing {db_name}...")
            processor.process_company_documents(db_name)
            
            # Log memory after each company
            memory_mb = psutil.Process().memory_info().rss / (1024*1024)
            logging.info(f"Memory after {db_name}: {memory_mb:.1f}MB")
        
        client.close()
        
        # Final stats
        final_memory = psutil.Process().memory_info().rss / (1024*1024)
        total_time = time.time() - processor.start_time
        
        logging.info(f"🎉 Processing complete!")
        logging.info(f"📊 Final memory: {final_memory:.1f}MB")
        logging.info(f"⏱️  Total time: {total_time:.1f}s")
        logging.info(f"🔢 Documents processed: {processor.processed_count}")
        logging.info(f"⚡ Average rate: {processor.processed_count/total_time:.1f} docs/sec")
        
    except Exception as e:
        logging.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()