import type {MessageLoaders} from '@/platform/i18n/messages';

export const checkoutMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    km: () => import('./messages/km.json'),
};
