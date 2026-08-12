import type {ReactNode} from 'react';
import {SITE_NAME} from '@/config/metadata';

interface AuthPageHeaderProps {
    title: ReactNode;
    description: ReactNode;
}

/** Shared heading treatment for forms in the authentication workspace. */
export function AuthPageHeader({title, description}: AuthPageHeaderProps) {
    return (
        <header className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{SITE_NAME}</p>
            <h1 className="text-balance text-4xl font-bold leading-tight">{title}</h1>
            <p className="font-light leading-relaxed text-muted-foreground">{description}</p>
        </header>
    );
}
