import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';

/**
 * Exits non-zero on failure rather than logging and falling off the end of the process.
 *
 * A rejected promise here used to be caught, printed, and then simply not followed by
 * bootstrap() — so the process ended with status 0 having never listened on a port. To a
 * hosting platform that is indistinguishable from a healthy start that answers nothing,
 * which it reports as an unavailable service and retries indefinitely. The most common
 * cause is the visual-search migration's `CREATE EXTENSION vector` failing on a Postgres
 * without pgvector, and it deserves to look like the crash it is.
 */
runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        // eslint-disable-next-line no-console
        console.error('[startup] failed before the server could listen:', err);
        process.exit(1);
    });
