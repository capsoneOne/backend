'use client';

import Image from 'next/image';
import {Check} from 'lucide-react';
import {useActionState, useState} from 'react';
import {useTranslations} from 'next-intl';

import {AVATAR_OPTIONS, AvatarKey, getAvatarSrc, isAvatarKey} from '@/features/account/avatars';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {updateAvatarAction} from './actions';

export function AvatarPicker({currentAvatar}: {currentAvatar?: string | null}) {
    const t = useTranslations('Account');
    const initialAvatar = isAvatarKey(currentAvatar) ? currentAvatar : 'avatar-01';
    const [selected, setSelected] = useState<AvatarKey>(initialAvatar);
    const [state, formAction, isPending] = useActionState(updateAvatarAction, undefined);

    return (
        <Card className="overflow-hidden border-border">
            <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-background shadow-[var(--shadow-e2)] ring-2 ring-primary/20">
                        <Image src={getAvatarSrc(selected)!} alt="" fill sizes="80px" className="object-cover" priority />
                    </div>
                    <div>
                        <CardTitle>{t('chooseAvatar')}</CardTitle>
                        <CardDescription className="mt-1">{t('chooseAvatarDescription')}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <form action={formAction}>
                <CardContent className="space-y-6 pt-6">
                    <input type="hidden" name="avatarKey" value={selected} />
                    {(['male', 'female'] as const).map(gender => (
                        <fieldset key={gender}>
                            <legend className="mb-3 text-sm font-semibold text-foreground">
                                {t(gender === 'male' ? 'maleAvatars' : 'femaleAvatars')}
                            </legend>
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                                {AVATAR_OPTIONS.filter(option => option.gender === gender).map((option, index) => {
                                    const active = selected === option.key;
                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => setSelected(option.key)}
                                            aria-pressed={active}
                                            aria-label={t('avatarOption', {number: index + 1, group: t(gender === 'male' ? 'maleAvatars' : 'femaleAvatars')})}
                                            className={cn(
                                                'group relative aspect-square overflow-hidden rounded-2xl border-2 bg-secondary outline-none transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-e2)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                                active ? 'border-primary shadow-[var(--shadow-e2)] ring-2 ring-primary/20' : 'border-transparent',
                                            )}
                                        >
                                            <Image
                                                src={getAvatarSrc(option.key)!}
                                                alt=""
                                                fill
                                                sizes="(max-width: 640px) 28vw, 112px"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            {active ? (
                                                <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                                    <Check className="size-4" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}

                    {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
                    {state?.success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('avatarUpdated')}</p> : null}

                    <Button type="submit" disabled={isPending || selected === currentAvatar} className="min-h-11 px-5">
                        {isPending ? t('savingAvatar') : t('saveAvatar')}
                    </Button>
                </CardContent>
            </form>
        </Card>
    );
}
