import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "NextGoal - Find Your Next Career Opportunity",
    description: "Discover verified job openings from top companies. Real-time job aggregation from official career pages.",
    keywords: ["jobs", "careers", "job search", "hiring", "employment"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                        <Navbar />
                        <main className="container mx-auto px-4 py-8">
                            {children}
                        </main>
                    </div>
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
