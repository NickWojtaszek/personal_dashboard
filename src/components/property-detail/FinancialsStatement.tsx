

import React from 'react';
import type { FinancialTransaction } from '../../types';

interface FinancialsStatementProps {
    transactions?: FinancialTransaction[];
}

const FinancialsStatement: React.FC<FinancialsStatementProps> = ({ transactions = [] }) => {
    
    const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    const totalIncome = sortedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = sortedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '';
        return `£${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No Date';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch(e) {
            return 'Invalid Date';
        }
    }

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 font-semibold text-sm text-slate-600 dark:text-gray-300">
                <div className="col-span-3">Date</div>
                <div className="col-span-5">Details</div>
                <div className="col-span-2 text-right">Money Out</div>
                <div className="col-span-2 text-right">Money In</div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700 min-h-[6rem]">
                {sortedTransactions.length > 0 ? sortedTransactions.map(t => (
                    <div key={t.id} className="grid grid-cols-12 px-4 py-3 text-sm">
                        <div className="col-span-3 text-slate-500 dark:text-gray-400">{formatDate(t.date)}</div>
                        <div className="col-span-5 text-slate-700 dark:text-slate-200">{t.description}</div>
                        <div className="col-span-2 text-right font-mono text-slate-500 dark:text-gray-400">
                            {t.type === 'expense' && formatCurrency(t.amount)}
                        </div>
                        <div className="col-span-2 text-right font-mono text-slate-500 dark:text-gray-400">
                            {t.type === 'income' && formatCurrency(t.amount)}
                        </div>
                    </div>
                )) : (
                     <div className="px-4 py-8 text-center text-slate-500 dark:text-gray-400 col-span-12">
                        No transactions recorded.
                    </div>
                )}
            </div>
             {sortedTransactions.length > 0 && (
                 <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 font-semibold text-sm border-t border-slate-200 dark:border-slate-700">
                    <div className="col-span-8">Total</div>
                    <div className="col-span-2 text-right font-mono text-red-600 dark:text-red-400">
                        {formatCurrency(totalExpenses)}
                    </div>
                    <div className="col-span-2 text-right font-mono text-green-600 dark:text-green-400">
                        {formatCurrency(totalIncome)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialsStatement;