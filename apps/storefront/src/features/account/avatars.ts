export const AVATAR_OPTIONS = [
    {key: 'avatar-01', gender: 'male'},
    {key: 'avatar-02', gender: 'male'},
    {key: 'avatar-03', gender: 'male'},
    {key: 'avatar-04', gender: 'male'},
    {key: 'avatar-05', gender: 'male'},
    {key: 'avatar-06', gender: 'female'},
    {key: 'avatar-07', gender: 'female'},
    {key: 'avatar-08', gender: 'female'},
    {key: 'avatar-09', gender: 'female'},
    {key: 'avatar-10', gender: 'female'},
] as const;

export type AvatarKey = (typeof AVATAR_OPTIONS)[number]['key'];

const AVATAR_KEYS = new Set<string>(AVATAR_OPTIONS.map(option => option.key));

export function isAvatarKey(value: unknown): value is AvatarKey {
    return typeof value === 'string' && AVATAR_KEYS.has(value);
}

export function getAvatarSrc(value: unknown): string | undefined {
    return isAvatarKey(value) ? `/avatars/${value}.png` : undefined;
}
