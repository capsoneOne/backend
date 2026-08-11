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
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
        </header>
    );
}
