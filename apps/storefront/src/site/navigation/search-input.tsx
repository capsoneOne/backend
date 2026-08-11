'use client';

import {useState, useEffect, useTransition} from 'react';
import {useSearchParams} from 'next/navigation';
import {useRouter} from '@/platform/i18n/navigation';
import {Search} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {useTranslations} from 'next-intl';

export function SearchInput() {
    const t = useTranslations('Navigation');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

    useEffect(() => {
        setSearchValue(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        startTransition(() => {
            router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
        });
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
            <Input
                type="search"
                placeholder={t('searchProducts')}
                className="h-10 w-full rounded-full border-transparent bg-muted pl-10 pr-4 transition-colors focus-visible:border-transparent focus-visible:bg-card"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                disabled={isPending}
            />
        </form>
    );
}
