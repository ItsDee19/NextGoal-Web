import { Suspense } from "react";
import { AuthForm, AuthLoading } from "../auth-form";

export default function LoginPage() {
    return <Suspense fallback={<AuthLoading />}><AuthForm mode="login" /></Suspense>;
}
