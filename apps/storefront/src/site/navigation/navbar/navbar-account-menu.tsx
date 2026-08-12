'use client';

import {ChevronRight, LogIn, MapPin, Package, Settings, User, UserPlus} from 'lucide-react';

import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Link} from '@/platform/i18n/navigation';
import {LoginButton} from '@/site/navigation/navbar/login-button';
import {navbarIconClass} from '@/site/navigation/navigation-styles';
import {getAvatarSrc} from '@/features/account/avatars';

interface NavbarAccountMenuProps {
    customer: {
        firstName: string;
        lastName: string;
        emailAddress: string;
        avatarKey?: string | null;
    } | null;
    labels: {
        profile: string;
        account: string;
        orders: string;
        addresses: string;
        settings: string;
        signIn: string;
        createAccount: string;
    };
}

const menuContentClass = 'z-[100] rounded-2xl border border-border/70 bg-popover p-2 shadow-[var(--shadow-e3)]';
const menuItemClass = 'min-h-11 rounded-xl px-3 py-2 font-medium focus:bg-primary/8 focus:text-primary';

export function NavbarAccountMenu({customer, labels}: NavbarAccountMenuProps) {
    const avatarSrc = getAvatarSrc(customer?.avatarKey);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={(
                    <Button
                        variant="ghost"
                        size="icon"
                        className={navbarIconClass}
                        aria-label={labels.profile}
                        title={labels.profile}
                    />
                )}
            >
                {avatarSrc ? (
                    <Avatar className="size-8">
                        <AvatarImage src={avatarSrc} alt="" />
                    </Avatar>
                ) : (
                    <User className="size-5" />
                )}
            </DropdownMenuTrigger>

            {customer ? (
                <AuthenticatedMenuContent customer={customer} labels={labels} />
            ) : (
                <GuestMenuContent labels={labels} />
            )}
        </DropdownMenu>
    );
}

function GuestMenuContent({labels}: Pick<NavbarAccountMenuProps, 'labels'>) {
    return (
        <DropdownMenuContent align="end" sideOffset={10} className={`${menuContentClass} w-64`}>
            <div className="rounded-xl bg-gradient-to-br from-primary/12 via-primary/6 to-transparent p-3">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <User className="size-5" />
                    </span>
                    <div>
                        <p className="font-medium text-foreground">{labels.account}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{labels.signIn}</p>
                    </div>
                </div>
            </div>
            <div className="mt-2 space-y-0.5">
                <DropdownMenuItem render={<Link href="/sign-in" />} className={menuItemClass}>
                    <LogIn className="size-4 text-primary" />
                    {labels.signIn}
                    <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/register" />} className={menuItemClass}>
                    <UserPlus className="size-4 text-primary" />
                    {labels.createAccount}
                    <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
                </DropdownMenuItem>
            </div>
        </DropdownMenuContent>
    );
}

function AuthenticatedMenuContent({
    customer,
    labels,
}: {
    customer: NonNullable<NavbarAccountMenuProps['customer']>;
    labels: NavbarAccountMenuProps['labels'];
}) {
    const fullName = `${customer.firstName} ${customer.lastName}`.trim();
    const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();
    const avatarSrc = getAvatarSrc(customer.avatarKey);
    const items = [
        {href: '/account/profile', label: labels.profile, icon: User},
        {href: '/account/orders', label: labels.orders, icon: Package},
        {href: '/account/addresses', label: labels.addresses, icon: MapPin},
        {href: '/account/settings', label: labels.settings, icon: Settings},
    ] as const;

    return (
        <DropdownMenuContent align="end" sideOffset={10} className={`${menuContentClass} w-72`}>
            <div className="rounded-xl bg-gradient-to-br from-primary/12 via-primary/6 to-transparent p-3">
                <div className="flex items-center gap-3">
                    <Avatar className="size-12 shadow-sm">
                        {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
                        <AvatarFallback className="bg-primary text-base font-bold text-primary-foreground">
                            {initials || <User className="size-5" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{fullName || labels.account}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{customer.emailAddress}</p>
                    </div>
                </div>
            </div>

            <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 pb-1 pt-3 text-[0.6875rem] font-bold uppercase tracking-[0.16em]">
                    {labels.account}
                </DropdownMenuLabel>
                <div className="space-y-0.5">
                    {items.map(item => {
                        const Icon = item.icon;
                        return (
                            <DropdownMenuItem key={item.href} render={<Link href={item.href} />} className={menuItemClass}>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                                    <Icon className="size-4" />
                                </span>
                                {item.label}
                                <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem
                render={<LoginButton isLoggedIn />}
                nativeButton
                variant="destructive"
                className={`${menuItemClass} text-destructive`}
            />
        </DropdownMenuContent>
    );
}
