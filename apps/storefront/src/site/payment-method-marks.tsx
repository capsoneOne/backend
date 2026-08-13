import Image from 'next/image';

interface PaymentMethodMarksProps {
    title: string;
    description: string;
    demoNote: string;
}

/**
 * Marks render at a uniform 24px height, so each `width` is that height times the
 * asset's own aspect ratio. These have to be real numbers rather than `w-auto`:
 * Tailwind's preflight forces `img { height: auto }`, and an image with both
 * dimensions auto collapses to 0x0 until it loads — which, with `loading="lazy"`,
 * it never does, because a zero-area box never intersects the viewport. A definite
 * width breaks that deadlock and doubles as the correct layout placeholder.
 */
const MARK_HEIGHT = 24;

const paymentMethods = [
    {name: 'Visa', src: '/payments/visa.svg', width: 36},
    {name: 'Mastercard', src: '/payments/mastercard.svg', width: 40},
] as const;

export function PaymentMethodMarks({title, description, demoNote}: PaymentMethodMarksProps) {
    return (
        <div className="flex flex-col gap-3 border-y border-border/80 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="shrink-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">{title}</p>
                <p className="mt-0.5 text-[0.65rem] font-light text-muted-foreground">{demoNote}</p>
                <span className="sr-only">{description}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" aria-label={title}>
                {paymentMethods.map((method) => (
                    <span
                        key={method.name}
                        className="flex h-9 items-center justify-center rounded-md border border-slate-200/90 bg-white px-2 shadow-[0_1px_2px_rgb(15_23_42/0.05)]"
                    >
                        <Image
                            src={method.src}
                            alt={method.name}
                            width={method.width}
                            height={MARK_HEIGHT}
                            sizes={`${method.width}px`}
                            className="h-6 object-contain"
                        />
                    </span>
                ))}
            </div>
        </div>
    );
}
