import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';

interface AccountEmptyStateProps {
    icon?: LucideIcon;
    media?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}

/** Compact empty state for account-owned records such as orders and addresses. */
export function AccountEmptyState({icon: Icon, media, title, description, action}: AccountEmptyStateProps) {
    if (media) {
        return (
            <Card className="gap-0 overflow-hidden border-border py-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="flex min-h-64 items-center justify-center bg-secondary/45 px-6 py-7 md:min-h-80 md:p-8">
                        {media}
                    </div>
                    <div className="flex flex-col items-center justify-center px-7 py-9 text-center md:items-start md:px-9 md:text-left">
                        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                        {description ? (
                            <p className="mt-3 max-w-md font-light leading-relaxed text-muted-foreground">{description}</p>
                        ) : null}
                        {action ? <div className="mt-6">{action}</div> : null}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="gap-0 border-border">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
                {Icon ? (
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                ) : null}
                <h2 className="mt-5 text-xl font-medium">{title}</h2>
                {description ? (
                    <p className="mt-2 max-w-md font-light leading-relaxed text-muted-foreground">{description}</p>
                ) : null}
                {action ? <div className="mt-6">{action}</div> : null}
            </CardContent>
        </Card>
    );
}
