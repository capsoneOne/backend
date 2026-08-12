'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ContactStep from './steps/contact-step';
import ShippingAddressStep from './steps/shipping-address-step';
import DeliveryStep from './steps/delivery-step';
import PaymentStep from './steps/payment-step';
import ReviewStep from './steps/review-step';
import OrderSummary from './order-summary';
import { useCheckout } from './checkout-provider';
import {useTranslations} from 'next-intl';

type CheckoutStep = 'contact' | 'shipping' | 'delivery' | 'payment' | 'review';

export default function CheckoutFlow() {
  const t = useTranslations('Checkout');
  const { order, isGuest } = useCheckout();

  const getStepOrder = (): CheckoutStep[] => {
    if (isGuest) {
      return ['contact', 'shipping', 'delivery', 'payment', 'review'];
    }
    return ['shipping', 'delivery', 'payment', 'review'];
  };

  const stepOrder = getStepOrder();

  const getInitialState = () => {
    const completed = new Set<CheckoutStep>();
    let current: CheckoutStep = stepOrder[0];

    if (isGuest) {
      if (order.customer?.emailAddress) {
        completed.add('contact');
        current = 'shipping';
      }
    }

    if (order.shippingAddress?.streetLine1 && order.shippingAddress?.country) {
      if (!isGuest || completed.has('contact')) {
        completed.add('shipping');
        current = 'delivery';
      }
    }

    if (order.shippingLines && order.shippingLines.length > 0) {
      if (completed.has('shipping')) {
        completed.add('delivery');
        current = 'payment';
      }
    }

    return { completed, current };
  };

  const initialState = getInitialState();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(initialState.current);
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(initialState.completed);

  const handleStepComplete = (step: CheckoutStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));

    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const canAccessStep = (step: CheckoutStep): boolean => {
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex === 0) return true;

    const previousStep = stepOrder[stepIndex - 1];
    return completedSteps.has(previousStep);
  };

  const getStepNumber = (step: CheckoutStep): number => {
    return stepOrder.indexOf(step) + 1;
  };

  const stepLabels: Record<CheckoutStep, string> = {
    contact: t('steps.contact'),
    shipping: t('steps.address'),
    delivery: t('steps.delivery'),
    payment: t('steps.payment'),
    review: t('steps.review'),
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <div className="order-2 lg:order-1">
        {/* Step Progress Indicator */}
        <div className="mb-6 hidden rounded-xl border border-border bg-card px-6 py-5 sm:block">
          <div className="flex items-center justify-between">
            {stepOrder.map((step, index) => (
              <div key={step} className="flex items-center flex-1 last:flex-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-colors duration-200 ${
                      completedSteps.has(step)
                        ? 'bg-primary text-primary-foreground'
                        : currentStep === step
                        ? 'bg-primary text-primary-foreground ring-3 ring-primary/15'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {completedSteps.has(step) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      getStepNumber(step)
                    )}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    completedSteps.has(step) || currentStep === step
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}>
                    {stepLabels[step]}
                  </span>
                </div>
                {index < stepOrder.length - 1 && (
                  <div className="flex-1 mx-2 mb-5">
                    <div className={`h-0.5 w-full transition-colors duration-200 ${
                      completedSteps.has(step) ? 'bg-primary' : 'bg-border'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Accordion
          value={[currentStep]}
          onValueChange={(value) => {
            const step = value[0] as CheckoutStep | undefined;
            if (step && canAccessStep(step)) {
              setCurrentStep(step);
            }
          }}
          className="space-y-3"
        >
          {isGuest && (
            <AccordionItem value="contact" className="rounded-xl border border-border bg-card px-5 sm:px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    completedSteps.has('contact')
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === 'contact'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {completedSteps.has('contact') ? <Check className="size-4" /> : getStepNumber('contact')}
                  </div>
                  <span className="text-base font-medium sm:text-lg">{t('contactInformation')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2">
                <ContactStep
                  onComplete={() => handleStepComplete('contact')}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem
            value="shipping"
            className="rounded-xl border border-border bg-card px-5 sm:px-6"
            disabled={!canAccessStep('shipping')}
          >
            <AccordionTrigger
              className="hover:no-underline"
              disabled={!canAccessStep('shipping')}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    completedSteps.has('shipping')
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === 'shipping'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {completedSteps.has('shipping') ? <Check className="size-4" /> : getStepNumber('shipping')}
                </div>
                <span className="text-base font-medium sm:text-lg">{t('shippingAddress')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <ShippingAddressStep
                onComplete={() => handleStepComplete('shipping')}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="delivery"
            className="rounded-xl border border-border bg-card px-5 sm:px-6"
            disabled={!canAccessStep('delivery')}
          >
            <AccordionTrigger
              className="hover:no-underline"
              disabled={!canAccessStep('delivery')}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    completedSteps.has('delivery')
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === 'delivery'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {completedSteps.has('delivery') ? <Check className="size-4" /> : getStepNumber('delivery')}
                </div>
                <span className="text-base font-medium sm:text-lg">{t('deliveryMethod')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <DeliveryStep
                onComplete={() => handleStepComplete('delivery')}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="payment"
            className="rounded-xl border border-border bg-card px-5 sm:px-6"
            disabled={!canAccessStep('payment')}
          >
            <AccordionTrigger
              className="hover:no-underline"
              disabled={!canAccessStep('payment')}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    completedSteps.has('payment')
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === 'payment'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {completedSteps.has('payment') ? <Check className="size-4" /> : getStepNumber('payment')}
                </div>
                <span className="text-base font-medium sm:text-lg">{t('paymentMethod')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <PaymentStep
                onComplete={() => handleStepComplete('payment')}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="review"
            className="rounded-xl border border-border bg-card px-5 sm:px-6"
            disabled={!canAccessStep('review')}
          >
            <AccordionTrigger
              className="hover:no-underline"
              disabled={!canAccessStep('review')}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  currentStep === 'review'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {getStepNumber('review')}
                </div>
                <span className="text-base font-medium sm:text-lg">{t('reviewAndPlaceOrder')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <ReviewStep
                onEditStep={setCurrentStep}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="order-1 lg:order-2">
        <OrderSummary />
      </div>
    </div>
  );
}
