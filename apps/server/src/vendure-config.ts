import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { json } from 'express';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';

import { VisualSearchPlugin } from './plugins/visual-search/visual-search.plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
// PORT wins because hosting platforms inject it into the environment at runtime, and that
// must take precedence over any value baked into the .env file at scaffold time.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;

// Where transactional email links point. The storefront runs on 3001 and prefixes
// every route with a locale, so both parts matter — a link missing /<locale> 404s.
const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://localhost:3001';
const DEFAULT_LOCALE = process.env.STOREFRONT_DEFAULT_LOCALE ?? 'en';

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
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {},
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        VisualSearchPlugin.init({
            embedderUrl: process.env.EMBEDDER_URL ?? 'http://localhost:8100',
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
