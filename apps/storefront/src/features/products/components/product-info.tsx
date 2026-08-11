'use client';

import {useEffect, useState, useMemo, useRef, useTransition} from 'react';
import {useSearchParams} from 'next/navigation';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Separator} from '@/components/ui/separator';
import {ShoppingCart, CheckCircle2, ScanSearch} from 'lucide-react';
import {addToCart} from '@/features/products/add-to-cart';
import {toast} from 'sonner';
import {Price} from '@/features/pricing/price';
import {useTranslations} from 'next-intl';
import {Link} from '@/platform/i18n/navigation';
import {SizeGuide} from './size-guide';
import {cn} from '@/lib/utils';

export interface ProductInfoVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    stockLevel: string;
    assets: Array<{id: string; preview: string; source: string}>;
    options: Array<{
        id: string;
        code: string;
        name: string;
        groupId: string;
        group: {
            id: string;
            code: string;
            name: string;
        };
    }>;
}

export interface ProductInfoProduct {
        id: string;
        name: string;
        description: string;
        variants: ProductInfoVariant[];
        optionGroups: Array<{
            id: string;
            code: string;
            name: string;
            options: Array<{
                id: string;
                code: string;
                name: string;
            }>;
        }>;
}

interface ProductInfoProps {
    product: ProductInfoProduct;
    searchParams: { [key: string]: string | string[] | undefined };
    currencyCode: string;
    onVariantChange?: (variant: ProductInfoVariant | null) => void;
    findSimilarAssetId?: string;
}

function isSizeGroup(code: string, name: string) {
    return /size|taille|größe/i.test(`${code} ${name}`);
}

function isColorGroup(code: string, name: string) {
    return /colou?r|shade/i.test(`${code} ${name}`);
}

const COLOR_VALUES: Record<string, string> = {
    black: '#171717', white: '#ffffff', grey: '#9ca3af', gray: '#9ca3af', red: '#dc2626',
    blue: '#2563eb', green: '#16a34a', yellow: '#eab308', orange: '#ea580c', purple: '#9333ea',
    pink: '#ec4899', brown: '#7c4a2d', beige: '#d6c4a8', navy: '#172554', cream: '#fff7e6',
};

function colorValue(name: string) {
    return COLOR_VALUES[name.trim().toLowerCase()];
}

export function ProductInfo({
    product,
    searchParams,
    currencyCode,
    onVariantChange,
    findSimilarAssetId,
}: ProductInfoProps) {
    const t = useTranslations('Product');
    const pathname = usePathname();
    const router = useRouter();
    const currentSearchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Initialize selected options from URL
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
        const initialOptions: Record<string, string> = {};

        // Load from URL search params
        product.optionGroups.forEach((group) => {
            const paramValue = searchParams[group.code];
            if (typeof paramValue === 'string') {
                // Find the option by code
                const option = group.options.find((opt) => opt.code === paramValue);
                if (option) {
                    initialOptions[group.id] = option.id;
                }
            }
        });

        return initialOptions;
    });

    // Find the matching variant based on selected options
    const selectedVariant = useMemo(() => {
        if (product.variants.length === 1) {
            return product.variants[0];
        }

        // If not all option groups have a selection, return null
        if (Object.keys(selectedOptions).length !== product.optionGroups.length) {
            return null;
        }

        // Find variant that matches all selected options
        return product.variants.find((variant) => {
            const variantOptionIds = variant.options.map((opt) => opt.id);
            const selectedOptionIds = Object.values(selectedOptions);
            return selectedOptionIds.every((optId) => variantOptionIds.includes(optId));
        });
    }, [selectedOptions, product.variants, product.optionGroups]);

    useEffect(() => onVariantChange?.(selectedVariant ?? null), [onVariantChange, selectedVariant]);

    const priceRange = useMemo(() => {
        const prices = product.variants.map(variant => variant.priceWithTax);
        return prices.length ? {min: Math.min(...prices), max: Math.max(...prices)} : null;
    }, [product.variants]);

    const getOptionState = (groupId: string, optionId: string) => {
        const candidates = product.variants.filter(variant => {
            const ids = variant.options.map(option => option.id);
            if (!ids.includes(optionId)) return false;
            return Object.entries(selectedOptions).every(([selectedGroupId, selectedOptionId]) =>
                selectedGroupId === groupId || ids.includes(selectedOptionId),
            );
        });
        return {
            exists: candidates.length > 0,
            inStock: candidates.some(variant => variant.stockLevel !== 'OUT_OF_STOCK'),
        };
    };

    const handleOptionChange = (groupId: string, optionId: string) => {
        setSelectedOptions(prev => {
            const next = {...prev, [groupId]: optionId};
            for (const [otherGroupId, otherOptionId] of Object.entries(next)) {
                if (otherGroupId === groupId) continue;
                const compatible = product.variants.some(variant => {
                    const ids = variant.options.map(option => option.id);
                    return ids.includes(optionId) && ids.includes(otherOptionId);
                });
                if (!compatible) delete next[otherGroupId];
            }
            return next;
        });

        // Find the option group and option to get their codes
        const group = product.optionGroups.find((g) => g.id === groupId);
        const option = group?.options.find((opt) => opt.id === optionId);

        if (group && option) {
            // Update URL with option code
            const params = new URLSearchParams(currentSearchParams);
            params.set(group.code, option.code);
            router.push(`${pathname}?${params.toString()}`, {scroll: false});
        }
    };

    const handleAddToCart = async () => {
        if (!selectedVariant) return;

        startTransition(async () => {
            const result = await addToCart(selectedVariant.id, 1);

            if (result.success) {
                setIsAdded(true);
                toast.success(t('addedToCartMessage'), {
                    description: t('addedToCartDescription', {name: product.name}),
                });

                // Reset the added state after 2 seconds
                setTimeout(() => setIsAdded(false), 2000);
            } else {
                toast.error(t('errorTitle'), {
                    description: result.error || t('errorAddToCart'),
                });
            }
        });
    };

    const isInStock = selectedVariant && selectedVariant.stockLevel !== 'OUT_OF_STOCK';
    const canAddToCart = selectedVariant && isInStock;
    const similarAssetId = selectedVariant?.assets[0]?.id ?? findSimilarAssetId;
    const stickyActionDisabled = isPending || (
        selectedVariant
            ? !isInStock
            : product.optionGroups.length === 0
    );

    const handleStickyAction = () => {
        if (!selectedVariant && product.optionGroups.length > 0) {
            optionsRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
            return;
        }

        void handleAddToCart();
    };

    const purchaseLabel = isAdded
        ? t('addedToCart')
        : isPending
            ? t('adding')
            : !selectedVariant && product.optionGroups.length > 0
                ? t('selectOptions')
                : !isInStock
                    ? t('outOfStock')
                    : t('addToCart');

    return (
        <div className="space-y-6">
            {/* Product Title & Price */}
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{product.name}</h1>
                {selectedVariant || priceRange ? (
                    <p className="text-2xl font-semibold text-muted-foreground md:text-3xl">
                        {selectedVariant ? (
                            <Price value={selectedVariant.priceWithTax} currencyCode={currencyCode}/>
                        ) : priceRange?.min === priceRange?.max ? (
                            <Price value={priceRange!.min} currencyCode={currencyCode}/>
                        ) : (
                            <>{t('from')} <Price value={priceRange!.min} currencyCode={currencyCode}/></>
                        )}
                    </p>
                ) : null}
            </div>

            <Separator />

            {/* Product Description */}
            <div className="prose prose-sm max-w-none text-muted-foreground">
                <div dangerouslySetInnerHTML={{__html: product.description}}/>
            </div>

            {/* Option Groups */}
            {product.optionGroups.length > 0 && (
                <div ref={optionsRef} className="scroll-mt-24 space-y-5">
                    {product.optionGroups.map((group) => (
                        <div key={group.id} className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-base font-semibold">{group.name}</Label>
                                {isSizeGroup(group.code, group.name) ? <SizeGuide /> : null}
                            </div>
                            <RadioGroup
                                value={selectedOptions[group.id] || ''}
                                onValueChange={(value) => handleOptionChange(group.id, value)}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {group.options.map((option) => {
                                        const state = getOptionState(group.id, option.id);
                                        const swatch = isColorGroup(group.code, group.name) ? colorValue(option.name) : undefined;
                                        return (
                                        <div key={option.id}>
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                className="peer sr-only"
                                                disabled={!state.exists}
                                            />
                                            <Label
                                                htmlFor={option.id}
                                                aria-disabled={!state.exists}
                                                className={cn(
                                                    'flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover px-4 py-3 text-sm font-medium transition-all',
                                                    'cursor-pointer hover:bg-accent peer-data-[checked]:border-primary peer-data-[checked]:bg-primary/5 peer-data-[checked]:ring-2 peer-data-[checked]:ring-primary/20',
                                                    !state.exists && 'cursor-not-allowed opacity-35 line-through',
                                                    state.exists && !state.inStock && 'opacity-60',
                                                )}
                                            >
                                                {swatch ? (
                                                    <span
                                                        className="size-4 rounded-full border border-black/15 shadow-inner"
                                                        style={{backgroundColor: swatch}}
                                                        aria-hidden="true"
                                                    />
                                                ) : null}
                                                {option.name}
                                            </Label>
                                        </div>
                                        );
                                    })}
                                </div>
                            </RadioGroup>
                        </div>
                    ))}
                </div>
            )}

            {/* Stock Status */}
            {selectedVariant && (
                <div className="text-sm">
                    {isInStock ? (
                        <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                            <span className="h-2 w-2 rounded-full bg-green-600" />
                            {t('inStock')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            {t('outOfStock')}
                        </span>
                    )}
                </div>
            )}

            {/* Add to Cart Button */}
            <div className="pt-2 space-y-3">
                <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold rounded-lg"
                    disabled={!canAddToCart || isPending}
                    onClick={handleAddToCart}
                >
                    {isAdded ? (
                        <>
                            <CheckCircle2 className="mr-2 h-5 w-5"/>
                            {t('addedToCart')}
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="mr-2 h-5 w-5"/>
                            {purchaseLabel}
                        </>
                    )}
                </Button>
                <Button
                    render={<Link href={`/visual-search?productId=${encodeURIComponent(product.id)}${similarAssetId ? `&assetId=${encodeURIComponent(similarAssetId)}` : ''}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-lg text-base font-semibold"
                >
                    <ScanSearch className="mr-2 size-5" />
                    {t('findSimilar')}
                </Button>
            </div>

            {/* SKU */}
            {selectedVariant && (
                <div className="text-xs text-muted-foreground">
                    {t('sku', {sku: selectedVariant.sku})}
                </div>
            )}

            <div className="h-24 md:hidden" aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden">
                <div className="mx-auto flex max-w-lg items-center gap-3">
                    <div className="min-w-0 shrink-0">
                        <p className="max-w-28 truncate text-xs text-muted-foreground">{product.name}</p>
                        <p className="font-bold tracking-tight">
                            {selectedVariant ? (
                                <Price value={selectedVariant.priceWithTax} currencyCode={currencyCode}/>
                            ) : priceRange ? (
                                <>
                                    {priceRange.min !== priceRange.max ? (
                                        <span className="mr-1 text-xs font-normal text-muted-foreground">{t('from')}</span>
                                    ) : null}
                                    <Price value={priceRange.min} currencyCode={currencyCode}/>
                                </>
                            ) : null}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        className="h-12 min-w-0 flex-1 rounded-xl text-base font-semibold"
                        disabled={stickyActionDisabled}
                        onClick={handleStickyAction}
                    >
                        {isAdded ? <CheckCircle2 className="size-5"/> : <ShoppingCart className="size-5"/>}
                        <span className="truncate">{purchaseLabel}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
