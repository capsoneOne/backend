import type {MessageLoaders} from '@/platform/i18n/messages';

export const authenticationMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    km: () => import('./messages/km.json'),
};
