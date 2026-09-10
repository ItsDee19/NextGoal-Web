import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// These identifiers belong only to the fabricated fixtures in the original seed.
const legacyDemoHashes = [
    'hash-frontend-techcorp',
    'hash-backend-startupx',
    'hash-ml-intern-ailabs',
    'hash-senior-globaltech',
    'hash-legal-lawfirm',
    'hash-corporate-legaleagles',
    'hash-design-intern-designhub',
    'hash-devops-cloudops',
];

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
        throw new Error('Demo seeding is disabled. On a development database only, set ALLOW_DEMO_SEED=true.');
    }

    // Never publish fabricated job links or label a demo fixture as verified.
    const retired = await prisma.job.updateMany({
        where: { contentHash: { in: legacyDemoHashes } },
        data: {
            isActive: false,
            source: 'demo',
            applyUrl: 'https://example.invalid/demo-job',
            lastVerified: new Date(0),
            lastVerificationError: 'Demo fixture: not a real job opportunity',
        },
    });

    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            passwordHash: await bcrypt.hash('password123', 10),
            name: 'Demo User',
            preferences: {
                experienceLevel: ['fresher', '1-3'],
                degree: ['btech', 'any'],
                jobType: ['full-time', 'internship'],
                locations: ['Bangalore', 'Remote'],
            },
        },
    });

    console.log(`Development demo account available: ${user.email}`);
    console.log(`Retired ${retired.count} legacy demo jobs. No job listings were created.`);
    console.log('Run the configured ATS refresh to populate the database with real listings.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
