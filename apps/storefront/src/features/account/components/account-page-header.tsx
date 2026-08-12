import type {ReactNode} from 'react';
import {StorefrontPageHeader} from '@/components/catalogue-page';

interface AccountPageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    breadcrumbs?: ReactNode;
}

/** Shared heading treatment for every page inside the account workspace. */
export function AccountPageHeader({title, description, actions, breadcrumbs}: AccountPageHeaderProps) {
    return (
        <StorefrontPageHeader
            title={title}
            description={description}
            actions={actions}
            breadcrumbs={breadcrumbs}
            variant="compact"
        />
    );
}
