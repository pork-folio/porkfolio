import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface TwitterLinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
    handle: string;
    showIcon?: boolean;
}

export function TwitterLink({
    handle = "PorkfolioApp",
    showIcon = true,
    className,
    ...props
}: TwitterLinkProps) {
    // Remove @ from the beginning if present
    const cleanHandle = handle.startsWith("@") ? handle.substring(1) : handle;

    return (
        <a
            href={`https://x.com/${cleanHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline"
            {...props}
        >
            <Badge
                variant="outline"
                className={`cursor-pointer hover:bg-accent transition-colors ${className || ''}`}
            >
                {showIcon && <span className="text-lg">𝕏</span>}
                <span>@{cleanHandle}</span>
            </Badge>
        </a>
    );
} 