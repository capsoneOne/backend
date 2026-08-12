'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, MapPinned, UserRound } from 'lucide-react';
import { CountrySelect } from '@/components/ui/country-select';
import {useTranslations} from 'next-intl';
import {AddressLocationPicker, type ResolvedMapAddress} from './address-location-picker';

interface Country {
  id: string;
  code: string;
  name: string;
}

interface AddressFormData {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber: string;
  company?: string;
}

interface CustomerAddress {
  id: string;
  fullName?: string | null;
  company?: string | null;
  streetLine1: string;
  streetLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: { id: string; code: string; name: string };
  phoneNumber?: string | null;
  defaultShippingAddress?: boolean | null;
  defaultBillingAddress?: boolean | null;
}

interface AddressFormProps {
  countries: Country[];
  address?: CustomerAddress;
  onSubmit: (data: AddressFormData & { id?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function AddressForm({ countries, address, onSubmit, onCancel, isSubmitting, submitError }: AddressFormProps) {
  const t = useTranslations('Account');
  const { register, handleSubmit, formState: { errors }, control, setValue } = useForm<AddressFormData>({
    defaultValues: address ? {
      fullName: address.fullName || '',
      company: address.company || '',
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2 || '',
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postalCode || '',
      countryCode: address.country.code,
      phoneNumber: address.phoneNumber || '',
    } : {
      countryCode: countries[0]?.code || 'US',
    }
  });

  const handleFormSubmit = async (data: AddressFormData) => {
    await onSubmit(address ? { ...data, id: address.id } : data);
  };

  const applyMapAddress = (mapAddress: ResolvedMapAddress) => {
    const fields = ['streetLine1', 'city', 'province', 'postalCode'] as const;
    fields.forEach(field => {
      const value = mapAddress[field];
      if (value) setValue(field, value, {shouldDirty: true, shouldValidate: true});
    });

    if (mapAddress.countryCode && countries.some(country => country.code === mapAddress.countryCode)) {
      setValue('countryCode', mapAddress.countryCode, {shouldDirty: true, shouldValidate: true});
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:overflow-hidden">
        <div className="border-b border-border bg-secondary/15 p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <AddressLocationPicker onAddressResolved={applyMapAddress} disabled={isSubmitting}/>
        </div>

        <div className="p-5 sm:p-6 lg:overflow-y-auto">
          <FieldGroup className="gap-7">
            <section aria-labelledby="recipient-details-title">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <UserRound className="size-4" aria-hidden="true"/>
                </span>
                <div>
                  <h3 id="recipient-details-title" className="font-semibold">{t('recipientDetails')}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t('recipientDetailsDescription')}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="fullName">{t('fullName')}</FieldLabel>
                  <Input id="fullName" autoComplete="name" {...register('fullName', { required: t('fullNameRequired') })} disabled={isSubmitting}/>
                  <FieldError>{errors.fullName?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="phoneNumber">{t('phoneNumberField')}</FieldLabel>
                  <Input id="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" {...register('phoneNumber', { required: t('phoneRequired') })} disabled={isSubmitting}/>
                  <FieldError>{errors.phoneNumber?.message}</FieldError>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="company">{t('company')}</FieldLabel>
                  <Input id="company" autoComplete="organization" {...register('company')} disabled={isSubmitting}/>
                </Field>
              </div>
            </section>

            <div className="h-px bg-border"/>

            <section aria-labelledby="delivery-details-title">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <MapPinned className="size-4" aria-hidden="true"/>
                </span>
                <div>
                  <h3 id="delivery-details-title" className="font-semibold">{t('deliveryAddressDetails')}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t('deliveryAddressDetailsDescription')}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="streetLine1">{t('streetAddress')}</FieldLabel>
                  <Input id="streetLine1" autoComplete="address-line1" {...register('streetLine1', { required: t('streetRequired') })} disabled={isSubmitting}/>
                  <FieldError>{errors.streetLine1?.message}</FieldError>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="streetLine2">{t('apartment')}</FieldLabel>
                  <Input id="streetLine2" autoComplete="address-line2" {...register('streetLine2')} disabled={isSubmitting}/>
                </Field>
                <Field>
                  <FieldLabel htmlFor="city">{t('city')}</FieldLabel>
                  <Input id="city" autoComplete="address-level2" {...register('city', { required: t('cityRequired') })} disabled={isSubmitting}/>
                  <FieldError>{errors.city?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="province">{t('stateProvince')}</FieldLabel>
                  <Input id="province" autoComplete="address-level1" {...register('province', { required: t('stateProvinceRequired') })} disabled={isSubmitting}/>
                  <FieldError>{errors.province?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="postalCode">{t('postalCode')}</FieldLabel>
                  <Input id="postalCode" inputMode="numeric" autoComplete="postal-code" {...register('postalCode', { required: t('postalCodeRequired') })} disabled={isSubmitting}/>
                  <FieldError>{errors.postalCode?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="countryCode">{t('country')}</FieldLabel>
                  <Controller
                    name="countryCode"
                    control={control}
                    rules={{ required: t('countryRequired') }}
                    render={({ field }) => (
                      <CountrySelect countries={countries} value={field.value} onValueChange={field.onChange} disabled={isSubmitting}/>
                    )}
                  />
                  <FieldError>{errors.countryCode?.message}</FieldError>
                </Field>
              </div>
            </section>
          </FieldGroup>
        </div>
      </div>

      <div className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
        {submitError && <p role="alert" className="mb-3 text-sm font-medium text-destructive">{submitError}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t('requiredFieldsHint')}</p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="min-h-11 flex-1 px-5 sm:flex-none">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-h-11 flex-1 px-6 sm:flex-none">
              {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true"/>}
              {address ? t('updateAddress') : t('saveAddress')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
