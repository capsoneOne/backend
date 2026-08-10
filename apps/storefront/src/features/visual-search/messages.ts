import type {MessageLoaders} from '@/platform/i18n/messages';

export const visualSearchMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    km: () => import('./messages/km.json'),
};
