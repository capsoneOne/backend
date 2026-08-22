import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    LanguageCode,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { json } from 'express';
import { AssetServerPlugin, configureS3AssetStorage } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { StripePlugin } from '@vendure-community/stripe-plugin';
import 'dotenv/config';
import path from 'path';

import { VisualSearchPlugin } from './plugins/visual-search/visual-search.plugin';
import { ChatAssistantPlugin } from './plugins/chat-assistant/chat-assistant.plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
// PORT wins because hosting platforms inject it into the environment at runtime, and that
// must take precedence over any value baked into the .env file at scaffold time.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;

// Where transactional email links point. The storefront runs on 3001 and prefixes
// every route with a locale, so both parts matter — a link missing /<locale> 404s.
const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://localhost:3001';
const DEFAULT_LOCALE = process.env.STOREFRONT_DEFAULT_LOCALE ?? 'en';

/**
 * Object storage for product images.
 *
 * Enabled by the presence of the R2 vars, not by APP_ENV. That way a deploy without
 * credentials falls back to local disk loudly at boot instead of writing every upload
 * to a container filesystem that disappears on restart — and a developer can point at
 * a real bucket locally to reproduce a storage bug without faking the environment.
 *
 * R2 is S3-compatible, so Vendure's built-in strategy works unchanged. Two details are
 * R2-specific: region must be the literal 'auto', and path-style addressing is required
 * because R2 does not support virtual-hosted-style bucket subdomains.
 */
const R2_ENABLED = Boolean(
    process.env.R2_ACCOUNT_ID &&
        process.env.R2_BUCKET &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY,
);

if (!R2_ENABLED && !IS_DEV) {
    // eslint-disable-next-line no-console
    console.warn(
        '[assets] R2 is not configured — falling back to local disk. On a container host ' +
            'every uploaded image will be lost on the next restart.',
    );
}

function positiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // Visual search sends the query image inline as base64, so a Shop API request
        // is roughly 1.37x the photo's size. The default JSON body limit rejects
        // anything much over a phone thumbnail, and it fails as an opaque 500 rather
        // than a 413 — no message, nothing in the response to act on.
        //
        // This is the third of three ceilings the same upload has to clear; the other
        // two are the browser check in features/visual-search/limits.ts and
        // experimental.serverActions.bodySizeLimit in the storefront's next.config.ts.
        // Keep this the most generous of the three so the browser always rejects first,
        // with a message we control.
        middleware: [
            {
                handler: json({limit: '12mb'}),
                route: '/shop-api',
                beforeListen: true,
            },
        ],
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
        requireVerification:false
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    importExportOptions: {
        // Where `importProducts` resolves the CSV's asset paths from. The default is a
        // directory inside node_modules, so without this every bulk import silently
        // creates products with no images.
        //
        // The paths in static/a/catalog-import.csv are <category>/<file> relative to
        // here, because the same filenames repeat across the category folders.
        importAssetsDir: path.join(__dirname, '../static/a/dataset_clean'),
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Customer: [
            {
                name: 'avatarKey',
                type: 'string',
                length: 32,
                nullable: true,
                public: true,
                description: [{languageCode: LanguageCode.en, value: 'Selected curated storefront avatar'}],
            },
        ],
    },
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            // Still required even on R2: this is the temp/working dir, and the local
            // fallback path uses it when R2 vars are absent.
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // Serve straight from the bucket's public URL rather than proxying every
            // image through Vendure. Trailing slash matters — Vendure concatenates.
            assetUrlPrefix: R2_ENABLED
                ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/`
                : undefined,
            ...(R2_ENABLED
                ? {
                      storageStrategyFactory: configureS3AssetStorage({
                          bucket: process.env.R2_BUCKET,
                          credentials: {
                              accessKeyId: process.env.R2_ACCESS_KEY_ID,
                              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                          },
                          nativeS3Configuration: {
                              endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                              region: 'auto',
                              forcePathStyle: true,
                          },
                      }),
                  }
                : {}),
        }),
        DefaultSchedulerPlugin.init(),
        // concurrency defaults to 1, which serialises every background job. A full
        // visual-search reindex is thousands of jobs whose cost is dominated by pulling
        // each source image from object storage — I/O, not CPU — so running a few in
        // flight overlaps those fetches. Kept modest on purpose: the embedder is a
        // single worker process and will serialise the inference regardless, so a high
        // value buys nothing and just queues requests against it.
        DefaultJobQueuePlugin.init({
            useDatabaseForBuffer: true,
            concurrency: positiveInt(process.env.JOB_QUEUE_CONCURRENCY, 4),
        }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        StripePlugin.init({
            // Stripe payment methods are configured per channel in Vendure. Keeping
            // customer creation disabled avoids adding a schema-level custom field;
            // the PaymentIntent still carries the Vendure order/channel metadata.
            storeCustomersInStripe: false,
            skipPaymentIntentsWithoutExpectedMetadata: true,
        }),
        VisualSearchPlugin.init({
            embedderUrl: process.env.EMBEDDER_URL ?? 'http://localhost:8100',
            // Applies to a single-item request: the user-facing query path, which the
            // contract budgets at p95 < 800 ms, so this is a backstop and not a target.
            // Indexing batches scale from it — see EmbedderService.timeoutFor().
            timeoutMs: positiveInt(process.env.EMBEDDER_TIMEOUT_MS, 30_000),
            perItemTimeoutMs: positiveInt(process.env.EMBEDDER_PER_ITEM_TIMEOUT_MS, 2_000),
            // Object storage can go quiet without failing. Four hung reads fill the job
            // queue's concurrency and stop a reindex dead, with no error to show for it.
            assetReadTimeoutMs: positiveInt(process.env.ASSET_READ_TIMEOUT_MS, 15_000),
        }),
        ChatAssistantPlugin.init({
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-5.6-luna',
            maxHistoryMessages: positiveInt(process.env.CHAT_MAX_HISTORY_MESSAGES, 8),
            maxOutputTokens: positiveInt(process.env.CHAT_MAX_OUTPUT_TOKENS, 450),
            anonymousRequestsPerMinute: positiveInt(process.env.CHAT_ANONYMOUS_REQUESTS_PER_MINUTE, 5),
            anonymousRequestsPerDay: positiveInt(process.env.CHAT_ANONYMOUS_REQUESTS_PER_DAY, 30),
            authenticatedRequestsPerMinute: positiveInt(process.env.CHAT_USER_REQUESTS_PER_MINUTE, 10),
            authenticatedRequestsPerDay: positiveInt(process.env.CHAT_USER_REQUESTS_PER_DAY, 100),
            globalRequestsPerDay: positiveInt(process.env.CHAT_GLOBAL_REQUESTS_PER_DAY, 5000),
            globalInputTokensPerDay: positiveInt(process.env.CHAT_GLOBAL_INPUT_TOKENS_PER_DAY, 2_000_000),
            globalOutputTokensPerDay: positiveInt(process.env.CHAT_GLOBAL_OUTPUT_TOKENS_PER_DAY, 250_000),
            maxConcurrentRequests: positiveInt(process.env.CHAT_MAX_CONCURRENT_REQUESTS, 10),
            leaseTtlSeconds: positiveInt(process.env.CHAT_LEASE_TTL_SECONDS, 45),
        }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // These must match the actual storefront: it runs on 3001 (not the
                // scaffold's 8080) and its routes are locale-prefixed, so a link
                // without /<locale> 404s. STOREFRONT_URL overrides for deploys.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: `${STOREFRONT_URL}/${DEFAULT_LOCALE}/verify`,
                passwordResetUrl: `${STOREFRONT_URL}/${DEFAULT_LOCALE}/reset-password`,
                changeEmailAddressUrl: `${STOREFRONT_URL}/${DEFAULT_LOCALE}/account/verify-email`,
            },
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
    ],
};
