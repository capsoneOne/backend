'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CreditCardForm, type CardValidity } from '@/components/ui/credit-card-form';
import { CreditCard } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import {useTranslations} from 'next-intl';

interface PaymentStepProps {
  onComplete: () => void;
}

export default function PaymentStep({ onComplete }: PaymentStepProps) {
  const t = useTranslations('Checkout');
  const {
    order,
    paymentMethods,
    selectedPaymentMethodCode,
    setSelectedPaymentMethodCode,
  } = useCheckout();
  const [isCardValid, setIsCardValid] = useState(false);

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.code === selectedPaymentMethodCode,
  );
  const requiresCardDetails = selectedPaymentMethod
    ? /card|credit|stripe|standard-payment/i.test(
        `${selectedPaymentMethod.code} ${selectedPaymentMethod.name}`,
      )
    : false;

  const handleCardChange = useCallback(
    (_state: unknown, validity: CardValidity) => {
      setIsCardValid(validity.allValid);
    },
    [],
  );

  const handlePaymentMethodChange = (code: string) => {
    setIsCardValid(false);
    setSelectedPaymentMethodCode(code);
  };

  const handleContinue = () => {
    if (!selectedPaymentMethodCode || (requiresCardDetails && !isCardValid)) return;
    onComplete();
  };

  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('noPaymentMethods')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-medium">{t('selectPaymentMethod')}</h3>

      <RadioGroup value={selectedPaymentMethodCode || ''} onValueChange={handlePaymentMethodChange}>
        {paymentMethods.map((method) => (
          <Label key={method.code} htmlFor={method.code} className="cursor-pointer">
            <Card className="gap-0 border-border p-4 transition-colors hover:border-primary/30">
              <div className="flex items-center gap-3">
                <RadioGroupItem value={method.code} id={method.code} />
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{method.name}</p>
                  {method.description && (
                    <p className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: method.description }} />
                  )}
                </div>
              </div>
            </Card>
          </Label>
        ))}
      </RadioGroup>

      {requiresCardDetails && (
        <div className="space-y-3">
          <CreditCardForm
            defaultHolder={
              order.customer
                ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                : ''
            }
            showSubmit={false}
            onChange={handleCardChange}
            labels={{
              cardNumber: t('cardNumber'),
              cardHolder: t('cardHolder'),
              cardHolderPlaceholder: t('cardHolderPlaceholder'),
              expirationDate: t('expirationDate'),
              month: t('expirationMonth'),
              year: t('expirationYear'),
              cvv: t('cvv'),
              invalidCardNumber: t('invalidCardNumber'),
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('demoCardNotice')}
          </p>
        </div>
      )}

      <Button
        onClick={handleContinue}
        disabled={!selectedPaymentMethodCode || (requiresCardDetails && !isCardValid)}
        className="min-h-11 w-full px-5"
      >
        {t('continueToReview')}
      </Button>
    </div>
  );
}
