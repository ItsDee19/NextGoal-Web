import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "NextGoal - Find Your Next Career Opportunity",
    description: "Discover verified job openings from top companies. Real-time job aggregation from official career pages.",
    keywords: ["jobs", "careers", "job search", "hiring", "employment", "LLB", "legal jobs", "law jobs"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} ${inter.className}`}>
                <Providers>
                    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 grid-bg flex flex-col">
                        <Navbar />
                        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1">
                            {children}
                        </main>
                        <Footer />
                    </div>
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
