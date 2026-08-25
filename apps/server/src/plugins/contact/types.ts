export interface ContactPluginOptions {
    /**
     * Submissions allowed from one sender per hour. A public form is reachable by
     * bots the moment it is indexed, and the page itself promises replies in days —
     * so a low ceiling costs a genuine sender nothing.
     */
    maxSubmissionsPerHour: number;
    /**
     * Ceiling across all senders per hour. The per-sender limit keys on a client
     * address the storefront forwards, which anyone calling the Shop API directly
     * could forge; this bound is the one that still holds when they do.
     */
    maxGlobalSubmissionsPerHour: number;
    /**
     * Salt for the sender hash. Without it the stored hashes are a rainbow table
     * away from being plain IP addresses, since the IPv4 space is small enough to
     * enumerate.
     */
    hashSalt: string;
}
