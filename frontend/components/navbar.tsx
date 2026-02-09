"use client";

import Link from "next/link";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Briefcase, Bookmark, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
    const { user, logout, isLoading } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md dark:bg-slate-950/80">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                            <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            NextGoal
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Browse Jobs
                        </Link>
                        {user && (
                            <Link
                                href="/saved"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                <Bookmark className="h-4 w-4" />
                                Saved
                            </Link>
                        )}
                        <Link
                            href="/terms"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Terms
                        </Link>
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {isLoading ? (
                            <div className="h-9 w-20 animate-pulse bg-muted rounded-md" />
                        ) : user ? (
                            <div className="flex items-center gap-3">
                                <Link href="/profile">
                                    <Button variant="ghost" size="sm" className="gap-2">
                                        <User className="h-4 w-4" />
                                        {user.name || user.email.split("@")[0]}
                                    </Button>
                                </Link>
                                <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Link href="/auth/login">
                                    <Button variant="ghost" size="sm">
                                        Sign in
                                    </Button>
                                </Link>
                                <Link href="/auth/register">
                                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                        Get Started
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t">
                        <div className="flex flex-col gap-4">
                            <Link
                                href="/"
                                className="text-sm font-medium"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Browse Jobs
                            </Link>
                            {user && (
                                <Link
                                    href="/saved"
                                    className="text-sm font-medium flex items-center gap-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Bookmark className="h-4 w-4" />
                                    Saved Jobs
                                </Link>
                            )}
                            <Link
                                href="/terms"
                                className="text-sm font-medium"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Terms
                            </Link>
                            <hr />
                            {user ? (
                                <>
                                    <Link
                                        href="/profile"
                                        className="text-sm font-medium flex items-center gap-2"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <User className="h-4 w-4" />
                                        Profile
                                    </Link>
                                    <button
                                        className="text-sm font-medium text-left flex items-center gap-2 text-red-600"
                                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="outline" className="w-full">Sign in</Button>
                                    </Link>
                                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                                            Get Started
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
