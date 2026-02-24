import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrapedJob } from '../interfaces/scraped-job.interface';
import { AiClassification } from '../interfaces/ai-classification.interface';

@Injectable()
export class AiClassifierService {
    private readonly logger = new Logger(AiClassifierService.name);
    private genAI: GoogleGenerativeAI | null = null;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.logger.log('AI Classifier initialized with Gemini');
        } else {
            this.logger.warn(
                'GEMINI_API_KEY not set — AI classification disabled, falling back to keyword matching',
            );
        }
    }

    /**
     * Classify a single job using Gemini AI.
     * Returns null if AI is unavailable or the call fails.
     */
    async classify(job: ScrapedJob): Promise<AiClassification | null> {
        if (!this.genAI) return null;

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const prompt = this.buildPrompt(job);

            const result = await Promise.race([
                model.generateContent(prompt),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('AI classification timed out')), 8000),
                ),
            ]);

            const text = result.response.text();
            return this.parseResponse(text);
        } catch (error) {
            this.logger.warn(`AI classification failed for "${job.title}": ${error.message}`);
            return null;
        }
    }

    /**
     * Classify a job from raw fields (used for re-classifying existing DB records).
     */
    async classifyFromFields(fields: {
        title: string;
        company: string;
        location?: string;
        description?: string;
    }): Promise<AiClassification | null> {
        return this.classify({
            title: fields.title,
            company: fields.company,
            location: fields.location,
            description: fields.description,
            applyUrl: '',
            source: '',
        });
    }

    private buildPrompt(job: ScrapedJob): string {
        const description = (job.description || '').substring(0, 3000);

        return `You are a job posting classifier. Analyze this job and return ONLY a valid JSON object with no markdown formatting, no code fences, and no extra text.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Description: ${description}

Return exactly this JSON structure:
{
  "jobType": "<one of: internship, full-time, part-time, contract>",
  "experienceLevel": "<one of: fresher, 1-3, 3-5, 5+>",
  "degreeRequired": "<one of: btech, ballb, llb, any>",
  "salaryMin": <number or null if not mentioned>,
  "salaryMax": <number or null if not mentioned>,
  "salaryCurrency": "<ISO currency code like USD, INR, EUR or null>",
  "skills": ["<skill1>", "<skill2>", "...up to 10 most relevant skills"],
  "category": "<one of: Engineering, Design, Marketing, Sales, Finance, Legal, HR, Operations, Data Science, Product, Customer Support, Other>"
}

Rules:
- For experienceLevel: "fresher" = 0-1 years, "1-3" = 1-3 years, "3-5" = 3-5 years, "5+" = 5+ years
- For degreeRequired: only use "btech" if explicitly requires B.Tech/B.E./CS degree, "ballb" for BA LLB, "llb" for LLB, otherwise "any"
- For salary: extract annual salary if mentioned, convert to numbers. If only monthly is given, multiply by 12. If not mentioned, use null.
- For skills: extract specific technical skills, tools, languages, and frameworks mentioned
- Return ONLY valid JSON, no explanation`;
    }

    private parseResponse(text: string): AiClassification | null {
        try {
            // Strip any markdown code fences the model might add despite instructions
            const cleaned = text
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            const parsed = JSON.parse(cleaned);

            // Validate and normalize
            return {
                jobType: this.validateEnum(
                    parsed.jobType,
                    ['internship', 'full-time', 'part-time', 'contract'],
                    'full-time',
                ),
                experienceLevel: this.validateEnum(
                    parsed.experienceLevel,
                    ['fresher', '1-3', '3-5', '5+'],
                    '3-5',
                ),
                degreeRequired: this.validateEnum(
                    parsed.degreeRequired,
                    ['btech', 'ballb', 'llb', 'any'],
                    'any',
                ),
                salaryMin: typeof parsed.salaryMin === 'number' ? parsed.salaryMin : undefined,
                salaryMax: typeof parsed.salaryMax === 'number' ? parsed.salaryMax : undefined,
                salaryCurrency:
                    typeof parsed.salaryCurrency === 'string' ? parsed.salaryCurrency : undefined,
                skills: Array.isArray(parsed.skills)
                    ? parsed.skills.filter((s: any) => typeof s === 'string').slice(0, 10)
                    : [],
                category: this.validateEnum(
                    parsed.category,
                    [
                        'Engineering',
                        'Design',
                        'Marketing',
                        'Sales',
                        'Finance',
                        'Legal',
                        'HR',
                        'Operations',
                        'Data Science',
                        'Product',
                        'Customer Support',
                        'Other',
                    ],
                    'Other',
                ),
            };
        } catch (error) {
            this.logger.warn(`Failed to parse AI response: ${error.message}`);
            return null;
        }
    }

    private validateEnum(value: string, allowed: string[], fallback: string): string {
        if (typeof value === 'string' && allowed.includes(value)) {
            return value;
        }
        // Try case-insensitive match
        const lower = (value || '').toLowerCase();
        const match = allowed.find((a) => a.toLowerCase() === lower);
        return match || fallback;
    }

    isEnabled(): boolean {
        return this.genAI !== null;
    }
}
