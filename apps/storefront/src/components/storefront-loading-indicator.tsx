import {Spinner} from '@/components/ui/spinner';
import {BrandMark} from '@/site/brand';
import {useTranslations} from 'next-intl';

/**
 * Branded page-level loading state. The compact `Spinner` remains suitable for
 * buttons while this composition gives route transitions a storefront identity.
 */
export function StorefrontLoadingIndicator() {
    const t = useTranslations('Common');

    return (
        <div
            className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center px-4 py-16"
            role="status"
            aria-live="polite"
            aria-label={t('loadingLabel')}
        >
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="loading-mark relative grid size-28 place-items-center" aria-hidden="true">
                    <span className="loading-mark-glow absolute inset-3 rounded-full bg-primary/10" />
                    <Spinner className="absolute inset-0 size-full text-primary" aria-hidden="true" />
                    <BrandMark className="size-12 rounded-2xl shadow-none [&_svg]:size-6" />
                    <span className="loading-orbit loading-orbit-one absolute size-2 rounded-full bg-primary" />
                    <span className="loading-orbit loading-orbit-two absolute size-1.5 rounded-full bg-chart-2" />
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{t('loadingStorefront')}</p>
                    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
                        <span className="loading-dot size-1.5 rounded-full bg-primary" />
                        <span className="loading-dot size-1.5 rounded-full bg-primary" />
                        <span className="loading-dot size-1.5 rounded-full bg-primary" />
                    </div>
                </div>
            </div>
        </div>
    );
}
