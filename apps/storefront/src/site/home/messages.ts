import type {MessageLoaders} from '@/platform/i18n/messages';

// Home-owned copy is loaded independently so personalized and campaign content
// can evolve without expanding the shared site message namespace.
export const homeMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    km: () => import('./messages/km.json'),
};
