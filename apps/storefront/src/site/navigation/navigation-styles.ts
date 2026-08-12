/** Shared interaction language for every control in the fixed storefront navbar. */
export const navbarInteractiveClass = [
    'navbar-interactive group/nav-control transition-[color,background-color,border-color,box-shadow,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
    'hover:bg-primary/10 hover:text-primary hover:shadow-sm',
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
