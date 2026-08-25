# visual-search-capstone

A full-stack e-commerce application built with [Vendure](https://www.vendure.io/) and [Next.js](https://nextjs.org/).

## Project Structure

This is a monorepo using npm workspaces:

```
visual-search-capstone/
├── apps/
│   ├── server/       # Vendure backend (GraphQL API, Admin Dashboard)
│   └── storefront/   # Next.js frontend
└── package.json      # Root workspace configuration
```

## Getting Started

### Development

Start both the server and storefront in development mode:

```bash
npm run dev
```

Or run them individually:

```bash
# Start only the server
npm run dev:server

# Start only the storefront
npm run dev:storefront
```

### Access Points

- **Vendure Dashboard**: http://localhost:3000/dashboard
- **Shop GraphQL API**: http://localhost:3000/shop-api
- **Admin GraphQL API**: http://localhost:3000/admin-api
- **Storefront**: http://localhost:3001

### AI shopping assistant

Set `OPENAI_API_KEY` in `apps/server/.env`, then start the normal development
stack. The floating StyleMatch assistant retrieves live catalog data, store policy
passages, and the signed-in customer's active cart before generating each answer.
See [the RAG chat assistant guide](docs/chat-assistant.md) for configuration and
the API contract.


### Payments

Three payment methods are registered. The storefront picks between them on the
payment method code, so each works independently of the others.

Stripe was removed: it does not onboard businesses in Cambodia, so its credentials
were unobtainable, and PayWay covers cards as well as KHQR.

| Admin UI code | Handler | Status |
| --- | --- | --- |
| `standard-payment` | Vendure's dummy handler, behind a Luhn-validating card form | Always available; no credentials |
| `payway-khqr` | ABA KHQR via [PayWay](https://developer.payway.com.kh) | Settles locally; needs `PAYWAY_MERCHANT_ID` and `PAYWAY_API_KEY` |
| `payway-card` | Card via PayWay's hosted checkout | Same credentials and same handler as KHQR |

To enable them: get sandbox credentials from the
[PayWay developer portal](https://developer.payway.com.kh), set `PAYWAY_MERCHANT_ID`
and `PAYWAY_API_KEY` in `apps/server/.env`, then create two payment methods in the
Admin UI — codes **`payway-khqr`** and **`payway-card`** — both using the handler
"ABA PayWay (KHQR and card)". One handler serves both: from the moment PayWay reports
`APPROVED` the two are identical, differing only in how the payer was asked.

Sandbox has no way to pay a KHQR — the QR carries a placeholder merchant account, so
real banking apps report "transaction not found". Card is the payable path in sandbox,
using ABA's published test cards (e.g. Mastercard `5156 8399 3770 6777`, `01/30`,
CVV `993`), and it exercises the same settlement code KHQR uses.

`PAYWAY_ENV` defaults to `sandbox`; only the exact string `production` moves real
money, and the server logs a warning at boot when it does.

Settlement runs through the storefront's poll as well as the callback at
`POST /payments/payway`. The poll alone completes a checkout, so a local demo needs no
public URL. The callback carries no signature — PayWay documents none — so it is
treated only as a hint and every status is re-checked against PayWay's
check-transaction API before the order is touched.

After changing the Shop API schema, regenerate the storefront's GraphQL types with the
server running:

```bash
npm run check-types --workspace storefront
```

### Admin Credentials

Use these credentials to log in to the Vendure Dashboard:

- **Username**: superadmin
- **Password**: superadmin

## Production Build

Build all packages:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Learn More

- [Vendure Documentation](https://docs.vendure.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vendure Discord Community](https://vendure.io/community)
