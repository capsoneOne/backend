import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Page,
    PageBlock,
    PageLayout,
    PageTitle,
    api,
    defineDashboardExtension,
} from '@vendure/dashboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import React from 'react';

import { contactMessagesQuery, setContactMessageStatusMutation } from './queries.js';

/**
 * Inbox for storefront contact submissions.
 *
 * This page is the delivery mechanism, not a convenience view — outbound mail is
 * disabled, so a message that is not read here is not read anywhere.
 */

const FILTERS = [
    { label: 'New', value: 'new' },
    { label: 'Read', value: 'read' },
    { label: 'Archived', value: 'archived' },
    { label: 'All', value: '' },
] as const;

function formatWhen(value: string) {
    return new Date(value).toLocaleString();
}

function MessageCard({
    message,
    onStatus,
    busy,
}: {
    message: {
        id: string;
        createdAt: string;
        name: string;
        email: string;
        topic: string;
        orderCode?: string | null;
        message: string;
        customerId?: string | null;
        status: string;
    };
    onStatus: (id: string, status: string) => void;
    busy: boolean;
}) {
    return (
        <div className="border-b last:border-b-0 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{message.name}</span>
                    <a className="text-sm text-muted-foreground underline" href={`mailto:${message.email}`}>
                        {message.email}
                    </a>
                    {message.customerId && <Badge variant="outline">account</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{formatWhen(message.createdAt)}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{message.topic}</Badge>
                {message.orderCode && <Badge variant="outline">order {message.orderCode}</Badge>}
                <Badge variant={message.status === 'new' ? 'default' : 'outline'}>{message.status}</Badge>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm">{message.message}</p>

            <div className="mt-3 flex gap-2">
                {message.status !== 'read' && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus(message.id, 'read')}>
                        Mark read
                    </Button>
                )}
                {message.status !== 'archived' && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus(message.id, 'archived')}>
                        Archive
                    </Button>
                )}
            </div>
        </div>
    );
}

function ContactInbox() {
    const [status, setStatus] = React.useState<string>('new');
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['contactMessages', status],
        queryFn: () => api.query(contactMessagesQuery, { options: { status: status || null, take: 50 } }),
    });

    const update = useMutation({
        mutationFn: (variables: { id: string; status: string }) =>
            api.mutate(setContactMessageStatusMutation, variables),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contactMessages'] }),
    });

    const items = data?.contactMessages.items ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                    Sent from the storefront contact form. Outbound email is disabled, so this list is
                    the only place these arrive.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-2">
                    {FILTERS.map(filter => (
                        <Button
                            key={filter.value}
                            size="sm"
                            variant={status === filter.value ? 'default' : 'outline'}
                            onClick={() => setStatus(filter.value)}
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>

                {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!isLoading && items.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nothing here.</p>
                )}

                {items.map(message => (
                    <MessageCard
                        key={message.id}
                        message={message}
                        busy={update.isPending}
                        onStatus={(id, next) => update.mutate({ id, status: next })}
                    />
                ))}

                {data && data.contactMessages.totalItems > items.length && (
                    <p className="text-xs text-muted-foreground mt-3">
                        Showing {items.length} of {data.contactMessages.totalItems}.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default defineDashboardExtension({
    routes: [
        {
            path: '/contact-messages',
            navMenuItem: {
                sectionId: 'customers',
                id: 'contact-messages',
                title: 'Contact messages',
                icon: Mail,
            },
            component: () => (
                <Page pageId="contact-messages">
                    <PageTitle>Contact messages</PageTitle>
                    <PageLayout>
                        <PageBlock column="main" blockId="contact-inbox">
                            <ContactInbox />
                        </PageBlock>
                    </PageLayout>
                </Page>
            ),
        },
    ],
});
