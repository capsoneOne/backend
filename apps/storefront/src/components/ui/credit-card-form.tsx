'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

type CardState = {
  number: string;
  holder: string;
  month: string;
  year: string;
  cvv: string;
};

type CardValidity = {
  number: boolean;
  holder: boolean;
  month: boolean;
  year: boolean;
  cvv: boolean;
  allValid: boolean;
};

type CreditCardFormLabels = {
  cardNumber: string;
  cardHolder: string;
  cardHolderPlaceholder: string;
  expirationDate: string;
  month: string;
  year: string;
  cvv: string;
  invalidCardNumber: string;
  submit: string;
  incomplete: string;
};

type Props = {
  defaultNumber?: string;
  defaultHolder?: string;
  defaultMonth?: string;
  defaultYear?: string;
  defaultCVV?: string;
  maskMiddle?: boolean;
  ring1?: string;
  ring2?: string;
  showSubmit?: boolean;
  labels?: Partial<CreditCardFormLabels>;
  onChange?: (state: CardState, validity: CardValidity) => void;
  onSubmit?: (state: CardState, validity: CardValidity) => void;
  className?: string;
};

const defaultLabels: CreditCardFormLabels = {
  cardNumber: 'Card number',
  cardHolder: 'Card holder',
  cardHolderPlaceholder: 'NAME ON CARD',
  expirationDate: 'Expiration date',
  month: 'Month',
  year: 'Year',
  cvv: 'CVV',
  invalidCardNumber: 'Enter a valid card number',
  submit: 'Submit',
  incomplete: 'Complete all fields',
};

function clampDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function formatNumberSpaces(value: string) {
  return value.replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

function passesLuhn(value: string) {
  if (value.length < 13 || value.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function CreditCardForm({
  defaultNumber = '',
  defaultHolder = '',
  defaultMonth = '',
  defaultYear = '',
  defaultCVV = '',
  maskMiddle = true,
  ring1 = '#58a6ff',
  ring2 = '#8b5cf6',
  showSubmit = true,
  labels: labelOverrides,
  onChange,
  onSubmit,
  className,
}: Props) {
  const labels = { ...defaultLabels, ...labelOverrides };
  const [number, setNumber] = useState(clampDigits(defaultNumber, 19));
  const [holder, setHolder] = useState(defaultHolder.toUpperCase());
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [cvv, setCVV] = useState(clampDigits(defaultCVV, 4));
  const [focusField, setFocusField] = useState<
    'number' | 'holder' | 'expire' | 'cvv' | null
  >(null);

  const currentDate = useMemo(() => new Date(), []);
  const years = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) =>
        String(currentDate.getFullYear() + index),
      ),
    [currentDate],
  );

  const validity = useMemo<CardValidity>(() => {
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const monthValid = monthNumber >= 1 && monthNumber <= 12;
    const yearValid =
      yearNumber > currentDate.getFullYear() ||
      (yearNumber === currentDate.getFullYear() &&
        monthValid &&
        monthNumber >= currentDate.getMonth() + 1);
    const numberValid = passesLuhn(number);
    const holderValid = holder.trim().length >= 2;
    const cvvValid = /^\d{3,4}$/.test(cvv);

    return {
      number: numberValid,
      holder: holderValid,
      month: monthValid,
      year: yearValid,
      cvv: cvvValid,
      allValid:
        numberValid && holderValid && monthValid && yearValid && cvvValid,
    };
  }, [currentDate, cvv, holder, month, number, year]);

  useEffect(() => {
    onChange?.({ number, holder, month, year, cvv }, validity);
  }, [cvv, holder, month, number, onChange, validity, year]);

  const visibleNumber = useMemo(() => {
    const slots = Array.from({ length: 16 }, (_, index) => {
      if (!number[index]) return '•';
      return maskMiddle && index >= 4 && index <= 11 ? '*' : number[index];
    });

    return slots.reduce<string[]>((parts, digit, index) => {
      parts.push(digit);
      if ((index + 1) % 4 === 0 && index < slots.length - 1) parts.push(' ');
      return parts;
    }, []);
  }, [maskMiddle, number]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.({ number, holder, month, year, cvv }, validity);
  };

  const previewField = (isFocused: boolean) =>
    cn(
      'rounded-lg border border-transparent transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none',
      isFocused &&
        'border-white/70 bg-white/5 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]',
    );

  const cardSurface =
    'absolute inset-0 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#283849_0%,#111b28_48%,#050a11_100%)] text-white shadow-[0_24px_44px_-24px_rgba(15,23,42,0.8)] [backface-visibility:hidden]';

  return (
    <section className={cn('w-full', className)}>
      <div className="grid gap-7 xl:grid-cols-[minmax(18rem,0.95fr)_minmax(18rem,1.05fr)] xl:items-start">
        <div className="mx-auto w-full max-w-[26.25rem] [perspective:1000px]">
          <div
            className={cn(
              'relative aspect-[1.8/1] w-full transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none',
              focusField === 'cvv' && '[transform:rotateY(180deg)]',
            )}
          >
            <div
              className={cn(cardSurface, 'p-5 sm:p-7')}
              style={{ '--cc-ring-1': ring1, '--cc-ring-2': ring2 } as React.CSSProperties}
            >
              <div className="absolute -top-28 -left-24 size-72 rounded-full border-[18px] border-[var(--cc-ring-1)] opacity-50 blur-xl" />
              <div className="absolute -bottom-52 -left-20 size-80 rounded-full border-[18px] border-[var(--cc-ring-2)] opacity-50 blur-xl" />
              <div className="relative z-[2] flex items-center justify-between font-medium">
                <span>CreditCard</span>
                <svg aria-label="Mastercard" role="img" viewBox="0 0 52 32" className="h-8 w-[3.25rem]">
                  <circle cx="19" cy="16" r="13" fill="#eb001b" />
                  <circle cx="33" cy="16" r="13" fill="#f79e1b" />
                  <path d="M26 5.8a13 13 0 0 1 0 20.4 13 13 0 0 1 0-20.4Z" fill="#ff5f00" />
                </svg>
              </div>

              <div
                className={cn(
                  previewField(focusField === 'number'),
                  'relative z-[2] mt-5 flex min-h-10 items-center px-2 font-mono text-[clamp(1rem,4.8vw,1.4rem)] tracking-[0.08em] sm:mt-7 sm:px-3 sm:tracking-[0.13em]',
                )}
                aria-label="Card number preview"
              >
                {visibleNumber.map((character, index) => (
                  <span
                    key={`${index}-${character}`}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-200"
                    aria-hidden="true"
                  >
                    {character}
                  </span>
                ))}
              </div>

              <div className="absolute right-5 bottom-5 left-5 z-[2] flex items-end justify-between gap-4 sm:right-7 sm:bottom-6 sm:left-7">
                <div
                  className={cn(
                    previewField(focusField === 'holder'),
                    '-ml-2 min-w-0 flex-1 px-2 py-1.5 uppercase',
                  )}
                >
                  <p className="text-[0.65rem] font-medium tracking-wide text-white/70 sm:text-xs">
                    {labels.cardHolder}
                  </p>
                  <p className="mt-1 truncate text-sm sm:text-base">
                    {holder || labels.cardHolderPlaceholder}
                  </p>
                </div>
                <div
                  className={cn(
                    previewField(focusField === 'expire'),
                    '-mr-2 shrink-0 px-2 py-1.5',
                  )}
                >
                  <p className="text-[0.65rem] font-medium tracking-wide text-white/70 sm:text-xs">
                    {labels.expirationDate}
                  </p>
                  <p className="mt-1 text-sm sm:text-base">
                    {month || 'MM'}/{year ? year.slice(-2) : 'YY'}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(cardSurface, 'pt-6 [transform:rotateY(180deg)]')}
              style={{ '--cc-ring-1': ring1, '--cc-ring-2': ring2 } as React.CSSProperties}
            >
              <div className="absolute -top-28 -left-24 size-72 rounded-full border-[18px] border-[var(--cc-ring-1)] opacity-50 blur-xl" />
              <div className="absolute -bottom-52 -left-20 size-80 rounded-full border-[18px] border-[var(--cc-ring-2)] opacity-50 blur-xl" />
              <div className="relative z-[2] h-10 w-full bg-slate-500" />
              <div className="relative z-[2] mt-5 px-7">
                <p className="text-right text-xs font-medium tracking-wide">{labels.cvv}</p>
                <div
                  className={cn(
                    'mt-1 flex h-11 items-center justify-end rounded-lg border bg-white px-3 font-mono text-xl text-slate-950 transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none',
                    focusField === 'cvv'
                      ? 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]'
                      : 'border-transparent',
                  )}
                >
                  {'*'.repeat(cvv.length)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <form
          className="grid gap-4 rounded-xl border border-border bg-card/70 p-4 shadow-sm sm:p-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="card-number">{labels.cardNumber}</Label>
            <Input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={formatNumberSpaces(number)}
              onChange={(event) => setNumber(clampDigits(event.target.value, 19))}
              onFocus={() => setFocusField('number')}
              onBlur={() => setFocusField(null)}
              aria-invalid={number.length > 0 && !validity.number}
              aria-describedby={number.length > 0 && !validity.number ? 'card-number-error' : undefined}
              className="h-11 font-mono"
            />
            {number.length > 0 && !validity.number && (
              <p id="card-number-error" className="text-xs text-destructive" role="alert">
                {labels.invalidCardNumber}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-holder">{labels.cardHolder}</Label>
            <Input
              id="card-holder"
              autoComplete="cc-name"
              placeholder={labels.cardHolderPlaceholder}
              value={holder}
              onChange={(event) => setHolder(event.target.value.toUpperCase())}
              onFocus={() => setFocusField('holder')}
              onBlur={() => setFocusField(null)}
              aria-invalid={holder.length > 0 && !validity.holder}
              className="h-11 uppercase"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">{labels.expirationDate}</legend>
              <div className="grid grid-cols-2 gap-2">
                <NativeSelect
                  id="expiration-month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  onFocus={() => setFocusField('expire')}
                  onBlur={() => setFocusField(null)}
                  aria-label={labels.month}
                  aria-invalid={month.length > 0 && !validity.month}
                  className="w-full [&_[data-slot=native-select]]:h-11"
                >
                  <NativeSelectOption value="" disabled>{labels.month}</NativeSelectOption>
                  {Array.from({ length: 12 }, (_, index) =>
                    String(index + 1).padStart(2, '0'),
                  ).map((value) => (
                    <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  id="expiration-year"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  onFocus={() => setFocusField('expire')}
                  onBlur={() => setFocusField(null)}
                  aria-label={labels.year}
                  aria-invalid={year.length > 0 && !validity.year}
                  className="w-full [&_[data-slot=native-select]]:h-11"
                >
                  <NativeSelectOption value="" disabled>{labels.year}</NativeSelectOption>
                  {years.map((value) => (
                    <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="card-cvv">{labels.cvv}</Label>
              <Input
                id="card-cvv"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={cvv}
                onChange={(event) => setCVV(clampDigits(event.target.value, 4))}
                onFocus={() => setFocusField('cvv')}
                onBlur={() => setFocusField(null)}
                aria-invalid={cvv.length > 0 && !validity.cvv}
                className="h-11 font-mono"
              />
            </div>
          </div>

          {showSubmit && (
            <Button type="submit" disabled={!validity.allValid} className="mt-1 min-h-11 w-full">
              {validity.allValid ? labels.submit : labels.incomplete}
            </Button>
          )}
        </form>
      </div>
    </section>
  );
}

export { CreditCardForm };
export type { CardState, CardValidity, CreditCardFormLabels };
