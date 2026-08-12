'use client';

import {ArrowRight, User} from 'lucide-react';
import {useEffect, useState} from 'react';

import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Link} from '@/platform/i18n/navigation';

type GreetingPeriod = 'fallback' | 'morning' | 'afternoon' | 'evening';

interface PersonalizedWelcomeProps {
    avatarSrc?: string;
    initials: string;
    greetings: Record<GreetingPeriod, string>;
    message: string;
    action: string;
}

function getGreetingPeriod(): GreetingPeriod {
    const hour = new Date().getHours();

    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

export function PersonalizedWelcome({avatarSrc, initials, greetings, message, action}: PersonalizedWelcomeProps) {
    const [period, setPeriod] = useState<GreetingPeriod>('fallback');

    useEffect(() => {
        setPeriod(getGreetingPeriod());
    }, []);

    return (
        <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-3">
                <div className="animate-fade-up flex min-w-0 items-center gap-3">
                    <Avatar className="size-10 shadow-sm ring-2 ring-primary/15 ring-offset-2 ring-offset-background">
                        {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
                        <AvatarFallback className="bg-primary/10 font-bold text-primary">
                            {initials || <User className="size-4" aria-hidden="true" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground sm:text-base">
                            {greetings[period]} <span aria-hidden="true">👋</span>
                        </p>
                        <p className="mt-0.5 hidden truncate text-sm font-light text-muted-foreground sm:block">
                            {message}
                        </p>
                    </div>
                </div>

                <Link
                    href="/featured"
                    aria-label={action}
                    className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="hidden min-[420px]:inline">{action}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
}
