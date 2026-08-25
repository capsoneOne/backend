import gql from 'graphql-tag';

/**
 * The QR image is returned as the base64 data URI PayWay sends back, rather than a
 * URL. It is ABA's branded KHQR artwork — which merchants are required to display —
 * and embedding it means no request leaves the browser to fetch it, so nothing
 * outside announces that this order is being paid.
 */
export const shopApiExtensions = gql`
    type PayWayCheckoutSession {
        transactionId: String!
        "Base64 data URI of the branded KHQR image."
        qrImage: String!
        "Raw KHQR payload, for clients that render their own code."
        qrString: String!
        "Opens ABA Mobile directly, for a customer paying on the same phone."
        abaDeeplink: String
        expiresAt: String!
        orderCode: String!
        "True when this QR came from sandbox, where no real banking app can pay it."
        sandbox: Boolean!
    }

    type PayWayPaymentState {
        "One of: APPROVED, PRE-AUTH, PENDING, DECLINED, REFUNDED, CANCELLED, UNKNOWN."
        status: String!
        "True once the Vendure order has settled, not merely once PayWay says APPROVED."
        settled: Boolean!
        orderCode: String
    }

    type PayWayFormField {
        name: String!
        value: String!
    }

    """
    A signed field set for PayWay's hosted card page. The purchase endpoint answers
    with HTML rather than a URL, so the browser has to reach it by form POST.
    """
    type PayWayCardCheckout {
        transactionId: String!
        actionUrl: String!
        fields: [PayWayFormField!]!
        orderCode: String!
    }

    extend type Mutation {
        "Generates a KHQR for the active order. The order must be in ArrangingPayment."
        generatePayWayQr: PayWayCheckoutSession!
        "Prepares a hosted card checkout for the active order. Same requirement."
        createPayWayCardCheckout: PayWayCardCheckout!
    }

    extend type Query {
        "Polled by the checkout while the QR is on screen. Settles the order when approved."
        payWayPaymentState(transactionId: String!): PayWayPaymentState!
    }
`;
