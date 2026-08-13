'use client';

import {useEffect, useState} from 'react';
import {useRouter} from '@/platform/i18n/navigation';

const MAX_REFRESHES = 10;

export function PaymentStatusRefresh() {
    const router = useRouter();
    const [refreshes, setRefreshes] = useState(0);

    useEffect(() => {
        if (refreshes >= MAX_REFRESHES) return;

        const timeout = window.setTimeout(() => {
            setRefreshes(current => current + 1);
            router.refresh();
        }, 1500);

        return () => window.clearTimeout(timeout);
    }, [refreshes, router]);

    return null;
}
