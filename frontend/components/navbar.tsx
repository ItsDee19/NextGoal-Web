"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers";
import { Button, ButtonLink } from "@/components/ui/button";
import { ArrowUpRight, Bookmark, LogOut, Menu, User, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
    const { user, logout, isLoading } = useAuth();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    return <header className="site-nav">
        <div className="site-container">
            <div className="flex min-h-[80px] items-center justify-between gap-4">
                <Link href="/" className="display-font flex items-center gap-2.5 text-[21px] font-semibold tracking-tight" aria-label="NextGoal home" onClick={close}>
                    <span className="brand-mark"><ArrowUpRight aria-hidden="true" size={23} strokeWidth={2.8} /></span>NextGoal<span className="text-primary -ml-2">.</span>
                </Link>
                <nav className="hidden md:flex items-center gap-2" aria-label="Main navigation">
                    <Link className="nav-link" href="/" aria-current={pathname === "/" ? "page" : undefined}>Find jobs</Link>
                    <Link className="nav-link" href={user ? "/saved" : "/auth/login?next=%2Fsaved"} aria-current={pathname === "/saved" ? "page" : undefined}><Bookmark size={15} aria-hidden="true" /> Saved jobs</Link>
                </nav>
                <div className="hidden md:flex items-center gap-2 min-w-[190px] justify-end">
                    {isLoading ? <span className="text-xs text-muted-foreground">Loading account…</span> : user ? <>
                        <ButtonLink variant="ghost" size="sm" href="/profile"><User size={15} className="mr-2" />My profile</ButtonLink>
                        <Button variant="ghost" size="icon" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></Button>
                    </> : <>
                        <ButtonLink variant="ghost" size="sm" href="/auth/login">Sign in</ButtonLink>
                        <ButtonLink size="sm" href="/auth/register">Create account <ArrowUpRight size={15} className="ml-2" /></ButtonLink>
                    </>}
                </div>
                <Button className="md:hidden" variant="ghost" size="icon" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
                    {open ? <X size={21} /> : <Menu size={21} />}
                </Button>
            </div>
            {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden grid gap-1 border-t pb-4">
                <Link href="/" onClick={close} className="py-3 text-sm font-semibold" aria-current={pathname === "/" ? "page" : undefined}>Find jobs</Link>
                <Link href={user ? "/saved" : "/auth/login?next=%2Fsaved"} onClick={close} className="py-3 text-sm">Saved jobs</Link>
                {user ? <>
                    <Link href="/profile" onClick={close} className="py-3 text-sm">My profile</Link>
                    <Button variant="outline" onClick={() => { logout(); close(); }}>Sign out</Button>
                </> : <div className="flex gap-3 pt-2">
                    <ButtonLink variant="outline" className="flex-1" href="/auth/login" onClick={close}>Sign in</ButtonLink>
                    <ButtonLink className="flex-1" href="/auth/register" onClick={close}>Create account</ButtonLink>
                </div>}
            </nav>}
        </div>
    </header>;
}
