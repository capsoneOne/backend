import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {InfiniteSlider} from '@/components/ui/infinite-slider';
import {cn} from '@/lib/utils';

type Testimonial = {
    quote: string;
    name: string;
};

const testimonials: Testimonial[] = [
    {
        quote: 'I found the right headphones in minutes, and the product details made comparing models genuinely easy.',
        name: 'Maya R.',
    },
    {
        quote: 'Everything arrived exactly as pictured, carefully packed, and with clear updates from checkout to delivery.',
        name: 'Sofia L.',
    },
    {
        quote: 'I picked up home essentials and a gift in one order without jumping between different stores.',
        name: 'Jonah K.',
    },
    {
        quote: 'The category filters helped me narrow a huge choice down to the exact product I needed.',
        name: 'Lina P.',
    },
    {
        quote: 'Clear specifications, useful photos, and no surprises when the product arrived. Exactly what I wanted.',
        name: 'Amara D.',
    },
    {
        quote: 'The colours are even better in person, and the quality feels excellent for everyday use.',
        name: 'Theo N.',
    },
    {
        quote: 'My wishlist made it easy to compare favourites across fashion, home, and technology before ordering.',
        name: 'Dara S.',
    },
    {
        quote: 'There is a lot to explore, but the categories and search keep the marketplace feeling simple.',
        name: 'Sophea C.',
    },
    {
        quote: 'Visual search helped me find the exact product shape I had in mind without endless scrolling.',
        name: 'Vanna K.',
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const avatarStyles = [
    'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
];

export function TestimonialsSection({
    eyebrow,
    title,
    description,
    reviewerLabel,
    ratingLabel,
}: {
    eyebrow: string;
    title: string;
    description: string;
    reviewerLabel: string;
    ratingLabel: string;
}) {
    return (
        <section className="reveal-section relative overflow-hidden py-16 sm:py-20 lg:py-24" aria-labelledby="testimonials-heading">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_42%)]" />
            <div className="container relative mx-auto px-4">
                <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        {eyebrow}
                    </div>
                    <h2 id="testimonials-heading" className="text-balance text-3xl font-bold tracking-tight lg:text-4xl">
                        {title}
                    </h2>
                    <p className="text-pretty text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
                        {description}
                    </p>
                </div>

                <div className="mx-auto mt-10 flex h-[40rem] max-w-5xl justify-center gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] sm:gap-6">
                    <InfiniteSlider className="w-full max-w-xs" direction="vertical" speed={30} speedOnHover={45}>
                        {firstColumn.map((testimonial, index) => (
                            <TestimonialsCard key={testimonial.name} testimonial={testimonial} reviewerLabel={reviewerLabel} ratingLabel={ratingLabel} avatarStyle={avatarStyles[index]} />
                        ))}
                    </InfiniteSlider>
                    <InfiniteSlider className="hidden w-full max-w-xs md:block" direction="vertical" speed={42} speedOnHover={55}>
                        {secondColumn.map((testimonial, index) => (
                            <TestimonialsCard key={testimonial.name} testimonial={testimonial} reviewerLabel={reviewerLabel} ratingLabel={ratingLabel} avatarStyle={avatarStyles[index]} />
                        ))}
                    </InfiniteSlider>
                    <InfiniteSlider className="hidden w-full max-w-xs lg:block" direction="vertical" speed={35} speedOnHover={50}>
                        {thirdColumn.map((testimonial, index) => (
                            <TestimonialsCard key={testimonial.name} testimonial={testimonial} reviewerLabel={reviewerLabel} ratingLabel={ratingLabel} avatarStyle={avatarStyles[index]} />
                        ))}
                    </InfiniteSlider>
                </div>
            </div>
        </section>
    );
}

function TestimonialsCard({
    testimonial,
    reviewerLabel,
    ratingLabel,
    avatarStyle,
    className,
    ...props
}: React.ComponentProps<'figure'> & {
    testimonial: Testimonial;
    reviewerLabel: string;
    ratingLabel: string;
    avatarStyle?: string;
}) {
    return (
        <figure
            className={cn(
                'w-full rounded-3xl border border-border/80 bg-card/90 p-7 shadow-lg shadow-foreground/5 backdrop-blur-sm sm:p-8',
                className,
            )}
            {...props}
        >
            <div className="text-sm tracking-[0.12em] text-primary" aria-label={ratingLabel}>★★★★★</div>
            <blockquote className="mt-4 leading-relaxed text-card-foreground">“{testimonial.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
                <Avatar className="size-10">
                    <AvatarFallback className={cn('font-bold', avatarStyle)}>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                    <cite className="truncate font-bold not-italic leading-5 tracking-tight">{testimonial.name}</cite>
                    <span className="text-sm leading-5 tracking-tight text-muted-foreground">{reviewerLabel}</span>
                </div>
            </figcaption>
        </figure>
    );
}

export default TestimonialsSection;
