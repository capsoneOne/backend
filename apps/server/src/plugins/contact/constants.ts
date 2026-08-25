export const CONTACT_PLUGIN_OPTIONS = Symbol('CONTACT_PLUGIN_OPTIONS');

/** Topics the storefront form offers. Kept in sync with the contact page copy. */
export const CONTACT_TOPICS = ['order', 'product', 'other'] as const;

export const MAX_NAME_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_ORDER_CODE_LENGTH = 64;
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Header the storefront uses to pass the visitor's address through its
 * server-to-server call. See ContactService.hashSubmitter for why it is needed.
 */
export const CLIENT_IP_HEADER = 'x-contact-client-ip';
