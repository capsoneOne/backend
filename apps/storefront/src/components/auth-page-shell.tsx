import type {ReactNode} from 'react';

/** Shared centred canvas for sign-in, registration, recovery, and verification. */
export function AuthPageShell({children}: {children: ReactNode}) {
    return (
        <div className="mt-[4.5rem] flex min-h-[calc(100vh-4.5rem)] items-center justify-center border-b border-border bg-secondary/20 px-4 py-12 md:py-20">
            <div className="w-full max-w-lg">{children}</div>
        </div>
    );
}
