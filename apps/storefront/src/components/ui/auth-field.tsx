import {cloneElement, isValidElement, type ReactElement, type ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';

import {cn} from '@/lib/utils';

interface AuthFieldProps {
    /** Leading affordance for the control. Decorative — the label still names the field. */
    icon: LucideIcon;
    className?: string;
    children: ReactNode;
}

/**
 * Wraps a single auth control with its leading icon and focus underline.
 *
 * `FormControl` clones its one child to inject `id`, `aria-invalid`, and
 * `aria-describedby`. Putting a wrapper in between would capture those on a div
 * — silently detaching the label from the input and dropping error announcement
 * — so everything except our own props is forwarded down to the real control.
 * That also makes `aria-invalid` the single source of truth for the error state,
 * rather than a second `invalid` prop that could drift out of sync with it.
 *
 * Controls rendered here need `pl-10`: the icon sits inside the input's padding.
 */
export function AuthField({icon: Icon, className, children, ...controlProps}: AuthFieldProps) {
    const ariaInvalid = (controlProps as Record<string, unknown>)['aria-invalid'];
    const invalid = ariaInvalid === true || ariaInvalid === 'true';

    return (
        <div
            data-invalid={invalid ? 'true' : undefined}
            className={cn('auth-field relative', className)}
        >
            <Icon
                aria-hidden
                className="auth-field-icon pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            />
            {isValidElement(children)
                ? cloneElement(children as ReactElement<Record<string, unknown>>, controlProps)
                : children}
            <span
                aria-hidden
                className="auth-field-underline pointer-events-none absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
            />
        </div>
    );
}
