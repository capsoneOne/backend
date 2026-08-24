# Diagram descriptions

Report-ready text for the diagrams in this folder. Each entry gives a short figure
caption and a longer description.

Source files:

- `system-architecture.drawio`
- `sequence-end-to-end.drawio`
- `erd-core.drawio` (generated from `erd-core.sql`)
- `use-case.drawio`
- `activity-visual-search.drawio`
- `activity-indexing.drawio`

---

## Figure 1. System architecture

**Caption**

> System architecture of the visual search platform, showing the eight runtime components,
> the three hosting platforms they are deployed to, and the paths taken by indexing and
> query traffic.

**Description**

The system is divided across three hosting platforms according to what each component
needs. Railway runs the stateful core: the Vendure server, which exposes the Shop and
Admin GraphQL APIs, the Vendure worker, which processes background jobs, and a
PostgreSQL database with the pgvector extension. Hugging Face Spaces runs the embedding
service, a FastAPI application wrapping an `open_clip` ViT-B/32 model, together with the
model weights it downloads on first start. Cloudflare R2 provides object storage for
product images. The storefront is a Next.js application, and the shopper reaches the
system through it.

The split follows from resource requirements rather than convenience. The embedding
service holds roughly one gigabyte of model weights resident in memory, which does not
fit the smaller Railway service tiers, whereas the Vendure server and worker together use
under 150 MB. Placing the model on a platform with a larger free memory allowance keeps
the remaining services small and inexpensive to host.

Two aspects of the diagram are worth drawing attention to. First, the Vendure server and
worker never communicate directly. The job queue is implemented as rows in PostgreSQL, so
the server enqueues work by writing to the database and the worker discovers it by
polling. This makes the queue durable across restarts and removes any need for a message
broker. Second, the storefront loads product images directly from R2 rather than
proxying them through Vendure. The asset URL prefix is configured to point at the bucket's
public endpoint, which removes image traffic from the application server entirely.

Edge colour distinguishes the two workloads that share this infrastructure. The indexing
path, shown in teal, moves image data from storage through the model and into the
database. The query path, shown in rust, moves a single uploaded image through the same
model and then performs a similarity search. Both converge on the embedding service, which
is the only component in the system that loads a model.

---

## Figure 2. End to end sequence

**Caption**

> Sequence diagram covering both system workloads: the indexing process that populates the
> vector index (steps 1 to 10) and the user-initiated visual search that queries it
> (steps 11 to 19).

**Description**

The diagram traces nineteen messages across seven participants, divided into two phases
that together account for every interaction in the visual search feature.

Phase A begins when an administrator triggers a reindex. Before any work is queued, the
server forces a refresh of the embedding service's health endpoint in order to read the
model revision currently in use. The server then writes job records to PostgreSQL in
batches of thirty-two products. The worker polls for these jobs with a concurrency of
four, retrieves the original image bytes from R2, and posts a batch to the embedding
service. Inside that service, each image is preprocessed, passed through the ViT-B/32
vision transformer, and L2 normalised before the resulting 512-dimensional vectors are
returned. The worker then replaces the existing rows for those products, writing each
vector together with the revision and model identifier that produced it.

Phase B begins with a shopper uploading a photograph. The storefront forwards it to the
Shop API as a base64-encoded string, the server sends that single image to the embedding
service, and the returned vector is used as the query point for a cosine similarity search
in PostgreSQL. That query is restricted to the current revision and served by an HNSW
index. The server returns the matched products together with the revision that produced
the ranking, and the storefront loads the corresponding images directly from R2.

The diagram makes two design decisions visible that are difficult to convey in prose.
The first is the revision mechanism. Step 2 establishes which model is about to run,
step 10 stamps that identity onto every stored vector, and step 15 filters on it at query
time. Because a vector produced by one model is a coordinate in a different space from a
vector produced by another, comparing across them yields results that are numerically
valid and semantically meaningless. Filtering by revision means that an incomplete or
outdated index reduces recall rather than corrupting precision.

The second is the difference in batch size between the two phases. Step 7 carries
thirty-two images in a single request, while step 13 carries one. Measured on the
deployed model, batching reduces the cost per image from 71.8 ms to 20.4 ms, a factor of
roughly 3.5. This matters a great deal when indexing several thousand products and not at
all for an individual user query, which by definition contains a single image.

---

## Figure 3. Entity relationship diagram

**Caption**

> Core entity relationship diagram of the backend database: 22 tables and 27 foreign key
> relationships, reduced from the 96 tables present in the full schema.

**Description**

The production schema contains 96 tables, the majority of which relate to features the
project does not exercise, such as multi-channel selling, promotions, fulfilment and
administrative access control. The diagram therefore presents a reduced schema that keeps
the catalogue, the vector index and the ordering path, which together carry the behaviour
described in this report.

Two deliberate simplifications were applied. First, translation tables were folded into
their parent entities. The underlying framework stores every translatable field in a
separate table, so a product is represented by both a `product` row and a
`product_translation` row. Since the deployment is single-language, merging them removes
seven tables and seven relationships that would otherwise add no information to the
diagram. Second, variant pricing was folded into the variant itself. Timestamp columns
were omitted throughout, although soft-delete columns were retained wherever they change
how a table must be queried.

The tables are grouped by domain and colour coded accordingly: the product catalogue, the
option and variant structure, assets, the taxonomy of facets and collections, inventory
and tax, and the customer ordering path. Each product carries multiple variants, and each
variant is defined by its combination of option values, recorded through the
`product_variant_option` junction table. In the imported dataset every product has two
size options and two colour options, producing four variants per product.

The table of principal interest is `product_asset_embedding`, which is the component this
project contributes to the schema. It holds one row per product and asset pair, storing a
`vector(512)` column alongside the revision and model identifier that produced it. The
unique constraint on the product and asset pair guarantees that a given image is
represented exactly once, and the foreign keys cascade on delete so that removing a
product or an asset cannot leave an orphaned vector behind. A HNSW index on the vector
column supports approximate nearest neighbour search, which is what makes similarity
queries tractable at catalogue scale.

---

## Figure 4. Use case diagram

**Caption**

> Use case diagram for the platform, showing three primary actors, three supporting
> systems, and eighteen use cases divided between the storefront and the administration
> interface.

**Description**

The diagram establishes the scope of the system by separating what the platform does
from who or what it does it for. Inside the boundary sit the eighteen use cases the
implementation actually supports; these were derived from the deployed storefront routes
and the published GraphQL API rather than from an aspirational feature list. Outside the
boundary, primary actors appear on the left and supporting systems on the right,
following the usual convention that an actor which initiates behaviour is drawn on the
initiating side and one which the system calls out to is drawn opposite.

Three primary actors are identified. The Shopper covers everything an unauthenticated
visitor can do: browsing the catalogue, searching by keyword, searching by image,
consulting the shopping assistant, viewing products, managing a cart and completing
checkout. The Registered Customer is drawn as a generalisation of the Shopper, indicated
by the hollow triangle, which means it inherits all of those associations and adds only
account management and order history. Modelling it this way avoids duplicating eight
associations and states the access rule precisely: registration adds capability rather
than replacing it. The Store Administrator operates the catalogue, covering bulk import,
product management, rebuilding the visual search index and monitoring index health.

Three supporting actors record the points at which the platform depends on services it
does not own. The Embedding Service converts images into vectors, the Payment Provider
authorises transactions, and the Chat Model Provider generates assistant responses. Each
is a system rather than a person, and each represents a boundary where availability and
cost are outside the project's control.

The four use cases shown in red isolate the contribution this project makes to what would
otherwise be a conventional e-commerce platform. Two relationships among them carry the
most information. Searching by image and viewing similar products both include the same
Embed uploaded image case, which shows that two distinct entry points share one piece of
behaviour and that both therefore depend on the same external service. Viewing similar
products extends viewing product details rather than including it, because it is optional
behaviour layered onto the product page rather than a step the base case always performs.
On the administration side, rebuilding the visual search index includes embedding the
catalogue images, which is the batch counterpart of the same operation the query path
performs one image at a time.

---

## Figure 5. Visual search activity

**Caption**

> Activity diagram of the shopper-initiated visual search, showing the validation
> branches, the optional crop step, and the terminal states the flow can reach.

**Description**

Where Figure 2 traces the messages exchanged between components, this diagram traces the
decisions the flow makes. The path from a chosen photograph to a ranked result set passes
four decision points, and three of them can end the interaction without any results being
shown.

Validation happens before anything is transmitted. The file type and the six-megabyte size
limit are both checked in the browser, and a failure at either point returns the shopper to
the selection step rather than terminating the flow, which is the same recovery applied when
the embedding service is unreachable. The crop step is optional and sits between preview and
upload, because cropping alters the bytes that are embedded rather than filtering the results
afterwards; the embedding covers the whole frame, so a photograph with a busy background is
partly a query for that background.

Two loops appear after results are returned. Refining by sort order, minimum match, or
maximum price operates on the returned set without re-querying the database, and where a
filter combination leaves nothing visible the shopper is returned to the unfiltered results
rather than to an empty screen. The flow terminates in one of three states: a product page
opened from a match, a no-results state offering the catalogue as an alternative, or an error
state offering another attempt.

---

## Figure 6. Indexing activity

**Caption**

> Activity diagram of the indexing pipeline that populates the vector index, showing the
> dimension guard, the batch loop, per-item failure handling, and job retry.

**Description**

This diagram covers the same workload as phase A of Figure 2, but shows what a sequence
diagram cannot: the loops and the failure paths. Indexing begins either from a product event
or from an administrator-triggered reindex, and both routes converge on the same first step,
reading the embedding service's health endpoint to establish which model is about to run.

The dimension guard is the first decision and the only one that aborts outright. If the
service reports a vector width other than the one the database column was created with, no
work is queued at all, because vectors of the wrong width cannot be stored and a partially
written index would be worse than none.

Beyond that point, every failure is designed to degrade rather than stop. A product with no
assets is skipped rather than treated as an error. An image that the model cannot process is
recorded and the remaining items in its batch of thirty-two still complete, so one unreadable
photograph cannot cost the other thirty-one. A job that fails as a whole is retried twice
before being abandoned. The write itself deletes the product's existing rows before inserting
the new ones, which makes re-indexing idempotent and also removes vectors for assets that have
been detached from the product since the previous run. Each inserted row carries the revision
and model identifier established at the start, which is what allows a query to exclude
everything an earlier model produced.
