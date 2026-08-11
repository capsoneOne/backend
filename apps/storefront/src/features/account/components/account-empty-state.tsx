import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';

interface AccountEmptyStateProps {
    icon: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}

/** Compact empty state for account-owned records such as orders and addresses. */
export function AccountEmptyState({icon: Icon, title, description, action}: AccountEmptyStateProps) {
    return (
        <Card className="gap-0 border-border">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-medium">{title}</h2>
                {description ? (
                    <p className="mt-2 max-w-md font-light leading-relaxed text-muted-foreground">{description}</p>
                ) : null}
                {action ? <div className="mt-6">{action}</div> : null}
            </CardContent>
        </Card>
    );
}
