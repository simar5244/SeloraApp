// List of common technical skills to look for in feedback
const TECHNICAL_SKILLS = [
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'c', 'php', 'ruby', 'go', 
  'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'dart', 'elixir', 'haskell',
  
  // Web Technologies
  'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'react', 'angular', 'vue', 'nextjs',
  'nuxt', 'gatsby', 'node', 'express', 'nest', 'django', 'flask', 'spring', 'laravel', 'ruby on rails',
  'graphql', 'rest', 'api', 'websocket', 'grpc', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
  
  // Databases
  'mysql', 'postgresql', 'mongodb', 'redis', 'sql', 'nosql', 'oracle', 'sql server', 'dynamodb',
  'cassandra', 'firebase', 'firestore', 'elasticsearch', 'kibana', 'snowflake', 'bigquery',
  
  // DevOps & Tools
  'git', 'github', 'gitlab', 'bitbucket', 'jenkins', 'circleci', 'github actions', 'terraform',
  'ansible', 'puppet', 'chef', 'prometheus', 'grafana', 'splunk', 'new relic', 'datadog',
  
  // Other
  'machine learning', 'ai', 'artificial intelligence', 'data science', 'blockchain', 'cybersecurity',
  'devops', 'cloud', 'microservices', 'serverless', 'iot', 'ar', 'vr', 'blockchain', 'ethereum',
  'solidity', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'jupyter'
];

// List of common soft skills to look for in feedback
const SOFT_SKILLS = [
  'leadership', 'teamwork', 'communication', 'problem solving', 'critical thinking',
  'time management', 'adaptability', 'creativity', 'work ethic', 'attention to detail',
  'collaboration', 'empathy', 'patience', 'resilience', 'accountability', 'initiative',
  'decision making', 'conflict resolution', 'emotional intelligence', 'negotiation',
  'mentorship', 'coaching', 'presentation', 'public speaking', 'active listening',
  'delegation', 'strategic thinking', 'analytical skills', 'project management',
  'customer service', 'networking', 'sales', 'marketing', 'problem-solving'
];

// Combine all skills for matching
const ALL_SKILLS = [...new Set([...TECHNICAL_SKILLS, ...SOFT_SKILLS])];

/**
 * Extracts skills from a given text by matching against known skills
 * @param text The input text to extract skills from
 * @returns Array of unique skills found in the text
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // First, look for multi-word skills to avoid partial matches
  ALL_SKILLS
    .filter(skill => skill.includes(' ')) // Only multi-word skills
    .forEach(skill => {
      if (lowerText.includes(skill)) {
        foundSkills.add(skill);
      }
    });
  
  // Then look for single-word skills, avoiding partial matches
  const words = lowerText
    .split(/\s+/)
    .map(word => word.replace(/[^a-z0-9]/g, '')) // Remove non-alphanumeric
    .filter(word => word.length > 2); // Only consider words with 3+ chars
    
  words.forEach(word => {
    // Check if the word is a skill and not part of a longer skill we've already found
    if (ALL_SKILLS.includes(word) && 
        !Array.from(foundSkills).some(skill => skill.includes(word) && skill !== word)) {
      foundSkills.add(word);
    }
  });
  
  return Array.from(foundSkills);
}

/**
 * Extracts skills from feedback text, handling different formats
 * @param feedback The feedback text or array of feedback items
 * @returns Array of unique skills found in the feedback
 */
export function extractSkillsFromFeedback(feedback: string | string[] | { text: string }[]): string[] {
  if (!feedback) return [];
  
  let feedbackTexts: string[] = [];
  
  if (Array.isArray(feedback)) {
    feedbackTexts = feedback.map(item => 
      typeof item === 'string' ? item : item.text || ''
    );
  } else if (typeof feedback === 'string') {
    feedbackTexts = [feedback];
  }
  
  const allSkills = feedbackTexts.flatMap(text => extractSkillsFromText(text));
  return [...new Set(allSkills)]; // Return unique skills
}

export default {
  extractSkillsFromText,
  extractSkillsFromFeedback,
  TECHNICAL_SKILLS,
  SOFT_SKILLS
};
