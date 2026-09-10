import { AlertCircle, Briefcase, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

export function ResultState({ kind, title, description, action, onAction }: {
    kind: "loading" | "error" | "empty";
    title: string;
    description?: string;
    action?: string;
    onAction?: () => void;
}) {
    const Icon = kind === "loading" ? Loader2 : kind === "error" ? AlertCircle : Briefcase;
    return <div className="result-state" data-kind={kind} role={kind === "error" ? "alert" : "status"}>
        <div className="state-icon flex h-14 w-14 items-center justify-center">
            <Icon aria-hidden="true" className={`h-6 w-6 ${kind === "loading" ? "animate-spin" : ""}`} />
        </div>
        <h3 className="state-title display-font">{title}</h3>
        {description && <p className="state-description max-w-sm">{description}</p>}
        {action && onAction && <Button onClick={onAction} variant="outline" className="h-11">{action}</Button>}
    </div>;
}
