
import React, { useState, useMemo, useCallback } from 'react';
import type { PropertyInfo, FinancialTransaction } from '../../types';

interface FinancialHealthSectionProps {
    property: PropertyInfo;
    onSave: (property: PropertyInfo) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: '$', USD: '$', GBP: '£', EUR: '€', NZD: '$', PLN: 'zł' };

// ─── FY helpers (AU: 1 Jul – 30 Jun) ──────────────────────────────
function getFYLabel(fyStartYear: number): string {
    return `FY ${fyStartYear}/${(fyStartYear + 1).toString().slice(-2)}`;
}

function getFYRange(fyStartYear: number): { start: string; end: string } {
    return {
        start: `${fyStartYear}-07-01`,
        end: `${fyStartYear + 1}-06-30`,
    };
}

function getAvailableFYs(transactions: FinancialTransaction[]): number[] {
    const years = new Set<number>();
    for (const t of transactions) {
        if (!t.date) continue;
        const d = new Date(t.date);
        if (isNaN(d.getTime())) continue;
        // AU FY: Jul-Jun. Month < 7 (Jan-Jun) = previous year's FY
        const fy = d.getMonth() < 6 ? d.getFullYear() - 1 : d.getFullYear();
        years.add(fy);
    }
    return Array.from(years).sort((a, b) => b - a);
}

function filterByFY(transactions: FinancialTransaction[], fyStartYear: number | null): FinancialTransaction[] {
    if (fyStartYear === null) return transactions;
    const { start, end } = getFYRange(fyStartYear);
    return transactions.filter(t => t.date && t.date >= start && t.date <= end);
}

// ─── CSV export ────────────────────────────────────────────────────
function generateTaxCSV(property: PropertyInfo, transactions: FinancialTransaction[], fyLabel: string, selectedFY: number | null): string {
    const fin = property.financials;
    const mortgage = property.mortgage;
    const symbol = CURRENCY_SYMBOLS[fin?.currency || 'AUD'] || '$';

    const lines: string[] = [];
    const row = (...cols: (string | number | undefined)[]) =>
        lines.push(cols.map(c => {
            const s = c === undefined || c === null ? '' : String(c);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','));

    // Header
    row('Rental Property Tax Report');
    row('Property', property.name);
    row('Address', property.location);
    row('Financial Year', fyLabel);
    row('Generated', new Date().toLocaleString('en-AU'));
    row('Currency', fin?.currency || 'AUD');
    row();

    // Income section
    row('RENTAL INCOME');
    row('Date', 'Category', 'Description', 'Amount');
    const incomeItems = transactions.filter(t => t.type === 'income')
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (const t of incomeItems) {
        row(t.date || '', t.category || 'Uncategorised', t.description, t.amount);
    }
    const totalIncome = incomeItems.reduce((s, t) => s + t.amount, 0);
    row('', '', 'TOTAL INCOME', totalIncome);
    row();

    // Expense section by category
    row('DEDUCTIBLE EXPENSES');
    row('Date', 'Category', 'Description', 'Amount');
    const expenseItems = transactions.filter(t => t.type === 'expense')
        .sort((a, b) => (a.category || 'zzz').localeCompare(b.category || 'zzz') || (a.date || '').localeCompare(b.date || ''));
    for (const t of expenseItems) {
        row(t.date || '', t.category || 'Uncategorised', t.description, t.amount);
    }
    const totalExpenses = expenseItems.reduce((s, t) => s + t.amount, 0);
    row('', '', 'TOTAL EXPENSES', totalExpenses);
    row();

    // Category summary
    row('EXPENSE SUMMARY BY CATEGORY');
    row('Category', 'Amount');
    const catMap = new Map<string, number>();
    for (const t of expenseItems) {
        const cat = t.category || 'Uncategorised';
        catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
    }
    for (const [cat, amt] of Array.from(catMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        row(cat, amt);
    }
    row('TOTAL', totalExpenses);
    row();

    // Interest — priority: payment history (exact) → rate×balance (est) → total repayments (upper bound)
    row('LOAN INTEREST');
    let csvInterest = 0;
    let csvInterestSource = '';
    if (mortgage?.loans && mortgage.loans.length > 0) {
        row('Account', 'Lender', 'Rate %', 'Balance', 'Annual Interest');
        for (const loan of mortgage.loans) {
            // Per-loan: prefer payment history interest
            let loanInterest: number | undefined;
            let loanSource = '';
            if (loan.payments && loan.payments.length > 0 && loan.payments.some(p => p.interest > 0)) {
                const avgInterest = loan.payments.reduce((s, p) => s + p.interest, 0) / loan.payments.length;
                loanInterest = avgInterest * 12;
                loanSource = 'from payments';
            } else if (loan.interestRate && loan.outstandingBalance) {
                loanInterest = (loan.interestRate / 100) * loan.outstandingBalance;
                loanSource = 'rate x balance';
            }
            row(loan.accountNumber || '', loan.lender || '', loan.interestRate || '', loan.outstandingBalance, loanInterest !== undefined ? `${Math.round(loanInterest)} (${loanSource})` : '');
        }
        // Total interest: payment history first
        let fromPayments = 0;
        let hasPaymentInterest = false;
        for (const loan of mortgage.loans) {
            if (loan.payments && loan.payments.length > 0 && loan.payments.some(p => p.interest > 0)) {
                hasPaymentInterest = true;
                const avgInterest = loan.payments.reduce((s, p) => s + p.interest, 0) / loan.payments.length;
                fromPayments += avgInterest * 12;
            }
        }
        if (hasPaymentInterest) {
            csvInterest = fromPayments;
            csvInterestSource = 'from payment history (exact)';
        } else {
            const fromRate = mortgage.loans.reduce((s, l) => {
                if (l.interestRate && l.outstandingBalance) return s + (l.interestRate / 100) * l.outstandingBalance;
                return s;
            }, 0);
            if (fromRate > 0) {
                csvInterest = fromRate;
                csvInterestSource = 'estimated from rate x balance';
            } else {
                const totalRepayments = mortgage.loans.reduce((s, l) => {
                    if (l.repaymentAmount) return s + l.repaymentAmount * 12;
                    if (l.payments && l.payments.length > 0) {
                        const avg = l.payments.reduce((sum, p) => sum + p.amount, 0) / l.payments.length;
                        return s + avg * 12;
                    }
                    return s;
                }, 0);
                if (totalRepayments > 0) {
                    csvInterest = totalRepayments;
                    csvInterestSource = 'WARNING: total repayments (includes principal) - add interest breakdown for accuracy';
                }
            }
        }
        if (csvInterestSource) row('Interest Source', csvInterestSource);
    }
    if (mortgage?.offsetBalance) {
        row('Offset Balance', mortgage.offsetBalance);
        row('Note', 'Interest charged by bank is already reduced by offset. Deductible interest = actual interest paid.');
    }
    row();

    // Strata / Body Corporate & Council Rates from Operations (filtered by FY)
    const ops = property.operations?.leaseholdCharges;
    const csvFyRange = selectedFY !== null ? getFYRange(selectedFY) : null;
    const csvInFY = (dueDate?: string, year?: number): boolean => {
        if (!csvFyRange) return true;
        if (dueDate && dueDate >= csvFyRange.start && dueDate <= csvFyRange.end) return true;
        if (year !== undefined && selectedFY !== null) return year === selectedFY || year === selectedFY + 1;
        return !csvFyRange;
    };
    let strataTotal = 0;
    let councilTotal = 0;
    const filteredStrata = ops?.serviceCharges?.filter(sc => csvInFY(sc.dueDate, sc.year)) || [];
    if (filteredStrata.length > 0) {
        row('STRATA / BODY CORPORATE FEES');
        row('Year', 'Amount Due', 'Amount Paid', 'Due Date');
        for (const sc of filteredStrata) {
            row(sc.year, sc.amountDue, sc.amountPaid, sc.dueDate);
            strataTotal += sc.amountPaid || sc.amountDue;
        }
        row('Total', strataTotal);
        row();
    }
    const filteredCouncil = ops?.councilTax?.filter(ct => csvInFY(ct.dueDate, ct.year)) || [];
    if (filteredCouncil.length > 0) {
        row('COUNCIL RATES');
        row('Year', 'Amount Due', 'Amount Paid', 'Due Date', 'Paid by Tenant');
        for (const ct of filteredCouncil) {
            if (!ct.paidByTenant) {
                row(ct.year, ct.amountDue, ct.amountPaid, ct.dueDate, 'No');
                councilTotal += ct.amountPaid || ct.amountDue;
            } else {
                row(ct.year, ct.amountDue, ct.amountPaid, ct.dueDate, 'Yes (not deductible for owner)');
            }
        }
        row('Total (owner-paid)', councilTotal);
        row();
    }

    // Depreciation
    row('DEPRECIATION');
    row('Annual Depreciation (from QS report)', fin?.annualDepreciation || 'Not set');
    if (fin?.buildYear) row('Build Year', fin.buildYear);
    row();

    // Warnings
    const csvWarnings: string[] = [];
    const uncatCount = transactions.filter(t => !t.category).length;
    if (uncatCount > 0) csvWarnings.push(`${uncatCount} transaction(s) missing a category`);
    if (mortgage?.loans?.some(l => !l.interestRate) && !csvInterestSource.includes('exact') && !csvInterestSource.includes('rate')) csvWarnings.push('Loan interest rates not set - interest may be inaccurate');
    if (!fin?.annualDepreciation) csvWarnings.push('No depreciation set');
    if (!fin?.marginalTaxRate) csvWarnings.push('Marginal tax rate not set');
    if (csvWarnings.length > 0) {
        row('DATA QUALITY WARNINGS');
        for (const w of csvWarnings) row(w);
        row();
    }

    // Summary — include strata & council if not already in transactions
    row('TAX SUMMARY');
    const depreciation = fin?.annualDepreciation || 0;
    // Check if strata/council are already captured as transaction expenses to avoid double-counting
    const hasStrataInTxns = expenseItems.some(t => t.category === 'Body Corporate');
    const hasCouncilInTxns = expenseItems.some(t => t.category === 'Council Rates');
    const additionalStrata = hasStrataInTxns ? 0 : strataTotal;
    const additionalCouncil = hasCouncilInTxns ? 0 : councilTotal;
    const totalDeductions = totalExpenses + additionalStrata + additionalCouncil;

    row('Total Rental Income', totalIncome);
    row('Total Operating Expenses (transactions)', totalExpenses);
    if (additionalStrata > 0) row('+ Strata/Body Corporate (from Operations)', additionalStrata);
    if (additionalCouncil > 0) row('+ Council Rates (from Operations)', additionalCouncil);
    if (additionalStrata > 0 || additionalCouncil > 0) row('Total Deductible Expenses', totalDeductions);
    row(`Loan Interest (${csvInterestSource || 'no loans'})`, Math.round(csvInterest));
    row('Depreciation', depreciation);
    const taxableIncome = totalIncome - totalDeductions - csvInterest - depreciation;
    row('Net Rental Income / (Loss)', Math.round(taxableIncome));
    row();
    if (fin?.marginalTaxRate) {
        const rate = fin.marginalTaxRate;
        const taxEffect = -taxableIncome * rate;
        row('Marginal Tax Rate', `${(rate * 100).toFixed(0)}%`);
        row(taxableIncome < 0 ? 'Tax Benefit (estimated)' : 'Tax Liability (estimated)', Math.round(Math.abs(taxEffect)));
    }
    row();

    // Property details
    row('PROPERTY DETAILS');
    row('Purchase Price', fin?.purchasePrice || '');
    row('Purchase Date', fin?.purchaseDate || '');
    row('Estimated Value', fin?.estimatedValue || '');
    row('Valuation Date', fin?.estimatedValueDate || '');

    return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── PDF export (print-friendly HTML) ────────────────────────────
function generateTaxPDF(property: PropertyInfo, transactions: FinancialTransaction[], fyLabel: string, selectedFY: number | null) {
    const fin = property.financials;
    const mortgage = property.mortgage;
    const sym = CURRENCY_SYMBOLS[fin?.currency || 'AUD'] || '$';
    const fmtC = (n: number) => `${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtD = (d?: string) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const incomeItems = transactions.filter(t => t.type === 'income').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const expenseItems = transactions.filter(t => t.type === 'expense').sort((a, b) => (a.category || 'zzz').localeCompare(b.category || 'zzz') || (a.date || '').localeCompare(b.date || ''));
    const totalIncome = incomeItems.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenseItems.reduce((s, t) => s + t.amount, 0);

    // Category summary
    const catMap = new Map<string, number>();
    for (const t of expenseItems) {
        const cat = t.category || 'Uncategorised';
        catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
    }

    // Interest — priority: payment history (exact) → rate×balance (est) → total repayments (upper bound)
    let interestDeduction = 0;
    let interestSource = '';
    if (mortgage?.loans && mortgage.loans.length > 0) {
        // 1. Payment history — most accurate (exact interest from bank)
        let fromPayments = 0;
        let hasPaymentInterest = false;
        for (const loan of mortgage.loans) {
            if (loan.payments && loan.payments.length > 0 && loan.payments.some(p => p.interest > 0)) {
                hasPaymentInterest = true;
                const avgInterest = loan.payments.reduce((s, p) => s + p.interest, 0) / loan.payments.length;
                fromPayments += avgInterest * 12;
            }
        }
        if (hasPaymentInterest) {
            interestDeduction = fromPayments;
            interestSource = 'from payment history (exact)';
        } else {
            // 2. Rate × balance — estimate
            const fromRate = mortgage.loans.reduce((s, l) => {
                if (l.interestRate && l.outstandingBalance) return s + (l.interestRate / 100) * l.outstandingBalance;
                return s;
            }, 0);
            if (fromRate > 0) {
                interestDeduction = fromRate;
                interestSource = 'estimated from rate × balance';
            } else {
                // 3. Total repayments — upper bound (includes principal)
                const totalRepayments = mortgage.loans.reduce((s, l) => {
                    if (l.repaymentAmount) return s + l.repaymentAmount * 12;
                    if (l.payments && l.payments.length > 0) {
                        const avg = l.payments.reduce((sum, p) => sum + p.amount, 0) / l.payments.length;
                        return s + avg * 12;
                    }
                    return s;
                }, 0);
                if (totalRepayments > 0) {
                    interestDeduction = totalRepayments;
                    interestSource = 'WARNING: using total repayments (includes principal) — add payment breakdown for accuracy';
                }
            }
        }
    }

    // Strata / Body Corporate & Council Rates from Operations (filtered by FY)
    const pdfOps = property.operations?.leaseholdCharges;
    const pdfFyRange = selectedFY !== null ? getFYRange(selectedFY) : null;
    const pdfInFY = (dueDate?: string, year?: number): boolean => {
        if (!pdfFyRange) return true;
        if (dueDate && dueDate >= pdfFyRange.start && dueDate <= pdfFyRange.end) return true;
        if (year !== undefined && selectedFY !== null) return year === selectedFY || year === selectedFY + 1;
        return !pdfFyRange;
    };
    let pdfStrataTotal = 0;
    let pdfCouncilTotal = 0;
    if (pdfOps?.serviceCharges) {
        for (const sc of pdfOps.serviceCharges) {
            if (pdfInFY(sc.dueDate, sc.year)) pdfStrataTotal += sc.amountPaid || sc.amountDue;
        }
    }
    if (pdfOps?.councilTax) {
        for (const ct of pdfOps.councilTax) {
            if (!ct.paidByTenant && pdfInFY(ct.dueDate, ct.year)) pdfCouncilTotal += ct.amountPaid || ct.amountDue;
        }
    }
    // Avoid double-counting if already in transactions
    const pdfHasStrataInTxns = expenseItems.some(t => t.category === 'Body Corporate');
    const pdfHasCouncilInTxns = expenseItems.some(t => t.category === 'Council Rates');
    const pdfAdditionalStrata = pdfHasStrataInTxns ? 0 : pdfStrataTotal;
    const pdfAdditionalCouncil = pdfHasCouncilInTxns ? 0 : pdfCouncilTotal;
    const pdfTotalDeductions = totalExpenses + pdfAdditionalStrata + pdfAdditionalCouncil;

    // Warnings
    const warnings: string[] = [];
    const uncategorisedCount = transactions.filter(t => !t.category).length;
    if (uncategorisedCount > 0) warnings.push(`${uncategorisedCount} transaction${uncategorisedCount > 1 ? 's' : ''} missing a category — categorise in Financials for accurate ATO reporting`);
    if (mortgage?.loans?.some(l => !l.interestRate) && !interestSource.includes('exact') && !interestSource.includes('rate')) warnings.push('Loan interest rates not set — interest figure may be inaccurate');
    if (!fin?.annualDepreciation) warnings.push('No depreciation set — add your QS schedule amount in Valuation & Tax settings');
    if (!fin?.marginalTaxRate) warnings.push('Marginal tax rate not set — tax benefit/liability cannot be calculated');

    const depreciation = fin?.annualDepreciation || 0;
    const taxableIncome = totalIncome - pdfTotalDeductions - interestDeduction - depreciation;

    const tableStyle = 'width:100%;border-collapse:collapse;margin:0 0 16px';
    const thStyle = 'text-align:left;padding:6px 8px;border-bottom:2px solid #334155;font-size:11px;color:#475569';
    const tdStyle = 'padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px';
    const tdRight = `${tdStyle};text-align:right;font-family:monospace`;
    const totalRow = 'font-weight:bold;background:#f1f5f9';

    const html = `<!DOCTYPE html><html><head><title>Tax Report — ${property.name} — ${fyLabel}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 20px 0 6px; padding: 4px 0; border-bottom: 2px solid #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 16px; }
  .meta span { margin-right: 16px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-weight: bold; font-size: 11px; }
  .neg { background: #dbeafe; color: #1d4ed8; }
  .pos { background: #dcfce7; color: #16a34a; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
  .summary-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .summary-box .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .summary-box .value { font-size: 16px; font-weight: bold; font-family: monospace; margin-top: 2px; }
  .note { font-size: 9px; color: #94a3b8; margin-top: 4px; font-style: italic; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<h1>Rental Property Tax Report</h1>
<div class="meta">
  <span><b>Property:</b> ${property.name}</span>
  <span><b>Address:</b> ${property.location}</span><br/>
  <span><b>Financial Year:</b> ${fyLabel}</span>
  <span><b>Generated:</b> ${new Date().toLocaleString('en-AU')}</span>
  <span><b>Currency:</b> ${fin?.currency || 'AUD'}</span>
</div>

<div class="summary-grid">
  <div class="summary-box"><div class="label">Total Rental Income</div><div class="value" style="color:#16a34a">${fmtC(totalIncome)}</div></div>
  <div class="summary-box"><div class="label">Total Deductible Expenses</div><div class="value" style="color:#dc2626">${fmtC(pdfTotalDeductions)}</div>${pdfAdditionalStrata > 0 || pdfAdditionalCouncil > 0 ? `<div class="note">Includes${pdfAdditionalStrata > 0 ? ` strata ${fmtC(pdfAdditionalStrata)}` : ''}${pdfAdditionalCouncil > 0 ? ` council ${fmtC(pdfAdditionalCouncil)}` : ''} from Operations</div>` : ''}</div>
  <div class="summary-box"><div class="label">Loan Interest (annual)</div><div class="value">${fmtC(interestDeduction)}</div>${interestSource ? `<div class="note">${interestSource}</div>` : ''}</div>
  <div class="summary-box"><div class="label">Depreciation</div><div class="value">${depreciation > 0 ? fmtC(depreciation) : 'Not set'}</div></div>
</div>

<div class="summary-grid">
  <div class="summary-box">
    <div class="label">Net Rental Income / (Loss)</div>
    <div class="value" style="color:${taxableIncome >= 0 ? '#ea580c' : '#2563eb'}">${taxableIncome < 0 ? '-' : ''}${fmtC(taxableIncome)}</div>
    <span class="badge ${taxableIncome < 0 ? 'neg' : 'pos'}">${taxableIncome < 0 ? 'Negatively Geared' : 'Positively Geared'}</span>
  </div>
  ${fin?.marginalTaxRate ? `<div class="summary-box">
    <div class="label">Tax ${taxableIncome < 0 ? 'Benefit' : 'Liability'} @ ${(fin.marginalTaxRate * 100).toFixed(0)}%</div>
    <div class="value" style="color:${taxableIncome < 0 ? '#16a34a' : '#dc2626'}">${fmtC(Math.abs(taxableIncome * fin.marginalTaxRate))}</div>
  </div>` : ''}
</div>

${warnings.length > 0 ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px 12px;margin:12px 0">
  <div style="font-weight:bold;font-size:11px;color:#92400e;margin-bottom:4px">Action Required</div>
  <ul style="margin:0;padding-left:18px;font-size:10px;color:#78350f">
    ${warnings.map(w => `<li>${w}</li>`).join('')}
  </ul>
</div>` : ''}

<h2>Rental Income</h2>
<table style="${tableStyle}">
<tr><th style="${thStyle}">Date</th><th style="${thStyle}">Category</th><th style="${thStyle}">Description</th><th style="${thStyle};text-align:right">Amount</th></tr>
${incomeItems.map(t => `<tr><td style="${tdStyle}">${fmtD(t.date)}</td><td style="${tdStyle}">${t.category || '—'}</td><td style="${tdStyle}">${t.description}</td><td style="${tdRight}">${fmtC(t.amount)}</td></tr>`).join('')}
<tr style="${totalRow}"><td style="${tdStyle}" colspan="3">Total Income</td><td style="${tdRight}">${fmtC(totalIncome)}</td></tr>
</table>

<h2>Deductible Expenses</h2>
<table style="${tableStyle}">
<tr><th style="${thStyle}">Date</th><th style="${thStyle}">Category</th><th style="${thStyle}">Description</th><th style="${thStyle};text-align:right">Amount</th></tr>
${expenseItems.map(t => `<tr><td style="${tdStyle}">${fmtD(t.date)}</td><td style="${tdStyle}">${t.category || '—'}</td><td style="${tdStyle}">${t.description}</td><td style="${tdRight}">${fmtC(t.amount)}</td></tr>`).join('')}
<tr style="${totalRow}"><td style="${tdStyle}" colspan="3">Total Expenses</td><td style="${tdRight}">${fmtC(totalExpenses)}</td></tr>
</table>

<h2>Expense Summary by Category</h2>
<table style="${tableStyle}">
<tr><th style="${thStyle}">Category</th><th style="${thStyle};text-align:right">Amount</th></tr>
${Array.from(catMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([cat, amt]) => `<tr><td style="${tdStyle}">${cat}</td><td style="${tdRight}">${fmtC(amt)}</td></tr>`).join('')}
<tr style="${totalRow}"><td style="${tdStyle}">Total</td><td style="${tdRight}">${fmtC(totalExpenses)}</td></tr>
</table>

<h2>Loan Details</h2>
${mortgage?.loans && mortgage.loans.length > 0 ? `<table style="${tableStyle}">
<tr><th style="${thStyle}">Account</th><th style="${thStyle}">Lender</th><th style="${thStyle};text-align:right">Rate</th><th style="${thStyle};text-align:right">Balance</th><th style="${thStyle};text-align:right">Annual Interest</th><th style="${thStyle}">Source</th></tr>
${mortgage.loans.map(l => {
    let lInt = '—'; let lSrc = '';
    if (l.payments && l.payments.length > 0 && l.payments.some(p => p.interest > 0)) {
        const avg = l.payments.reduce((s, p) => s + p.interest, 0) / l.payments.length;
        lInt = fmtC(avg * 12); lSrc = `${l.payments.length} payments`;
    } else if (l.interestRate && l.outstandingBalance) {
        lInt = fmtC((l.interestRate / 100) * l.outstandingBalance); lSrc = 'rate × bal';
    }
    return `<tr><td style="${tdStyle}">${l.accountNumber || '—'}</td><td style="${tdStyle}">${l.lender || '—'}</td><td style="${tdRight}">${l.interestRate ? l.interestRate + '%' : '—'}</td><td style="${tdRight}">${l.outstandingBalance ? fmtC(l.outstandingBalance) : '—'}</td><td style="${tdRight}">${lInt}</td><td style="${tdStyle};font-size:9px;color:#64748b">${lSrc}</td></tr>`;
}).join('')}
</table>` : '<p style="color:#64748b">No loan data recorded.</p>'}
${mortgage?.offsetBalance ? `<p style="font-size:10px;color:#64748b">Offset balance: ${fmtC(mortgage.offsetBalance)} — interest charged by bank is already reduced by offset, so deductible interest reflects the actual (lower) amount paid.</p>` : ''}

${pdfAdditionalStrata > 0 ? `<h2>Strata / Body Corporate</h2>
<table style="${tableStyle}">
<tr><th style="${thStyle}">Year</th><th style="${thStyle};text-align:right">Amount Due</th><th style="${thStyle};text-align:right">Amount Paid</th><th style="${thStyle}">Due Date</th></tr>
${(pdfOps?.serviceCharges || []).map(sc => `<tr><td style="${tdStyle}">${sc.year}</td><td style="${tdRight}">${fmtC(sc.amountDue)}</td><td style="${tdRight}">${fmtC(sc.amountPaid)}</td><td style="${tdStyle}">${fmtD(sc.dueDate)}</td></tr>`).join('')}
<tr style="${totalRow}"><td style="${tdStyle}">Total</td><td style="${tdRight}"></td><td style="${tdRight}">${fmtC(pdfStrataTotal)}</td><td style="${tdStyle}"></td></tr>
</table>
<p class="note">Included as deductible expense (Body Corporate). Not duplicated from transaction expenses.</p>` : ''}

${pdfAdditionalCouncil > 0 ? `<h2>Council Rates</h2>
<table style="${tableStyle}">
<tr><th style="${thStyle}">Year</th><th style="${thStyle};text-align:right">Amount Due</th><th style="${thStyle};text-align:right">Amount Paid</th><th style="${thStyle}">Due Date</th><th style="${thStyle}">Paid by Tenant</th></tr>
${(pdfOps?.councilTax || []).map(ct => `<tr><td style="${tdStyle}">${ct.year}</td><td style="${tdRight}">${fmtC(ct.amountDue)}</td><td style="${tdRight}">${fmtC(ct.amountPaid)}</td><td style="${tdStyle}">${fmtD(ct.dueDate)}</td><td style="${tdStyle}">${ct.paidByTenant ? 'Yes' : 'No'}</td></tr>`).join('')}
<tr style="${totalRow}"><td style="${tdStyle}">Owner-paid Total</td><td style="${tdRight}"></td><td style="${tdRight}">${fmtC(pdfCouncilTotal)}</td><td style="${tdStyle}" colspan="2"></td></tr>
</table>` : ''}

${depreciation > 0 || fin?.buildYear ? `<h2>Depreciation</h2>
<p>Annual depreciation (from QS report): <b>${depreciation > 0 ? fmtC(depreciation) : 'Not set'}</b></p>
${fin?.buildYear ? `<p>Build year: ${fin.buildYear}${fin.buildYear >= 1987 ? ' (Div 43 eligible)' : ' (pre-1987 — Div 43 may not apply)'}</p>` : ''}` : ''}

<h2>Property Details</h2>
<table style="${tableStyle}">
${[
    ['Purchase Price', fin?.purchasePrice ? fmtC(fin.purchasePrice) : '—'],
    ['Purchase Date', fmtD(fin?.purchaseDate)],
    ['Estimated Value', fin?.estimatedValue ? fmtC(fin.estimatedValue) : '—'],
    ['Valuation Date', fmtD(fin?.estimatedValueDate)],
].map(([k, v]) => `<tr><td style="${tdStyle};width:40%;color:#64748b">${k}</td><td style="${tdStyle};font-weight:500">${v}</td></tr>`).join('')}
</table>

<p class="note">This report is generated from data entered into the property dashboard. Figures are estimates only and should be verified by your accountant. Interest figures may be estimated from loan rates where payment breakdowns are unavailable.</p>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.write(html);
        w.document.close();
        // Slight delay to let styles render before print dialog
        setTimeout(() => w.print(), 300);
    }
}

// ─── Editable valuation inline form ──────────────────────────────
const ValuationForm: React.FC<{
    property: PropertyInfo;
    symbol: string;
    onSave: (property: PropertyInfo) => void;
}> = ({ property, symbol, onSave }) => {
    const fin = property.financials;
    const [purchasePrice, setPurchasePrice] = useState(fin?.purchasePrice?.toString() || '');
    const [purchaseDate, setPurchaseDate] = useState(fin?.purchaseDate || '');
    const [estimatedValue, setEstimatedValue] = useState(fin?.estimatedValue?.toString() || '');
    const [estimatedValueDate, setEstimatedValueDate] = useState(fin?.estimatedValueDate || '');
    const [annualDepreciation, setAnnualDepreciation] = useState(fin?.annualDepreciation?.toString() || '');
    const [marginalTaxRate, setMarginalTaxRate] = useState(fin?.marginalTaxRate ? (fin.marginalTaxRate * 100).toString() : '');
    const [buildYear, setBuildYear] = useState(fin?.buildYear?.toString() || '');
    const [open, setOpen] = useState(false);

    const handleSave = () => {
        onSave({
            ...property,
            financials: {
                ...property.financials,
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
                purchaseDate: purchaseDate || undefined,
                estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
                estimatedValueDate: estimatedValueDate || undefined,
                annualDepreciation: annualDepreciation ? parseFloat(annualDepreciation) : undefined,
                marginalTaxRate: marginalTaxRate ? parseFloat(marginalTaxRate) / 100 : undefined,
                buildYear: buildYear ? parseInt(buildYear) : undefined,
            },
        });
        setOpen(false);
    };

    if (!open) {
        const hasValues = fin?.purchasePrice || fin?.estimatedValue;
        return (
            <button
                onClick={() => setOpen(true)}
                className="text-xs text-brand-primary dark:text-brand-secondary hover:underline"
            >
                {hasValues ? 'Edit valuation & tax' : '+ Add property valuation to unlock all metrics'}
            </button>
        );
    }

    return (
        <div className="p-3 rounded-lg border border-brand-primary/30 dark:border-brand-secondary/30 bg-slate-50 dark:bg-slate-800/50 space-y-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Valuation</p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Purchase Price ({symbol})</label>
                    <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Purchase Date</label>
                    <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Estimated Value ({symbol})</label>
                    <input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Valuation Date</label>
                    <input type="date" value={estimatedValueDate} onChange={e => setEstimatedValueDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider pt-2">Tax & Depreciation</p>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Annual Depreciation ({symbol})</label>
                    <input type="number" value={annualDepreciation} onChange={e => setAnnualDepreciation(e.target.value)} placeholder="From QS report" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Marginal Tax Rate (%)</label>
                    <input type="number" value={marginalTaxRate} onChange={e => setMarginalTaxRate(e.target.value)} placeholder="e.g. 37" min="0" max="100" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Build Year</label>
                    <input type="number" value={buildYear} onChange={e => setBuildYear(e.target.value)} placeholder="e.g. 2005" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500">Depreciation = Div 40 (plant) + Div 43 (building) from your quantity surveyor schedule. Build year shown for reference (Div 43 applies to buildings after 1987).</p>
            <div className="flex gap-2 justify-end">
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded-md bg-brand-primary text-white font-semibold hover:bg-opacity-90">Save</button>
            </div>
        </div>
    );
};

// ─── KPI Card ────────────────────────────────────────────────────
const KpiCard: React.FC<{
    label: string;
    value: string;
    subtext?: string;
    colorClass?: string;
    dimmed?: boolean;
}> = ({ label, value, subtext, colorClass = 'text-slate-900 dark:text-white', dimmed }) => (
    <div className={`bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 ${dimmed ? 'opacity-40' : ''}`}>
        <p className="text-[11px] text-slate-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-xl font-bold font-mono mt-0.5 ${colorClass}`}>{value}</p>
        {subtext && <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">{subtext}</p>}
    </div>
);

// ─── Waterfall bar ───────────────────────────────────────────────
const WaterfallRow: React.FC<{
    label: string;
    amount: number;
    maxAmount: number;
    color: string;
    symbol: string;
    isTotal?: boolean;
}> = ({ label, amount, maxAmount, color, symbol, isTotal }) => {
    const pct = maxAmount > 0 ? Math.min(100, (Math.abs(amount) / maxAmount) * 100) : 0;
    const formatted = `${amount < 0 ? '-' : ''}${symbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return (
        <div className={`flex items-center gap-3 ${isTotal ? 'pt-2 border-t border-slate-200 dark:border-slate-700' : ''}`}>
            <span className={`text-xs w-24 flex-shrink-0 ${isTotal ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400'}`}>{label}</span>
            <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-mono w-24 text-right flex-shrink-0 ${isTotal ? 'font-bold' : ''} ${amount >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-red-600 dark:text-red-400'}`}>{formatted}</span>
        </div>
    );
};

// ─── Equity gauge ────────────────────────────────────────────────
const EquityGauge: React.FC<{
    offsetBalance: number;
    netDebt: number;
    equity: number;
    symbol: string;
    propertyValue: number;
}> = ({ offsetBalance, netDebt, equity, symbol, propertyValue }) => {
    if (propertyValue <= 0) return null;
    const offsetPct = (offsetBalance / propertyValue) * 100;
    const debtPct = (netDebt / propertyValue) * 100;
    const equityPct = (equity / propertyValue) * 100;
    const fmt = (n: number) => `${symbol}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Property Value Breakdown</p>
            <div className="h-7 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
                {offsetBalance > 0 && (
                    <div className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${offsetPct}%` }} title={`Offset: ${fmt(offsetBalance)}`}>
                        {offsetPct > 8 && 'Offset'}
                    </div>
                )}
                {netDebt > 0 && (
                    <div className="bg-red-400 dark:bg-red-500 h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${debtPct}%` }} title={`Net Debt: ${fmt(netDebt)}`}>
                        {debtPct > 8 && 'Debt'}
                    </div>
                )}
                {equity > 0 && (
                    <div className="bg-blue-400 dark:bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${equityPct}%` }} title={`Equity: ${fmt(equity)}`}>
                        {equityPct > 8 && 'Equity'}
                    </div>
                )}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-gray-400">
                <div className="flex items-center gap-3">
                    {offsetBalance > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Offset {fmt(offsetBalance)}</span>}
                    {netDebt > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Debt {fmt(netDebt)}</span>}
                    {equity > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Equity {fmt(equity)}</span>}
                </div>
                <span className="font-medium">{fmt(propertyValue)}</span>
            </div>
        </div>
    );
};

// ─── Monthly cash flow chart (pure SVG) ──────────────────────────
interface MonthBucket {
    key: string;      // "2024-07"
    label: string;    // "Jul 24"
    income: number;
    expenses: number;
    net: number;
    projected?: boolean; // current or future month — extrapolated from completed months
}

function buildMonthBuckets(
    transactions: { date?: string; amount: number; type: 'income' | 'expense' }[],
    selectedFY: number | null,
): MonthBucket[] {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
        if (!t.date) continue;
        const d = new Date(t.date);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = map.get(key) || { income: 0, expenses: 0 };
        if (t.type === 'income') bucket.income += t.amount;
        else bucket.expenses += t.amount;
        map.set(key, bucket);
    }

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Use selected FY or auto-detect current FY (month < 6 = Jan-Jun = previous year's FY)
    const fy = selectedFY ?? (now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear());

    // Build 12-month skeleton: Jul of FY year → Jun of FY+1
    const months: MonthBucket[] = [];
    for (let i = 0; i < 12; i++) {
        const month = (6 + i) % 12; // 6=Jul, 7=Aug, ..., 11=Dec, 0=Jan, ..., 5=Jun
        const year = month >= 6 ? fy : fy + 1;
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = new Date(year, month).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
        const data = map.get(key);
        // Current month and future months are all projected
        const isProjected = key >= currentKey;

        months.push({
            key, label,
            income: data?.income || 0, expenses: data?.expenses || 0,
            net: (data?.income || 0) - (data?.expenses || 0),
            projected: isProjected,
        });
    }

    // Extrapolate projected months (current + future) from average of completed months
    const completedMonths = months.filter(m => !m.projected && (m.income > 0 || m.expenses > 0));
    if (completedMonths.length > 0) {
        const avgIncome = completedMonths.reduce((s, m) => s + m.income, 0) / completedMonths.length;
        const avgExpenses = completedMonths.reduce((s, m) => s + m.expenses, 0) / completedMonths.length;
        for (const m of months) {
            if (m.projected) {
                m.income = avgIncome;
                m.expenses = avgExpenses;
                m.net = avgIncome - avgExpenses;
            }
        }
    }

    return months;
}

const MonthlyCashFlowChart: React.FC<{ buckets: MonthBucket[]; symbol: string }> = ({ buckets, symbol }) => {
    if (buckets.length < 2) return null;

    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    const maxVal = Math.max(...buckets.flatMap(b => [b.income, b.expenses, Math.abs(b.net)]));
    if (maxVal === 0) return null;

    const W = 600;
    const H = 200;
    const padLeft = 0;
    const padBottom = 24;
    const chartH = H - padBottom;
    const barGroupW = (W - padLeft) / buckets.length;
    const barW = Math.min(barGroupW * 0.35, 20);
    const gap = 2;

    const scale = (v: number) => (v / maxVal) * (chartH - 10);

    // Net line points
    const netPoints = buckets.map((b, i) => {
        const x = padLeft + barGroupW * i + barGroupW / 2;
        const y = chartH - scale(b.net) - (b.net < 0 ? 0 : 0);
        // For negative net, we need to handle it differently
        const clampedY = Math.max(2, Math.min(chartH - 2, chartH - scale(b.net)));
        return { x, y: clampedY };
    });
    const linePath = netPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const fmt = (n: number) => `${symbol}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    const hasProjected = buckets.some(b => b.projected);
    const firstProjectedIdx = buckets.findIndex(b => b.projected);

    // Split net line into actual (solid) and projected (dashed) segments
    const actualLinePath = netPoints
        .filter((_, i) => !buckets[i].projected)
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
    const projectedLinePath = firstProjectedIdx > 0
        ? [netPoints[firstProjectedIdx - 1], ...netPoints.filter((_, i) => buckets[i].projected)]
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')
        : netPoints.filter((_, i) => buckets[i].projected)
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Monthly Cash Flow</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Income</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Expenses</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 rounded" /> Net</span>
                    {hasProjected && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 dark:bg-slate-500 rounded" style={{ borderTop: '1px dashed' }} /> Projected</span>}
                </div>
            </div>

            {/* Tooltip — fixed height to prevent layout jump */}
            <div className="h-5 text-xs text-slate-600 dark:text-gray-300 flex gap-4">
                {hoveredIdx !== null && (<>
                    <span className="font-semibold">{buckets[hoveredIdx].label}{buckets[hoveredIdx].projected ? ' (projected)' : ''}</span>
                    <span className="text-green-600 dark:text-green-400">In: {fmt(buckets[hoveredIdx].income)}</span>
                    <span className="text-orange-600 dark:text-orange-400">Out: {fmt(buckets[hoveredIdx].expenses)}</span>
                    <span className={buckets[hoveredIdx].net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                        Net: {buckets[hoveredIdx].net >= 0 ? '' : '-'}{fmt(buckets[hoveredIdx].net)}
                    </span>
                </>)}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-4/5 mx-auto" preserveAspectRatio="xMidYMid meet">
                {/* Zero line */}
                <line x1={padLeft} y1={chartH} x2={W} y2={chartH} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={1} />

                {/* Divider between actual and projected */}
                {firstProjectedIdx > 0 && (
                    <line
                        x1={padLeft + barGroupW * firstProjectedIdx}
                        y1={0}
                        x2={padLeft + barGroupW * firstProjectedIdx}
                        y2={chartH}
                        stroke="currentColor"
                        className="text-slate-300 dark:text-slate-600"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                    />
                )}

                {/* Bars */}
                {buckets.map((b, i) => {
                    const cx = padLeft + barGroupW * i + barGroupW / 2;
                    const incomeH = scale(b.income);
                    const expenseH = scale(b.expenses);
                    const isProjected = !!b.projected;
                    return (
                        <g key={b.key}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            className="cursor-pointer"
                            opacity={isProjected ? 0.35 : 1}
                        >
                            {/* Hover zone */}
                            <rect x={padLeft + barGroupW * i} y={0} width={barGroupW} height={H} fill="transparent" />

                            {/* Hover highlight */}
                            {hoveredIdx === i && (
                                <rect x={padLeft + barGroupW * i} y={0} width={barGroupW} height={chartH} fill="currentColor" className="text-slate-100 dark:text-slate-700/30" opacity={1} />
                            )}

                            {/* Income bar */}
                            {incomeH > 0 && (
                                <rect
                                    x={cx - barW - gap / 2}
                                    y={chartH - incomeH}
                                    width={barW}
                                    height={incomeH}
                                    rx={2}
                                    className="fill-green-500"
                                    strokeDasharray={isProjected ? '4 2' : undefined}
                                    stroke={isProjected ? '#22c55e' : undefined}
                                    strokeWidth={isProjected ? 1 : 0}
                                />
                            )}
                            {/* Expense bar */}
                            {expenseH > 0 && (
                                <rect
                                    x={cx + gap / 2}
                                    y={chartH - expenseH}
                                    width={barW}
                                    height={expenseH}
                                    rx={2}
                                    className="fill-orange-400"
                                    strokeDasharray={isProjected ? '4 2' : undefined}
                                    stroke={isProjected ? '#fb923c' : undefined}
                                    strokeWidth={isProjected ? 1 : 0}
                                />
                            )}

                            {/* Month label */}
                            <text
                                x={cx}
                                y={H - 4}
                                textAnchor="middle"
                                className={isProjected ? 'fill-slate-300 dark:fill-gray-600' : 'fill-slate-400 dark:fill-gray-500'}
                                fontSize={barGroupW > 45 ? 9 : 7}
                            >
                                {b.label}
                            </text>
                        </g>
                    );
                })}

                {/* Net cash flow line — actual */}
                {actualLinePath && (
                    <path d={actualLinePath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                )}
                {/* Net cash flow line — projected (dashed) */}
                {projectedLinePath && (
                    <path d={projectedLinePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 4" opacity={0.5} />
                )}
                {/* Net dots */}
                {netPoints.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredIdx === i ? 4 : 2.5}
                        fill={buckets[i].projected ? 'transparent' : '#3b82f6'}
                        stroke={buckets[i].projected ? '#3b82f6' : 'white'}
                        strokeWidth={1}
                        strokeDasharray={buckets[i].projected ? '2 2' : undefined}
                        opacity={buckets[i].projected ? 0.5 : 1}
                    />
                ))}
            </svg>
        </div>
    );
};

// ─── Main component ──────────────────────────────────────────────
const FinancialHealthSection: React.FC<FinancialHealthSectionProps> = ({ property, onSave }) => {
    const [annualised, setAnnualised] = useState(true);
    const [selectedFY, setSelectedFY] = useState<number | null>(null);

    const currency = property.financials?.currency || 'AUD';
    const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';

    const availableFYs = useMemo(() => getAvailableFYs(property.financials?.transactions || []), [property.financials?.transactions]);

    // Filter transactions by selected FY
    const filteredTransactions = useMemo(
        () => filterByFY(property.financials?.transactions || [], selectedFY),
        [property.financials?.transactions, selectedFY]
    );

    const handleExportCSV = useCallback(() => {
        const fyLabel = selectedFY !== null ? getFYLabel(selectedFY) : 'All Time';
        const csv = generateTaxCSV(property, filteredTransactions, fyLabel, selectedFY);
        const safeName = property.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fySuffix = selectedFY !== null ? `_FY${selectedFY}_${selectedFY + 1}` : '_AllTime';
        downloadCSV(csv, `Tax_Report_${safeName}${fySuffix}.csv`);
    }, [property, filteredTransactions, selectedFY]);

    const handleExportPDF = useCallback(() => {
        const fyLabel = selectedFY !== null ? getFYLabel(selectedFY) : 'All Time';
        generateTaxPDF(property, filteredTransactions, fyLabel, selectedFY);
    }, [property, filteredTransactions, selectedFY]);

    const metrics = useMemo(() => {
        const txns = filteredTransactions;
        const mortgage = property.mortgage;
        const fin = property.financials;

        // Calculate income/expense totals from transactions
        const incomeItems = txns.filter(t => t.type === 'income');
        const expenseItems = txns.filter(t => t.type === 'expense');
        const rawIncome = incomeItems.reduce((sum, t) => sum + t.amount, 0);
        const rawExpenses = expenseItems.reduce((sum, t) => sum + t.amount, 0);

        // Work out annualisation factor from transaction date range
        let annualisationFactor = 1;
        if (txns.length >= 2) {
            const dates = txns.filter(t => t.date).map(t => new Date(t.date!).getTime()).filter(d => !isNaN(d));
            if (dates.length >= 2) {
                const minDate = Math.min(...dates);
                const maxDate = Math.max(...dates);
                const spanDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
                if (spanDays > 0) {
                    annualisationFactor = 365 / spanDays;
                }
            }
        }

        // Strata / Body Corporate & Council from Operations (if not already in transactions)
        // These are annual figures — do NOT annualise them
        // Filter by FY when a FY is selected (charges have a `year` field = calendar year)
        const opsCharges = property.operations?.leaseholdCharges;
        let opsStrata = 0;
        let opsCouncil = 0;
        // AU FY 2024/25 = Jul 2024 – Jun 2025. Charges with year=2024 or year=2025 could fall in this FY.
        // Match charges whose dueDate falls within the FY range, or whose year overlaps with the FY.
        const fyRange = selectedFY !== null ? getFYRange(selectedFY) : null;
        const inFY = (dueDate?: string, year?: number): boolean => {
            if (!fyRange) return true; // no FY filter = include all
            if (dueDate && dueDate >= fyRange.start && dueDate <= fyRange.end) return true;
            // Fallback: check if the charge year overlaps with the FY
            if (year !== undefined && selectedFY !== null) return year === selectedFY || year === selectedFY + 1;
            return !fyRange; // include if no FY filter
        };
        if (opsCharges?.serviceCharges && !expenseItems.some(t => t.category === 'Body Corporate')) {
            for (const sc of opsCharges.serviceCharges) {
                if (inFY(sc.dueDate, sc.year)) opsStrata += sc.amountPaid || sc.amountDue;
            }
        }
        if (opsCharges?.councilTax && !expenseItems.some(t => t.category === 'Council Rates')) {
            for (const ct of opsCharges.councilTax) {
                if (!ct.paidByTenant && inFY(ct.dueDate, ct.year)) opsCouncil += ct.amountPaid || ct.amountDue;
            }
        }
        const opsTotal = opsStrata + opsCouncil; // already annual amounts

        const income = annualised ? rawIncome * annualisationFactor : rawIncome;
        const txnExpenses = annualised ? rawExpenses * annualisationFactor : rawExpenses;
        // Operations charges are already annual — add them directly (not annualised)
        const expenses = txnExpenses + (annualised ? opsTotal : opsTotal);
        const noi = income - expenses;

        // Mortgage repayments (annual) & interest extraction
        let annualMortgage = 0;
        let annualInterest = 0;
        let hasInterestBreakdown = false;

        if (mortgage?.loans && mortgage.loans.length > 0) {
            annualMortgage = mortgage.loans.reduce((sum, loan) => {
                if (loan.repaymentAmount) return sum + loan.repaymentAmount * 12;
                if (loan.payments && loan.payments.length > 0) {
                    const avg = loan.payments.reduce((s, p) => s + p.amount, 0) / loan.payments.length;
                    return sum + avg * 12;
                }
                return sum;
            }, 0);
            // Extract interest from payment history if available
            for (const loan of mortgage.loans) {
                if (loan.payments && loan.payments.length > 0 && loan.payments.some(p => p.interest > 0)) {
                    hasInterestBreakdown = true;
                    const avgInterest = loan.payments.reduce((s, p) => s + p.interest, 0) / loan.payments.length;
                    annualInterest += avgInterest * 12;
                } else if (loan.interestRate && loan.outstandingBalance) {
                    // Estimate interest from rate × balance (offset already reduces what bank charges)
                    hasInterestBreakdown = true;
                    annualInterest += (loan.interestRate / 100) * loan.outstandingBalance;
                }
            }
        } else if (mortgage?.payments && mortgage.payments.length > 0) {
            const avg = mortgage.payments.reduce((s, p) => s + p.amount, 0) / mortgage.payments.length;
            annualMortgage = avg * 12;
            if (mortgage.payments.some(p => p.interest > 0)) {
                hasInterestBreakdown = true;
                const avgInterest = mortgage.payments.reduce((s, p) => s + p.interest, 0) / mortgage.payments.length;
                annualInterest = avgInterest * 12;
            }
        }

        // If no interest breakdown available, estimate from rate if possible
        if (!hasInterestBreakdown && mortgage?.loans) {
            for (const loan of mortgage.loans) {
                if (loan.interestRate && loan.outstandingBalance) {
                    hasInterestBreakdown = true;
                    annualInterest += (loan.interestRate / 100) * loan.outstandingBalance;
                }
            }
        }

        const mortgageCost = annualised ? annualMortgage : annualMortgage / 12;
        const interestCost = annualised ? annualInterest : annualInterest / 12;

        const cashFlow = noi - mortgageCost;

        // Debt & equity
        const totalDebt = mortgage?.totalDebt
            || mortgage?.loans?.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0)
            || mortgage?.outstandingBalance
            || 0;
        const offsetBalance = mortgage?.offsetBalance || 0;
        const netExposure = mortgage?.netExposure ?? (totalDebt - offsetBalance);

        const estimatedValue = fin?.estimatedValue || 0;
        const purchasePrice = fin?.purchasePrice || 0;

        // Yields & ratios (require estimatedValue)
        const grossYield = estimatedValue > 0 ? ((annualised ? income : rawIncome * annualisationFactor) / estimatedValue) * 100 : null;
        const netYield = estimatedValue > 0 ? ((annualised ? noi : (rawIncome - rawExpenses) * annualisationFactor) / estimatedValue) * 100 : null;
        const lvr = estimatedValue > 0 ? (netExposure / estimatedValue) * 100 : null;
        const equity = estimatedValue > 0 ? estimatedValue - netExposure : null;
        const capitalGain = (estimatedValue > 0 && purchasePrice > 0) ? estimatedValue - purchasePrice : null;
        const capitalGainPct = (capitalGain !== null && purchasePrice > 0) ? (capitalGain / purchasePrice) * 100 : null;

        // ─── Tax & Depreciation ──────────────────────────────
        const marginalTaxRate = fin?.marginalTaxRate || 0;
        const annualDepreciation = fin?.annualDepreciation || 0;
        const depreciation = annualised ? annualDepreciation : annualDepreciation / 12;

        // Deductible interest: actual interest paid (already reduced by offset — bank charges less)
        // If no interest breakdown, fall back to total mortgage cost as conservative estimate
        const deductibleInterest = hasInterestBreakdown ? interestCost : mortgageCost;

        // Taxable property income = rent - operating expenses - interest - depreciation
        // Note: principal repayments are NOT deductible, only interest
        const taxablePropertyIncome = income - expenses - deductibleInterest - depreciation;

        // Gearing status
        type GearingStatus = 'negative' | 'positive' | 'neutral';
        let gearingStatus: GearingStatus = 'neutral';
        const hasTaxData = txns.length > 0 && (annualMortgage > 0 || annualDepreciation > 0);
        if (hasTaxData) {
            if (taxablePropertyIncome < -50) gearingStatus = 'negative';
            else if (taxablePropertyIncome > 50) gearingStatus = 'positive';
        }

        // Tax effect: negative gearing = tax benefit; positive gearing = tax liability
        const taxEffect = hasTaxData && marginalTaxRate > 0 ? -taxablePropertyIncome * marginalTaxRate : 0;
        // After-tax cash flow = pre-tax cash flow + tax benefit (or - tax liability)
        const afterTaxCashFlow = cashFlow + taxEffect;
        const afterTaxYield = estimatedValue > 0 && hasTaxData && marginalTaxRate > 0
            ? ((annualised ? afterTaxCashFlow : afterTaxCashFlow * annualisationFactor) / estimatedValue) * 100
            : null;

        return {
            income, expenses, noi, mortgageCost, interestCost, cashFlow,
            totalDebt, offsetBalance, netExposure, estimatedValue, purchasePrice,
            grossYield, netYield, lvr, equity, capitalGain, capitalGainPct,
            annualisationFactor, hasTransactions: txns.length > 0,
            // Expense breakdown
            txnExpenses, opsStrata, opsCouncil,
            // Tax
            marginalTaxRate, depreciation, annualDepreciation, deductibleInterest,
            taxablePropertyIncome, gearingStatus, taxEffect, afterTaxCashFlow, afterTaxYield,
            hasTaxData, hasInterestBreakdown,
        };
    }, [property, annualised, filteredTransactions, selectedFY]);

    const fmt = (n: number) => `${symbol}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const fmtSigned = (n: number) => `${n < 0 ? '-' : ''}${fmt(n)}`;
    const period = annualised ? '/yr' : 'total';

    const yieldColor = (y: number | null) => {
        if (y === null) return 'text-slate-400 dark:text-gray-500';
        if (y >= 5) return 'text-green-600 dark:text-green-400';
        if (y >= 3) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };
    const lvrColor = (l: number | null) => {
        if (l === null) return 'text-slate-400 dark:text-gray-500';
        if (l <= 60) return 'text-green-600 dark:text-green-400';
        if (l <= 80) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };
    const cashFlowColor = metrics.cashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const afterTaxColor = metrics.afterTaxCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

    const gearingBadge = {
        negative: { label: 'Negatively Geared', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', icon: '−' },
        positive: { label: 'Positively Geared', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300', icon: '+' },
        neutral: { label: 'Neutral', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', icon: '=' },
    }[metrics.gearingStatus];

    const maxWaterfall = Math.max(metrics.income, metrics.expenses, metrics.mortgageCost, Math.abs(metrics.cashFlow), metrics.depreciation, Math.abs(metrics.afterTaxCashFlow));

    const monthBuckets = useMemo(() => {
        return buildMonthBuckets(filteredTransactions, selectedFY);
    }, [filteredTransactions, selectedFY]);

    return (
        <div className="space-y-6">
            {/* Toggle + FY + Export + Valuation */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                        <button
                            onClick={() => setAnnualised(true)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${annualised ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >Annualised</button>
                        <button
                            onClick={() => setAnnualised(false)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${!annualised ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >Total to Date</button>
                    </div>
                    {availableFYs.length > 0 && (
                        <select
                            value={selectedFY ?? ''}
                            onChange={e => setSelectedFY(e.target.value ? parseInt(e.target.value) : null)}
                            className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                        >
                            <option value="">All FYs</option>
                            {availableFYs.map(fy => (
                                <option key={fy} value={fy}>{getFYLabel(fy)}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-300 dark:border-slate-600"
                        title="Export tax report as CSV spreadsheet"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-300 dark:border-slate-600"
                        title="Print / save as PDF tax report"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m0 0a48.99 48.99 0 0 1 10.5 0m-10.5 0V4.875c0-.621.504-1.125 1.125-1.125h8.25c.621 0 1.125.504 1.125 1.125v3.659" /></svg>
                        PDF
                    </button>
                </div>
                <ValuationForm property={property} symbol={symbol} onSave={onSave} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    label={`Cash Flow ${period}`}
                    value={metrics.hasTransactions ? fmtSigned(metrics.cashFlow) : '—'}
                    subtext={metrics.hasTransactions ? `Income ${fmt(metrics.income)} − Expenses ${fmt(metrics.expenses)}${metrics.mortgageCost > 0 ? ` − Mortgage ${fmt(metrics.mortgageCost)}` : ''}` : 'No transactions'}
                    colorClass={metrics.hasTransactions ? cashFlowColor : undefined}
                    dimmed={!metrics.hasTransactions}
                />
                <KpiCard
                    label="Net Yield"
                    value={metrics.netYield !== null ? `${metrics.netYield.toFixed(1)}%` : '—'}
                    subtext={metrics.grossYield !== null ? `Gross ${metrics.grossYield.toFixed(1)}%` : 'Set property value'}
                    colorClass={yieldColor(metrics.netYield)}
                    dimmed={metrics.netYield === null}
                />
                <KpiCard
                    label={metrics.offsetBalance > 0 ? 'LVR (net of offset)' : 'LVR'}
                    value={metrics.lvr !== null ? `${metrics.lvr.toFixed(1)}%` : '—'}
                    subtext={metrics.lvr !== null ? `${fmt(metrics.netExposure)} / ${fmt(metrics.estimatedValue)}${metrics.offsetBalance > 0 ? ` (${fmt(metrics.offsetBalance)} offset)` : ''}` : metrics.totalDebt > 0 ? 'Set property value' : 'No mortgage'}
                    colorClass={lvrColor(metrics.lvr)}
                    dimmed={metrics.lvr === null}
                />
                <KpiCard
                    label="Equity"
                    value={metrics.equity !== null ? fmt(metrics.equity) : '—'}
                    subtext={metrics.capitalGain !== null ? `Capital ${metrics.capitalGain >= 0 ? '+' : ''}${fmt(metrics.capitalGain)} (${metrics.capitalGainPct!.toFixed(1)}%)` : metrics.estimatedValue > 0 ? 'Add purchase price for gain' : 'Set property value'}
                    colorClass={metrics.equity !== null ? (metrics.equity >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400') : undefined}
                    dimmed={metrics.equity === null}
                />
            </div>

            {/* Tax Position */}
            {metrics.hasTaxData && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Tax Position</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${gearingBadge.color}`}>
                            {gearingBadge.icon} {gearingBadge.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard
                            label={`Taxable Income ${period}`}
                            value={fmtSigned(metrics.taxablePropertyIncome)}
                            subtext={metrics.gearingStatus === 'negative' ? 'Loss offsets other income' : metrics.gearingStatus === 'positive' ? 'Added to taxable income' : ''}
                            colorClass={metrics.taxablePropertyIncome >= 0 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}
                        />
                        <KpiCard
                            label={metrics.taxEffect >= 0 ? `Tax Benefit ${period}` : `Tax Liability ${period}`}
                            value={metrics.marginalTaxRate > 0 ? fmtSigned(metrics.taxEffect) : '—'}
                            subtext={metrics.marginalTaxRate > 0 ? `@ ${(metrics.marginalTaxRate * 100).toFixed(0)}% marginal rate` : 'Set marginal tax rate'}
                            colorClass={metrics.taxEffect >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                            dimmed={metrics.marginalTaxRate === 0}
                        />
                        <KpiCard
                            label={`After-Tax Cash Flow ${period}`}
                            value={metrics.marginalTaxRate > 0 ? fmtSigned(metrics.afterTaxCashFlow) : '—'}
                            subtext={metrics.marginalTaxRate > 0 ? `Pre-tax ${fmtSigned(metrics.cashFlow)} + tax ${fmtSigned(metrics.taxEffect)}` : 'Set marginal tax rate'}
                            colorClass={metrics.marginalTaxRate > 0 ? afterTaxColor : undefined}
                            dimmed={metrics.marginalTaxRate === 0}
                        />
                        <KpiCard
                            label="After-Tax Yield"
                            value={metrics.afterTaxYield !== null ? `${metrics.afterTaxYield.toFixed(1)}%` : '—'}
                            subtext={metrics.netYield !== null ? `Pre-tax yield ${metrics.netYield.toFixed(1)}%` : 'Set property value & tax rate'}
                            colorClass={yieldColor(metrics.afterTaxYield)}
                            dimmed={metrics.afterTaxYield === null}
                        />
                    </div>

                    {/* Deduction breakdown */}
                    <div className="text-[10px] text-slate-400 dark:text-gray-500 space-y-0.5">
                        <p>Deductions: Operating expenses {fmt(metrics.expenses)}{metrics.opsStrata > 0 ? ` (incl. strata ${fmt(metrics.opsStrata)})` : ''}{metrics.opsCouncil > 0 ? ` (incl. council ${fmt(metrics.opsCouncil)})` : ''} + Interest {fmt(metrics.deductibleInterest)}{metrics.hasInterestBreakdown ? ' (from payment history)' : ' (est. from total repayments)'}{metrics.depreciation > 0 ? ` + Depreciation ${fmt(metrics.depreciation)}` : ''}</p>
                        {metrics.offsetBalance > 0 && <p>Note: Interest already reflects offset — bank charges interest on loan minus offset balance, so deductible interest is the actual (reduced) amount paid.</p>}
                    </div>
                </div>
            )}

            {/* Cash flow waterfall */}
            {metrics.hasTransactions && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Cash Flow Breakdown {period}</p>
                    <div className="space-y-2">
                        <WaterfallRow label="Rental Income" amount={metrics.income} maxAmount={maxWaterfall} color="bg-green-500" symbol={symbol} />
                        <WaterfallRow label="Expenses" amount={-metrics.expenses} maxAmount={maxWaterfall} color="bg-orange-400" symbol={symbol} />
                        <WaterfallRow label="NOI" amount={metrics.noi} maxAmount={maxWaterfall} color={metrics.noi >= 0 ? 'bg-green-400' : 'bg-red-400'} symbol={symbol} isTotal />
                        {metrics.mortgageCost > 0 && (
                            <WaterfallRow label="Mortgage" amount={-metrics.mortgageCost} maxAmount={maxWaterfall} color="bg-red-500" symbol={symbol} />
                        )}
                        <WaterfallRow
                            label="Pre-tax CF"
                            amount={metrics.cashFlow}
                            maxAmount={maxWaterfall}
                            color={metrics.cashFlow >= 0 ? 'bg-green-600' : 'bg-red-600'}
                            symbol={symbol}
                            isTotal={metrics.mortgageCost > 0}
                        />
                        {metrics.hasTaxData && metrics.depreciation > 0 && (
                            <WaterfallRow label="Depreciation" amount={-metrics.depreciation} maxAmount={maxWaterfall} color="bg-purple-400" symbol={symbol} />
                        )}
                        {metrics.hasTaxData && metrics.marginalTaxRate > 0 && (
                            <>
                                <WaterfallRow
                                    label={metrics.taxEffect >= 0 ? 'Tax Benefit' : 'Tax Liability'}
                                    amount={metrics.taxEffect}
                                    maxAmount={maxWaterfall}
                                    color={metrics.taxEffect >= 0 ? 'bg-blue-400' : 'bg-red-400'}
                                    symbol={symbol}
                                />
                                <WaterfallRow
                                    label="After-tax CF"
                                    amount={metrics.afterTaxCashFlow}
                                    maxAmount={maxWaterfall}
                                    color={metrics.afterTaxCashFlow >= 0 ? 'bg-green-700' : 'bg-red-700'}
                                    symbol={symbol}
                                    isTotal
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Monthly chart */}
            <MonthlyCashFlowChart buckets={monthBuckets} symbol={symbol} />

            {/* Equity gauge */}
            {metrics.estimatedValue > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-5">
                    <EquityGauge
                        offsetBalance={metrics.offsetBalance}
                        netDebt={metrics.netExposure}
                        equity={metrics.equity || 0}
                        symbol={symbol}
                        propertyValue={metrics.estimatedValue}
                    />
                </div>
            )}

            {/* Quick summary table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Summary</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {[
                        { label: `Rental Income ${period}`, value: metrics.hasTransactions ? fmt(metrics.income) : '—' },
                        { label: `Operating Expenses ${period}`, value: metrics.hasTransactions ? fmt(metrics.expenses) : '—', subtext: (metrics.opsStrata > 0 || metrics.opsCouncil > 0) ? `Txns ${fmt(metrics.txnExpenses)}${metrics.opsStrata > 0 ? ` + Strata ${fmt(metrics.opsStrata)}` : ''}${metrics.opsCouncil > 0 ? ` + Council ${fmt(metrics.opsCouncil)}` : ''}` : undefined },
                        { label: `Net Operating Income ${period}`, value: metrics.hasTransactions ? fmtSigned(metrics.noi) : '—', bold: true },
                        ...(metrics.mortgageCost > 0 ? [{ label: `Mortgage Repayments ${period}`, value: fmt(metrics.mortgageCost) }] : []),
                        ...(metrics.hasTransactions ? [{ label: `Pre-tax Cash Flow ${period}`, value: fmtSigned(metrics.cashFlow), bold: true }] : []),
                        // Tax section
                        ...(metrics.hasTaxData ? [
                            { label: '', value: '', divider: true },
                            ...(metrics.interestCost > 0 ? [{ label: `Deductible Interest ${period}`, value: fmt(metrics.deductibleInterest) }] : []),
                            ...(metrics.depreciation > 0 ? [{ label: `Depreciation ${period}`, value: fmt(metrics.depreciation) }] : []),
                            { label: `Taxable Property Income ${period}`, value: fmtSigned(metrics.taxablePropertyIncome), bold: true },
                            ...(metrics.marginalTaxRate > 0 ? [
                                { label: `Tax Effect @ ${(metrics.marginalTaxRate * 100).toFixed(0)}%`, value: `${metrics.taxEffect >= 0 ? '+' : ''}${fmtSigned(metrics.taxEffect)}` },
                                { label: `After-tax Cash Flow ${period}`, value: fmtSigned(metrics.afterTaxCashFlow), bold: true },
                            ] : []),
                        ] : []),
                        { label: '', value: '', divider: true },
                        { label: 'Purchase Price', value: metrics.purchasePrice > 0 ? fmt(metrics.purchasePrice) : '—' },
                        { label: 'Estimated Value', value: metrics.estimatedValue > 0 ? fmt(metrics.estimatedValue) : '—' },
                        ...(metrics.capitalGain !== null ? [{ label: 'Capital Gain/Loss', value: `${metrics.capitalGain >= 0 ? '+' : ''}${fmt(metrics.capitalGain)} (${metrics.capitalGainPct!.toFixed(1)}%)` }] : []),
                        { label: '', value: '', divider: true },
                        { label: 'Total Debt', value: metrics.totalDebt > 0 ? fmt(metrics.totalDebt) : '—' },
                        ...(metrics.offsetBalance > 0 ? [{ label: 'Offset Balance', value: fmt(metrics.offsetBalance) }] : []),
                        { label: 'Net Exposure', value: metrics.netExposure > 0 ? fmt(metrics.netExposure) : '—' },
                        ...(metrics.lvr !== null ? [{ label: 'LVR', value: `${metrics.lvr.toFixed(1)}%` }] : []),
                        ...(metrics.equity !== null ? [{ label: 'Equity', value: fmt(metrics.equity), bold: true }] : []),
                        { label: '', value: '', divider: true },
                        ...(metrics.grossYield !== null ? [{ label: 'Gross Yield', value: `${metrics.grossYield.toFixed(2)}%` }] : []),
                        ...(metrics.netYield !== null ? [{ label: 'Net Yield', value: `${metrics.netYield.toFixed(2)}%` }] : []),
                        ...(metrics.afterTaxYield !== null ? [{ label: 'After-tax Yield', value: `${metrics.afterTaxYield.toFixed(2)}%`, bold: true }] : []),
                    ].filter(r => !r.divider || true).map((row, i) =>
                        row.divider ? (
                            <div key={i} className="h-0" />
                        ) : (
                            <div key={i} className="flex justify-between px-5 py-2">
                                <div>
                                    <span className={`text-slate-500 dark:text-gray-400 ${row.bold ? 'font-semibold text-slate-700 dark:text-gray-200' : ''}`}>{row.label}</span>
                                    {row.subtext && <p className="text-[10px] text-slate-400 dark:text-gray-500">{row.subtext}</p>}
                                </div>
                                <span className={`font-mono ${row.bold ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-gray-300'}`}>{row.value}</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthSection;
