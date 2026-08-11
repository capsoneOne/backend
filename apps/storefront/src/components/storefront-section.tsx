import {ArrowRight} from 'lucide-react';
import type {ReactNode} from 'react';

import {Link} from '@/platform/i18n/navigation';

export const storefrontSectionClass = 'border-b border-border py-16 md:py-20';

export function StorefrontSectionLink({href, children}: {href: string; children: ReactNode}) {
    return (
        <Link
            href={href}
            className="group inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium shadow-sm transition-[color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
            {children}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
    );
}

export function StorefrontSectionHeader({
    eyebrow,
    title,
    description,
    href,
    linkLabel,
}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    href?: string;
    linkLabel?: ReactNode;
}) {
    return (
        <div className="mb-10 flex items-end justify-between gap-6">
            <div>
                {eyebrow ? (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
                ) : null}
                <h2 className={eyebrow ? 'mt-3 text-3xl font-bold md:text-4xl' : 'text-3xl font-bold md:text-4xl'}>
                    {title}
                </h2>
                {description ? (
                    <p className="mt-3 max-w-xl font-light leading-relaxed text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {href && linkLabel ? (
                <div className="hidden shrink-0 md:block">
                    <StorefrontSectionLink href={href}>{linkLabel}</StorefrontSectionLink>
                </div>
            ) : null}
        </div>
    );
}
