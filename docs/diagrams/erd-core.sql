-- visual-search-capstone — core ERD for drawSQL
--
-- Trimmed from the 96 tables Vendure actually creates, down to the 21 that carry the
-- story. Two deliberate denormalizations, both noted inline:
--   1. every *_translation table is folded into its parent (single-language assumption)
--   2. product_variant_price is folded into product_variant
-- Channel-scoping join tables, auth/session/job/promotion/shipping internals, and
-- created/updated timestamps are omitted. deletedAt is kept where soft-delete changes
-- how the table must be queried.

-- Declared first because product_variant references it.
CREATE TABLE tax_category (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    "isDefault" BOOLEAN NOT NULL
);

-- ===================== CATALOG =====================

CREATE TABLE product (
    id                BIGSERIAL PRIMARY KEY,
    "deletedAt"       TIMESTAMP,
    enabled           BOOLEAN NOT NULL,
    "featuredAssetId" INTEGER,
    -- folded from product_translation
    "languageCode"    VARCHAR(16) NOT NULL,
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL,
    description       TEXT NOT NULL
);

CREATE TABLE product_variant (
    id                BIGSERIAL PRIMARY KEY,
    "productId"       INTEGER NOT NULL REFERENCES product (id),
    "deletedAt"       TIMESTAMP,
    enabled           BOOLEAN NOT NULL,
    sku               VARCHAR(255) NOT NULL,
    "trackInventory"  VARCHAR(16) NOT NULL,
    "featuredAssetId" INTEGER,
    "taxCategoryId"   INTEGER REFERENCES tax_category (id),
    -- folded from product_variant_translation
    name              VARCHAR(255) NOT NULL,
    -- folded from product_variant_price
    price             INTEGER NOT NULL,
    "currencyCode"    VARCHAR(8) NOT NULL
);

CREATE TABLE product_option_group (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(255) NOT NULL,
    "deletedAt" TIMESTAMP,
    name        VARCHAR(255) NOT NULL
);

CREATE TABLE product_option (
    id          BIGSERIAL PRIMARY KEY,
    "groupId"   INTEGER NOT NULL REFERENCES product_option_group (id),
    code        VARCHAR(255) NOT NULL,
    "deletedAt" TIMESTAMP,
    name        VARCHAR(255) NOT NULL
);

-- Which option values a variant is. Size=M + Colour=Black -> two rows.
CREATE TABLE product_variant_option (
    "productVariantId" INTEGER NOT NULL REFERENCES product_variant (id),
    "productOptionId"  INTEGER NOT NULL REFERENCES product_option (id),
    PRIMARY KEY ("productVariantId", "productOptionId")
);

-- ===================== ASSETS =====================

CREATE TABLE asset (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(32) NOT NULL,
    "mimeType"  VARCHAR(64) NOT NULL,
    width       INTEGER NOT NULL,
    height      INTEGER NOT NULL,
    "fileSize"  INTEGER NOT NULL,
    source      VARCHAR(255) NOT NULL,
    preview     VARCHAR(255) NOT NULL
);

CREATE TABLE product_asset (
    id          BIGSERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL REFERENCES product (id),
    "assetId"   INTEGER NOT NULL REFERENCES asset (id),
    position    INTEGER NOT NULL
);

CREATE TABLE product_variant_asset (
    id                 BIGSERIAL PRIMARY KEY,
    "productVariantId" INTEGER NOT NULL REFERENCES product_variant (id),
    "assetId"          INTEGER NOT NULL REFERENCES asset (id),
    position           INTEGER NOT NULL
);

-- ===================== VISUAL SEARCH =====================

-- The capstone's own table. One row per (product, asset) per model revision.
-- `revision` is stamped on write and filtered on read, so vectors from two different
-- models can never be compared against each other.
CREATE TABLE product_asset_embedding (
    id          BIGSERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL REFERENCES product (id),
    "assetId"   INTEGER NOT NULL REFERENCES asset (id),
    embedding   vector(512) NOT NULL,
    revision    VARCHAR(255) NOT NULL,
    "modelId"   VARCHAR(255) NOT NULL,
    UNIQUE ("productId", "assetId")
);

-- ===================== TAXONOMY =====================

CREATE TABLE facet (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(255) NOT NULL,
    "isPrivate" BOOLEAN NOT NULL,
    name        VARCHAR(255) NOT NULL
);

CREATE TABLE facet_value (
    id        BIGSERIAL PRIMARY KEY,
    "facetId" INTEGER NOT NULL REFERENCES facet (id),
    code      VARCHAR(255) NOT NULL,
    name      VARCHAR(255) NOT NULL
);

CREATE TABLE product_facet_value (
    "productId"    INTEGER NOT NULL REFERENCES product (id),
    "facetValueId" INTEGER NOT NULL REFERENCES facet_value (id),
    PRIMARY KEY ("productId", "facetValueId")
);

CREATE TABLE collection (
    id                BIGSERIAL PRIMARY KEY,
    "parentId"        INTEGER REFERENCES collection (id),
    "featuredAssetId" INTEGER REFERENCES asset (id),
    "isPrivate"       BOOLEAN NOT NULL,
    position          INTEGER NOT NULL,
    filters           TEXT NOT NULL,
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL
);

CREATE TABLE collection_product_variant (
    "collectionId"     INTEGER NOT NULL REFERENCES collection (id),
    "productVariantId" INTEGER NOT NULL REFERENCES product_variant (id),
    PRIMARY KEY ("collectionId", "productVariantId")
);

-- ===================== INVENTORY & TAX =====================

CREATE TABLE stock_location (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE stock_level (
    id                 BIGSERIAL PRIMARY KEY,
    "productVariantId" INTEGER NOT NULL REFERENCES product_variant (id),
    "stockLocationId"  INTEGER NOT NULL REFERENCES stock_location (id),
    "stockOnHand"      INTEGER NOT NULL,
    "stockAllocated"   INTEGER NOT NULL
);

-- ===================== CUSTOMERS & ORDERS =====================

CREATE TABLE customer (
    id             BIGSERIAL PRIMARY KEY,
    "deletedAt"    TIMESTAMP,
    "firstName"    VARCHAR(255) NOT NULL,
    "lastName"     VARCHAR(255) NOT NULL,
    "emailAddress" VARCHAR(255) NOT NULL,
    "phoneNumber"  VARCHAR(255)
);

CREATE TABLE address (
    id                       BIGSERIAL PRIMARY KEY,
    "customerId"             INTEGER NOT NULL REFERENCES customer (id),
    "fullName"               VARCHAR(255),
    "streetLine1"            VARCHAR(255) NOT NULL,
    "streetLine2"            VARCHAR(255),
    city                     VARCHAR(255),
    province                 VARCHAR(255),
    "postalCode"             VARCHAR(255),
    "phoneNumber"            VARCHAR(255),
    "defaultShippingAddress" BOOLEAN,
    "defaultBillingAddress"  BOOLEAN
);

CREATE TABLE "order" (
    id                BIGSERIAL PRIMARY KEY,
    "customerId"      INTEGER REFERENCES customer (id),
    code              VARCHAR(255) NOT NULL,
    state             VARCHAR(64) NOT NULL,
    active            BOOLEAN NOT NULL,
    "orderPlacedAt"   TIMESTAMP,
    "currencyCode"    VARCHAR(8) NOT NULL,
    "subTotal"        INTEGER NOT NULL,
    "subTotalWithTax" INTEGER NOT NULL,
    shipping          INTEGER NOT NULL,
    "shippingWithTax" INTEGER NOT NULL,
    -- Vendure snapshots these as JSON so a later address edit cannot rewrite history
    "shippingAddress" TEXT NOT NULL,
    "billingAddress"  TEXT NOT NULL
);

CREATE TABLE order_line (
    id                 BIGSERIAL PRIMARY KEY,
    "orderId"          INTEGER NOT NULL REFERENCES "order" (id),
    "productVariantId" INTEGER NOT NULL REFERENCES product_variant (id),
    "taxCategoryId"    INTEGER REFERENCES tax_category (id),
    "featuredAssetId"  INTEGER REFERENCES asset (id),
    quantity           INTEGER NOT NULL,
    "listPrice"        INTEGER NOT NULL,
    "taxLines"         TEXT NOT NULL
);

CREATE TABLE payment (
    id              BIGSERIAL PRIMARY KEY,
    "orderId"       INTEGER NOT NULL REFERENCES "order" (id),
    method          VARCHAR(255) NOT NULL,
    state           VARCHAR(64) NOT NULL,
    amount          INTEGER NOT NULL,
    "transactionId" VARCHAR(255),
    "errorMessage"  VARCHAR(255)
);
