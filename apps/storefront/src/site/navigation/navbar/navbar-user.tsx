import {getRouteLocale} from '@/platform/i18n/server';
import {MapPin, Package, Settings, User} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/platform/i18n/navigation';
import {LoginButton} from "@/site/navigation/navbar/login-button";
import {getActiveCustomer} from '@/features/account/customer';
import {getTranslations} from 'next-intl/server';


export async function NavbarUser() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Navigation'});
    const customer = await getActiveCustomer()

    if (!customer) {
        return (
            <Button
                render={<Link href="/sign-in" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t('profile')}
                title={t('profile')}
            >
                <User className="size-5" />
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" className="size-11" aria-label={t('profile')} title={t('profile')} />}
            >
                <User className="size-5"/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                    <p className="text-sm font-medium">{t('greeting', {name: customer.firstName})}</p>
                    <p className="truncate text-xs text-muted-foreground">{customer.emailAddress}</p>
                </div>
                <DropdownMenuSeparator/>
                <DropdownMenuItem render={<Link href="/account/profile" />}><User />{t('profile')}</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account/orders" />}><Package />{t('orders')}</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account/addresses" />}><MapPin />{t('addresses')}</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account/settings" />}><Settings />{t('settings')}</DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem render={<LoginButton isLoggedIn={true} />} nativeButton />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
