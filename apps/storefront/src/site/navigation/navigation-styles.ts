/** Shared interaction language for every control in the fixed storefront navbar. */
export const navbarInteractiveClass = [
    'transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out',
    'hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-sm',
    'active:translate-y-0 active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
].join(' ');

export const navbarIconClass = [
    navbarInteractiveClass,
    'relative inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground',
].join(' ');

export const navbarPrimaryClass = [
    navbarInteractiveClass,
    'inline-flex h-9 items-center rounded-lg px-4 py-2 text-sm font-medium',
].join(' ');

export const navbarActiveClass = 'bg-primary/10 text-primary shadow-sm';
