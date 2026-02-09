import Link from "next/link";
import { ArrowLeft, Scale, Shield, FileText } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to jobs
            </Link>

            <div className="bg-white dark:bg-slate-900 rounded-xl border p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                        <Scale className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Terms of Service & Disclaimer</h1>
                        <p className="text-muted-foreground">Last updated: February 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <section className="mb-8">
                        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                            <FileText className="h-5 w-5 text-blue-600" />
                            About NextGoal
                        </h2>
                        <p className="text-muted-foreground">
                            NextGoal is a job aggregation platform that collects job listings from publicly
                            available career pages of various companies. We aim to make job discovery easier
                            by bringing opportunities from multiple sources into one place.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Disclaimer
                        </h2>
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-4">
                            <p className="text-amber-800 dark:text-amber-200 text-sm">
                                <strong>Important:</strong> NextGoal is an aggregator, not an employer.
                                We do not post jobs, verify employers, or guarantee the accuracy of any listing.
                            </p>
                        </div>
                        <ul className="space-y-2 text-muted-foreground">
                            <li>• Job listings are automatically collected from public career pages</li>
                            <li>• We make no guarantees about job availability or accuracy</li>
                            <li>• Always verify opportunities directly with the hiring company</li>
                            <li>• We are not responsible for the hiring decisions of any company</li>
                            <li>• Job listings may expire or change without notice</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Data Collection</h2>
                        <p className="text-muted-foreground mb-4">
                            We collect job data from the following sources:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li>• <strong>Greenhouse</strong> - Public job board API</li>
                            <li>• <strong>Lever</strong> - Public career page data</li>
                            <li>• <strong>Workday</strong> - Public career sites</li>
                            <li>• <strong>Ashby</strong> - Public job board API</li>
                            <li>• <strong>SmartRecruiters</strong> - Public job listings</li>
                        </ul>
                        <p className="text-muted-foreground mt-4">
                            We respect robots.txt directives and implement appropriate rate limiting
                            to ensure our data collection is responsible and does not impact the
                            availability of source websites.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">User Accounts</h2>
                        <p className="text-muted-foreground">
                            When you create an account on NextGoal:
                        </p>
                        <ul className="space-y-2 text-muted-foreground mt-4">
                            <li>• You are responsible for maintaining the security of your account</li>
                            <li>• We store your email address and password (securely hashed)</li>
                            <li>• You can delete your account at any time</li>
                            <li>• We will not share your personal information with third parties</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Intellectual Property</h2>
                        <p className="text-muted-foreground">
                            Job descriptions and company information remain the property of their
                            respective owners. We display this information for informational purposes
                            only and link to the original source for applications.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Contact</h2>
                        <p className="text-muted-foreground">
                            If you have questions about these terms or need to report an issue,
                            please contact us at{" "}
                            <a href="mailto:support@nextgoal.example" className="text-blue-600 hover:underline">
                                support@nextgoal.example
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
                        <p className="text-muted-foreground">
                            We may update these terms from time to time. Continued use of the platform
                            after changes constitutes acceptance of the new terms.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
