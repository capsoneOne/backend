import type {ReactNode} from 'react';

interface AuthPageShellProps {
    children: ReactNode;
    /**
     * Optional narrative panel shown beside the form on large screens. Sign-in and
     * registration pass one; recovery and verification stay single-column, where a
     * centred card is the right shape for a one-field task.
     */
    aside?: ReactNode;
}

/** Shared canvas for sign-in, registration, recovery, and verification. */
export function AuthPageShell({children, aside}: AuthPageShellProps) {
    if (!aside) {
        return (
            <div className="mt-[4.5rem] flex min-h-[calc(100vh-4.5rem)] items-center justify-center border-b border-border bg-secondary/20 px-4 py-10 md:py-14">
                <div className="w-full max-w-lg">{children}</div>
            </div>
        );
    }

    return (
        <div className="mt-[4.5rem] flex min-h-[calc(100vh-4.5rem)] items-center justify-center border-b border-border bg-secondary/20 px-4 py-10 md:py-14">
            {/* The form column is capped so it keeps its comfortable measure instead of
                stretching to half of a wide viewport.

                `items-stretch` keeps the two columns level: whichever side is naturally
                taller sets the row height and the other fills it. The form is centred
                within its column so a short form (sign-in, two fields) sits balanced
                against the artwork instead of hanging from the top, while a tall one
                (register, six fields) simply drives the height itself. Neither side
                carries a hardcoded height, and the artwork never shrinks to fit. */}
            <div className="grid w-full max-w-5xl items-stretch gap-8 lg:grid-cols-[1fr_minmax(0,26rem)]">
                {aside}
                <div className="mx-auto flex w-full max-w-lg flex-col justify-center">{children}</div>
            </div>
        </div>
    );
}
