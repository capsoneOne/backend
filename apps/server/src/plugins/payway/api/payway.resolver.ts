import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ActiveOrderService, Ctx, RequestContext, UserInputError } from '@vendure/core';

import { PayWayService } from '../payway.service';
import { PayWayCardCheckout, PayWayCheckoutSession, PayWayPaymentState } from '../types';

@Resolver()
export class PayWayShopResolver {
    constructor(
        private payway: PayWayService,
        private activeOrderService: ActiveOrderService,
    ) {}

    @Mutation()
    async generatePayWayQr(@Ctx() ctx: RequestContext): Promise<PayWayCheckoutSession> {
        const order = await this.requireArrangingPaymentOrder(ctx);
        return this.payway.generateQr(ctx, order);
    }

    @Mutation()
    async createPayWayCardCheckout(@Ctx() ctx: RequestContext): Promise<PayWayCardCheckout> {
        const order = await this.requireArrangingPaymentOrder(ctx);
        return this.payway.createCardCheckout(ctx, order);
    }

    /**
     * A query that settles an order is unusual, but the alternative is worse: the
     * storefront would have to be trusted to report "it said approved", and anything
     * the browser can assert about payment is something it can also invent. Here the
     * server asks PayWay; the poll is only a prompt to go and look.
     */
    /**
     * Both payment paths quote an amount to PayWay. Starting one against a cart that
     * can still change would quote a total the customer could then edit out from
     * under, so ArrangingPayment is required rather than assumed.
     */
    private async requireArrangingPaymentOrder(ctx: RequestContext) {
        const order = await this.activeOrderService.getActiveOrder(ctx, undefined);
        if (!order) {
            throw new UserInputError('There is no active order');
        }
        if (order.state !== 'ArrangingPayment') {
            throw new UserInputError(
                `The order must be in ArrangingPayment to be paid; it is in ${order.state}`,
            );
        }
        return order;
    }

    @Query()
    async payWayPaymentState(
        @Ctx() _ctx: RequestContext,
        @Args() args: { transactionId: string },
    ): Promise<PayWayPaymentState> {
        return this.payway.syncPayment(args.transactionId);
    }
}
