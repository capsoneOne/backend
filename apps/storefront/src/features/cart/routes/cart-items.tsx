import Image from 'next/image';
import { Link } from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Minus, Plus, X} from 'lucide-react';
import {Price} from '@/features/pricing/price';
import {removeFromCart, adjustQuantity} from './actions';
import {getTranslations} from 'next-intl/server';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    lines: Array<{
        id: string;
        quantity: number;
        unitPriceWithTax: number;
        linePriceWithTax: number;
        productVariant: {
            id: string;
            name: string;
            sku: string;
            product: {
                name: string;
                slug: string;
                featuredAsset?: {
                    preview: string;
                } | null;
            };
        };
    }>;
};

export async function CartItems({activeOrder}: { activeOrder: ActiveOrder | null }) {
    const t = await getTranslations('Cart');
    if (!activeOrder || activeOrder.lines.length === 0) {
        return (
            <Card className="mx-auto max-w-4xl gap-0 py-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="relative flex min-h-72 items-center justify-center bg-secondary/45 p-7 sm:p-9">
                        <Image
                            src="/storyset/online-shopping-cuate.svg"
                            alt={t('illustrationAlt')}
                            width={500}
                            height={500}
                            priority
                            className="max-h-80 w-full object-contain"
                        />
                        <p className="absolute inset-x-0 bottom-3 text-center text-[0.6875rem] text-muted-foreground">
                            <a
                                href="https://storyset.com/illustration/online-shopping/cuate"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                            >
                                {t('illustrationCredit')}
                            </a>
                        </p>
                    </div>
                    <div className="flex flex-col justify-center px-7 py-10 sm:p-10">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('emptyEyebrow')}</p>
                        <h2 className="mt-3 text-balance text-2xl font-bold md:text-3xl">{t('empty')}</h2>
                        <p className="mt-4 max-w-md font-light leading-relaxed text-muted-foreground">{t('emptyMessage')}</p>
                        <div className="mt-7">
                            <Button render={<Link href="/search" />} nativeButton={false} className="min-h-11 px-5">
                                {t('continueShopping')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {activeOrder.lines.map((line) => (
                <div
                    key={line.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5"
                >
                    {line.productVariant.product.featuredAsset && (
                        <Link
                            href={`/product/${line.productVariant.product.slug}`}
                            className="flex-shrink-0"
                        >
                            <Image
                                src={line.productVariant.product.featuredAsset.preview}
                                alt={line.productVariant.name}
                                width={120}
                                height={120}
                                className="h-[120px] w-full rounded-xl bg-muted object-cover sm:w-[120px]"
                            />
                        </Link>
                    )}

                    <div className="flex-grow min-w-0">
                        <Link
                            href={`/product/${line.productVariant.product.slug}`}
                            className="block font-medium transition-colors hover:text-primary"
                        >
                            {line.productVariant.product.name}
                        </Link>
                        {line.productVariant.name !== line.productVariant.product.name && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {line.productVariant.name}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('sku', {sku: line.productVariant.sku})}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 sm:hidden">
                            <Price value={line.unitPriceWithTax} currencyCode={activeOrder.currencyCode}/> {t('each')}
                        </p>

                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50">
                                <form
                                    action={async () => {
                                        'use server';
                                        await adjustQuantity(line.id, Math.max(1, line.quantity - 1));
                                    }}
                                >
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="icon"
                                        className="size-10 rounded-md hover:bg-background"
                                        disabled={line.quantity <= 1}
                                        aria-label={t('decreaseQuantity', {name: line.productVariant.product.name})}
                                    >
                                        <Minus className="h-4 w-4"/>
                                    </Button>
                                </form>

                                <span className="w-9 text-center font-medium tabular-nums">{line.quantity}</span>

                                <form
                                    action={async () => {
                                        'use server';
                                        await adjustQuantity(line.id, line.quantity + 1);
                                    }}
                                >
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="icon"
                                        className="size-10 rounded-md hover:bg-background"
                                        aria-label={t('increaseQuantity', {name: line.productVariant.product.name})}
                                    >
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </form>
                            </div>

                            <form
                                action={async () => {
                                    'use server';
                                    await removeFromCart(line.id);
                                }}
                            >
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="icon"
                                    className="size-10 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={t('removeItem', {name: line.productVariant.product.name})}
                                >
                                    <X className="h-5 w-5"/>
                                </Button>
                            </form>

                            <div className="sm:hidden ml-auto">
                                <p className="text-lg font-bold">
                                    <Price value={line.linePriceWithTax}
                                           currencyCode={activeOrder.currencyCode}/>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:block text-right flex-shrink-0">
                        <p className="text-lg font-bold">
                            <Price value={line.linePriceWithTax} currencyCode={activeOrder.currencyCode}/>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            <Price value={line.unitPriceWithTax} currencyCode={activeOrder.currencyCode}/> {t('each')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
