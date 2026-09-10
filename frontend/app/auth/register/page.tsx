import { Suspense } from "react";
import { AuthForm, AuthLoading } from "../auth-form";

export default function RegisterPage() {
    return <Suspense fallback={<AuthLoading />}><AuthForm mode="register" /></Suspense>;
}
