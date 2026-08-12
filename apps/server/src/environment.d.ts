export {};

// Here we declare the members of the process.env object, so that we
// can use them in our application code in a type-safe manner.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ENV: string;
            VENDURE_SERVER_PORT: string;
            PORT: string;
            COOKIE_SECRET: string;
            SUPERADMIN_USERNAME: string;
            SUPERADMIN_PASSWORD: string;
            DB_HOST: string;
            DB_PORT: number;
            DB_NAME: string;
            DB_USERNAME: string;
            DB_PASSWORD: string;
            DB_SCHEMA: string;
            EMBEDDER_URL: string;
            STOREFRONT_URL: string;
            STOREFRONT_DEFAULT_LOCALE: string;
            // Cloudflare R2. Present in production only; dev uses local disk.
            R2_ACCOUNT_ID: string;
            R2_BUCKET: string;
            R2_ACCESS_KEY_ID: string;
            R2_SECRET_ACCESS_KEY: string;
            /** Public base URL of the bucket, e.g. https://assets.example.com */
            R2_PUBLIC_URL: string;
        }
    }
}

