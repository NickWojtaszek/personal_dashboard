/**
 * Country-aware label mapping for property terminology.
 *
 * Different countries use different terms for the same concepts:
 * - UK: Council Tax, Ground Rent, Service Charge, Leasehold
 * - AU: Council Rates, (no ground rent), Strata Levies, Strata
 * - NZ: Council Rates, (no ground rent), Body Corporate Levies
 * - US: Property Tax, HOA Dues
 * - PL: Council Tax, Service Charge
 */

import type { PropertyCountry } from '../types';

export interface PropertyLabels {
    councilTax: string;
    serviceCharge: string;
    groundRent: string;
    leaseholdSection: string;
    hasGroundRent: boolean;
    currency: string;
    currencySymbol: string;
}

const LABELS: Record<PropertyCountry, PropertyLabels> = {
    UK: {
        councilTax: 'Council Tax',
        serviceCharge: 'Service Charge',
        groundRent: 'Ground Rent',
        leaseholdSection: 'Ground Rent & Service Charge',
        hasGroundRent: true,
        currency: 'GBP',
        currencySymbol: '£',
    },
    AU: {
        councilTax: 'Council Rates',
        serviceCharge: 'Strata Levies',
        groundRent: 'Ground Rent',
        leaseholdSection: 'Strata Levies',
        hasGroundRent: false,
        currency: 'AUD',
        currencySymbol: '$',
    },
    NZ: {
        councilTax: 'Council Rates',
        serviceCharge: 'Body Corporate Levies',
        groundRent: 'Ground Rent',
        leaseholdSection: 'Body Corporate Levies',
        hasGroundRent: false,
        currency: 'NZD',
        currencySymbol: '$',
    },
    US: {
        councilTax: 'Property Tax',
        serviceCharge: 'HOA Dues',
        groundRent: 'Ground Rent',
        leaseholdSection: 'HOA Dues',
        hasGroundRent: false,
        currency: 'USD',
        currencySymbol: '$',
    },
    PL: {
        councilTax: 'Council Tax',
        serviceCharge: 'Service Charge',
        groundRent: 'Ground Rent',
        leaseholdSection: 'Service Charge',
        hasGroundRent: false,
        currency: 'PLN',
        currencySymbol: 'zł',
    },
};

const DEFAULT_LABELS = LABELS.UK;

export function getPropertyLabels(country?: PropertyCountry): PropertyLabels {
    if (!country) return DEFAULT_LABELS;
    return LABELS[country] || DEFAULT_LABELS;
}

export const COUNTRY_OPTIONS: { value: PropertyCountry; label: string }[] = [
    { value: 'AU', label: 'Australia' },
    { value: 'NZ', label: 'New Zealand' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
    { value: 'PL', label: 'Poland' },
];
