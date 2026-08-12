# RAG chat assistant

The StyleMatch assistant is implemented as a server-owned RAG flow:

1. The browser sends the current message and the last eight display messages to
   `POST /api/chat-assistant` on the Next.js storefront.
2. The route forwards the Vendure channel, language, and authenticated session to
   the Shop GraphQL API. The OpenAI key is never exposed to the browser.
3. `ChatAssistantPlugin` retrieves current products from Vendure's search index,
   relevant store-policy passages, and the signed-in customer's active cart and
   five most recent orders.
4. Vendure sends only that context to the OpenAI Responses API and returns the
   grounded answer, product links, and source links to the storefront.

The visual-search embedder is deliberately not reused. Its current deterministic
stub satisfies the frozen image-embedding contract but has no semantic meaning, so
it is not suitable for text RAG.

## Configuration

Add these values to `apps/server/.env`:

```dotenv
OPENAI_API_KEY=your-server-side-api-key
# Optional. Defaults to the cost-sensitive chat model used by the plugin.
OPENAI_CHAT_MODEL=gpt-5.6-luna

# Optional cost and abuse controls (these are the defaults)
CHAT_MAX_OUTPUT_TOKENS=450
CHAT_ANONYMOUS_REQUESTS_PER_MINUTE=5
CHAT_ANONYMOUS_REQUESTS_PER_DAY=30
CHAT_USER_REQUESTS_PER_MINUTE=10
CHAT_USER_REQUESTS_PER_DAY=100
CHAT_GLOBAL_REQUESTS_PER_DAY=5000
CHAT_GLOBAL_INPUT_TOKENS_PER_DAY=2000000
CHAT_GLOBAL_OUTPUT_TOKENS_PER_DAY=250000
CHAT_MAX_CONCURRENT_REQUESTS=10
CHAT_LEASE_TTL_SECONDS=45
```

The storefront continues to use its existing server-only `VENDURE_SHOP_API_URL`
and `VENDURE_CHANNEL_TOKEN` values. No public OpenAI environment variable is
required or supported.

## API

The Vendure Shop API exposes this mutation:

```graphql
mutation AskChatAssistant(
  $message: String!
  $history: [ChatAssistantHistoryInput!]
  $clientId: String
) {
  askChatAssistant(message: $message, history: $history, clientId: $clientId) {
    answer
    products { productId name slug priceWithTax currencyCode inStock }
    sources { label path kind }
  }
}
```

Messages are limited to 500 characters, conversation replay is capped, and
generation is stateless (`store: false`). Signed-in customers are keyed by a hash
of their Vendure user ID. Anonymous browsers receive a local random ID, with IP as
a fallback. Raw identifiers are never stored.

Rate limits, daily request limits, global token budgets, token usage, and active
request leases are stored in Postgres. This makes the controls survive restarts
and remain consistent across multiple backend instances. The browser ID is an
abuse-deterrence mechanism rather than authentication; global quotas remain the
hard cost backstop if a client rotates identifiers.

Quota failures use GraphQL extension codes `RATE_LIMITED`,
`DAILY_QUOTA_EXCEEDED`, `SERVICE_BUSY`, or `UPSTREAM_RATE_LIMITED`. The Next.js
route converts these to HTTP 429 with a `Retry-After` header, and the chat UI shows
a localized explanation.

Apply migrations before starting the updated server. Usage is available in
`chat_assistant_usage_bucket` (current counters) and
`chat_assistant_usage_event` (per-request audit rows). Expired concurrency leases
are removed automatically before each request.

## Knowledge maintenance

- Product retrieval is live and comes from `search_index_item`.
- Store policy passages live in
  `apps/server/src/plugins/chat-assistant/knowledge.ts`. Keep these synchronized
  with the localized storefront policy pages.
- Cart and recent-order context is read only for the authenticated Vendure
  session. Addresses and payment details are never sent to the model.

Run `npm run build` after changing the plugin or UI. A working API key is required
only for an end-to-end response test, not for compilation.
