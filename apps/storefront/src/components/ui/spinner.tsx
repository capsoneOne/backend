import {cn} from '@/lib/utils';
import {useTranslations} from 'next-intl';

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    const t = useTranslations('Common');

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            role="status"
            aria-label={t('loadingLabel')}
            className={cn('stitch-spinner size-4', className)}
            {...props}
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.18"
            />
            <path
                d="M12 3a9 9 0 0 1 8.34 5.62"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
            <circle className="stitch-spinner-dot" cx="20.34" cy="8.62" r="1.35" fill="currentColor" />
        </svg>
    );
}

export {Spinner};
