import type {ReactNode} from 'react';

interface StorefrontHeroProps {
    children: ReactNode;
    artwork: ReactNode;
    topContent?: ReactNode;
}

/** Shared display hero for the storefront's primary discovery experiences. */
export function StorefrontHero({children, artwork, topContent}: StorefrontHeroProps) {
    return (
        <section className="border-b border-border bg-secondary/20 pt-[4.5rem]">
            {topContent}
            <div className="container mx-auto grid items-center gap-12 px-4 py-12 md:py-20 lg:min-h-[46rem] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
                <div className="relative z-10 max-w-3xl">
                    {children}
                </div>
                <div className="animate-fade-up relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-xl border border-border bg-background/70 p-5 [animation-delay:100ms]">
                    {artwork}
                </div>
            </div>
        </section>
    );
}

export function StorefrontHeroHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: ReactNode;
    title: ReactNode;
    description: ReactNode;
}) {
    return (
        <>
            <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
            </p>
            <h1 className="animate-fade-up mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.04] sm:text-5xl md:text-6xl [animation-delay:60ms]">
                {title}
            </h1>
            <div className="animate-fade-up mt-7 max-w-2xl text-pretty text-lg font-light leading-relaxed text-muted-foreground md:text-xl [animation-delay:120ms]">
                {description}
            </div>
        </>
    );
}
