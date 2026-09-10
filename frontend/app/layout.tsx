import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "NextGoal - Find Your Next Career Opportunity",
    description: "Find your next opportunity across company hiring boards. Daily job collection, focused filters, and direct application links.",
    keywords: ["jobs", "careers", "job search", "hiring", "employment"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preload" href="/fonts/Manrope-Latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
                <link rel="preload" href="/fonts/Sora-Latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
            </head>
            <body>
                <a href="#main-content" className="skip-link">Skip to content</a>
                <Providers>
                    <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main id="main-content" className="site-container flex-1" tabIndex={-1}>
                            {children}
                        </main>
                        <footer className="page-footer"><div className="site-container flex flex-wrap items-center justify-between gap-3"><span className="display-font font-bold text-foreground">NextGoal <span className="ml-2 font-normal text-muted-foreground">A little closer to what’s next.</span></span><a href="/terms" className="hover:text-primary">Terms &amp; privacy</a></div></footer>
                    </div>
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
