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
import { ScanSearch } from 'lucide-react';
import React from 'react';

import { embedderHealthQuery, indexStatusQuery, reindexMutation } from './queries.js';

/**
 * Admin page for the visual-search index.
 *
 * Two things live here because they are only meaningful together: what the embedder
 * currently is, and how much of the catalogue is embedded against that identity. A
 * reindex button without the revision next to it is how an index ends up half-built
 * on two different models.
 */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-1.5 border-b last:border-b-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-mono text-right break-all">{children}</span>
        </div>
    );
}

function EmbedderHealthCard() {
    // Deliberately polled. This is the panel an operator stares at while deciding
    // whether to start a run, and a stale "healthy" is worse than no answer.
    const { data, isLoading } = useQuery({
        queryKey: ['visualSearchEmbedderHealth'],
        queryFn: () => api.query(embedderHealthQuery),
        refetchInterval: 15_000,
    });
    const h = data?.visualSearchEmbedderHealth;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Embedder
                    {h && (
                        <Badge variant={h.reachable && h.status === 'ok' ? 'default' : 'destructive'}>
                            {h.reachable ? (h.status ?? 'unknown') : 'unreachable'}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>The model behind every vector in the index.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-sm text-muted-foreground">Checking…</p>}
                {h && !h.reachable && (
                    <p className="text-sm text-destructive">
                        {h.error ?? 'The embedding service did not respond.'} Search returns nothing
                        and indexing cannot run until it is back.
                    </p>
                )}
                {h?.reachable && (
                    <div className="flex flex-col">
                        <Row label="Model">{h.modelId}</Row>
                        <Row label="Revision">
                            {h.revision}{' '}
                            {!h.pinned && <Badge variant="destructive">unpinned</Badge>}
                        </Row>
                        <Row label="Dimensions">
                            {h.embeddingDim}
                            {!h.dimMatches && (
                                <Badge variant="destructive"> expected {h.expectedDim}</Badge>
                            )}
                        </Row>
                        <Row label="Modalities">{h.modalities?.join(', ')}</Row>
                        <Row label="Shared image/text space">{h.sharedSpace ? 'yes' : 'no'}</Row>
                        <Row label="Vectors normalized">{h.normalized ? 'yes' : 'no'}</Row>
                        {!h.pinned && (
                            <p className="text-sm text-destructive mt-3">
                                The embedder could not resolve a commit sha, so this revision will
                                change on its next successful start and orphan everything written
                                now. Reindexing is refused in this state — restart the embedder with
                                network access.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function IndexStatusCard() {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['visualSearchIndexStatus'],
        queryFn: () => api.query(indexStatusQuery),
        refetchInterval: 15_000,
    });
    const s = data?.visualSearchIndexStatus;

    const reindex = useMutation({
        mutationFn: (onlyMissing: boolean) => api.mutate(reindexMutation, { onlyMissing }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['visualSearchIndexStatus'] });
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Index</CardTitle>
                <CardDescription>
                    Only vectors on the live revision are searchable. Stale rows are ignored, not
                    deleted.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {s && (
                    <div className="flex flex-col">
                        <Row label="Products searchable">{s.products}</Row>
                        <Row label="Vectors on live revision">{s.current}</Row>
                        <Row label="Stale vectors">
                            {s.stale}{' '}
                            {s.stale > 0 && <Badge variant="secondary">reindex due</Badge>}
                        </Row>
                        <Row label="Revision">{s.revision}</Row>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                        onClick={() => reindex.mutate(false)}
                        disabled={reindex.isPending}
                    >
                        {reindex.isPending ? 'Queueing…' : 'Reindex everything'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => reindex.mutate(true)}
                        disabled={reindex.isPending}
                    >
                        Index missing only
                    </Button>
                </div>

                {reindex.isSuccess && (
                    <p className="text-sm text-muted-foreground mt-3">
                        Queued {reindex.data?.reindexVisualSearch ?? 0} product(s). Embedding runs in
                        the background — the counts above refresh every 15 seconds.
                    </p>
                )}
                {reindex.isError && (
                    <p className="text-sm text-destructive mt-3">
                        {(reindex.error as Error)?.message ?? 'Could not queue the reindex.'}
                    </p>
                )}

                <p className="text-xs text-muted-foreground mt-4">
                    &ldquo;Index missing only&rdquo; resumes an interrupted run: it queues just the
                    products with no vector at the live revision. After a model change every product
                    is missing, so it does the same work as a full reindex.
                </p>
            </CardContent>
        </Card>
    );
}

export default defineDashboardExtension({
    routes: [
        {
            path: '/visual-search',
            navMenuItem: {
                sectionId: 'catalog',
                id: 'visual-search',
                title: 'Visual search',
                icon: ScanSearch,
            },
            component: () => (
                <Page pageId="visual-search-index">
                    <PageTitle>Visual search</PageTitle>
                    <PageLayout>
                        <PageBlock column="main" blockId="embedder-health">
                            <EmbedderHealthCard />
                        </PageBlock>
                        <PageBlock column="main" blockId="index-status">
                            <IndexStatusCard />
                        </PageBlock>
                    </PageLayout>
                </Page>
            ),
        },
    ],
});
