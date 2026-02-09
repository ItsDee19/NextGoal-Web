import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create demo user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            passwordHash: hashedPassword,
            name: 'Demo User',
            preferences: {
                experienceLevel: ['fresher', '1-3'],
                degree: ['btech', 'any'],
                jobType: ['full-time', 'internship'],
                locations: ['Bangalore', 'Remote'],
            },
        },
    });
    console.log(`✓ Created demo user: ${user.email}`);

    // Create sample jobs
    const sampleJobs = [
        {
            title: 'Software Engineer - Frontend',
            company: 'TechCorp',
            location: 'Bangalore, India',
            jobType: 'full-time',
            experienceLevel: '1-3',
            degreeRequired: 'btech',
            description: 'We are looking for a talented Frontend Engineer to join our team. You will work on building beautiful and responsive user interfaces using React and TypeScript.',
            applyUrl: 'https://techcorp.com/careers/frontend-engineer',
            source: 'greenhouse',
            contentHash: 'hash-frontend-techcorp',
        },
        {
            title: 'Backend Developer',
            company: 'StartupX',
            location: 'Mumbai, India',
            jobType: 'full-time',
            experienceLevel: '3-5',
            degreeRequired: 'btech',
            description: 'Join our backend team to build scalable APIs and microservices. Experience with Node.js and PostgreSQL required.',
            applyUrl: 'https://startupx.com/jobs/backend',
            source: 'lever',
            contentHash: 'hash-backend-startupx',
        },
        {
            title: 'Machine Learning Intern',
            company: 'AI Labs',
            location: 'Remote',
            jobType: 'internship',
            experienceLevel: 'fresher',
            degreeRequired: 'btech',
            description: 'Great opportunity for students interested in ML. You will work on real-world problems with our data science team.',
            applyUrl: 'https://ailabs.io/internships',
            source: 'ashby',
            contentHash: 'hash-ml-intern-ailabs',
        },
        {
            title: 'Senior Full Stack Engineer',
            company: 'GlobalTech',
            location: 'Hyderabad, India',
            jobType: 'full-time',
            experienceLevel: '5+',
            degreeRequired: 'btech',
            description: 'Lead our full stack development efforts. 5+ years of experience required with expertise in React, Node.js, and cloud technologies.',
            applyUrl: 'https://globaltech.com/senior-fullstack',
            source: 'smartrecruiters',
            contentHash: 'hash-senior-globaltech',
        },
        {
            title: 'Legal Associate',
            company: 'LawFirm LLP',
            location: 'Delhi, India',
            jobType: 'full-time',
            experienceLevel: '1-3',
            degreeRequired: 'llb',
            description: 'Seeking LLB graduates for our corporate law practice. Strong research and drafting skills required.',
            applyUrl: 'https://lawfirmllp.com/careers',
            source: 'greenhouse',
            contentHash: 'hash-legal-lawfirm',
        },
        {
            title: 'Corporate Lawyer',
            company: 'Legal Eagles',
            location: 'Bangalore, India',
            jobType: 'full-time',
            experienceLevel: '3-5',
            degreeRequired: 'ballb',
            description: 'BA LLB graduates with 3-5 years experience in corporate law are invited to apply.',
            applyUrl: 'https://legaleagles.in/corporate-lawyer',
            source: 'lever',
            contentHash: 'hash-corporate-legaleagles',
        },
        {
            title: 'Product Design Intern',
            company: 'DesignHub',
            location: 'Remote',
            jobType: 'internship',
            experienceLevel: 'fresher',
            degreeRequired: 'any',
            description: 'Learn product design with our experienced team. Portfolio required.',
            applyUrl: 'https://designhub.co/internship',
            source: 'ashby',
            contentHash: 'hash-design-intern-designhub',
        },
        {
            title: 'DevOps Engineer',
            company: 'CloudOps Inc',
            location: 'Pune, India',
            jobType: 'full-time',
            experienceLevel: '3-5',
            degreeRequired: 'btech',
            description: 'Manage our cloud infrastructure on AWS. Experience with Kubernetes, Docker, and CI/CD pipelines required.',
            applyUrl: 'https://cloudops.io/devops',
            source: 'greenhouse',
            contentHash: 'hash-devops-cloudops',
        },
    ];

    for (const job of sampleJobs) {
        await prisma.job.upsert({
            where: { contentHash: job.contentHash },
            update: { lastVerified: new Date() },
            create: {
                ...job,
                postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
                lastVerified: new Date(),
                isActive: true,
            },
        });
    }
    console.log(`✓ Created ${sampleJobs.length} sample jobs`);

    // Save some jobs for the demo user
    await prisma.savedJob.upsert({
        where: {
            userId_jobId: {
                userId: user.id,
                jobId: (await prisma.job.findFirst({ where: { contentHash: 'hash-frontend-techcorp' } }))!.id,
            },
        },
        update: {},
        create: {
            userId: user.id,
            jobId: (await prisma.job.findFirst({ where: { contentHash: 'hash-frontend-techcorp' } }))!.id,
        },
    });
    console.log(`✓ Saved sample jobs for demo user`);

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
