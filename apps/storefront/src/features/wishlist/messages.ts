import type {MessageLoaders} from '@/platform/i18n/messages';

export const wishlistMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
};
