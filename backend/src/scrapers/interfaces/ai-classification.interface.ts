export interface AiClassification {
    jobType: string;          // 'internship' | 'full-time' | 'part-time' | 'contract'
    experienceLevel: string;  // 'fresher' | '1-3' | '3-5' | '5+'
    degreeRequired: string;   // 'btech' | 'ballb' | 'llb' | 'any'
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;  // 'INR' | 'USD' | 'EUR' etc.
    skills: string[];         // e.g. ['React', 'TypeScript', 'Node.js']
    category: string;         // e.g. 'Engineering', 'Design', 'Marketing'
}
