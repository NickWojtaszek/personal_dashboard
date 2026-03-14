import React from 'react';
import type { ReportData } from '../ReportGenerator';
import { useTranslations } from '../../../context/LanguageContext';

interface SummaryProps {
    reportData: ReportData;
    reportDate: Date;
}

const Summary: React.FC<SummaryProps> = ({ reportData, reportDate }) => {
    const { t } = useTranslations();
    const safeDate = reportDate || new Date();
    const monthName = safeDate.toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long' }).toUpperCase();
    const year = safeDate.getFullYear();

    const mostFrequent = reportData.groupedByCode.length > 0 ? reportData.groupedByCode[0] : null;
    const highestValue = reportData.groupedByCode.length > 0 ? [...reportData.groupedByCode].sort((a,b) => b.totalPoints - a.totalPoints)[0] : null;

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: 1.5 }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Podsumowanie miesięczne - {monthName} {year}</h2>

             <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '5px', marginBottom: '30px', border: '1px solid #ddd' }}>
                <h3 style={{ color: '#2196f3', marginBottom: '15px' }}>Statystyki ogólne</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    <div>📊 Całkowita liczba badań: <strong>{reportData.studies.length}</strong></div>
                    <div>💰 Kwota brutto: <strong>{reportData.totalAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</strong></div>
                    <div>⭐ Średnia wartość badania: <strong>{(reportData.totalAmount / reportData.studies.length).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</strong></div>
                </div>
            </div>

             <h3 style={{ marginBottom: '15px' }}>Rozkład badań według kodów:</h3>
             <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: '9pt' }}>
                <thead style={{ background: '#f0f0f0' }}>
                    <tr>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>Kod</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>Nazwa</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'normal' }}>Liczba</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'normal' }}>Punkty/szt</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'normal' }}>Suma punktów</th>
                    </tr>
                </thead>
                <tbody>
                    {reportData.groupedByCode.map(group => (
                        <tr key={group.code.code}>
                            <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{group.code.code}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{group.code.desc}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{group.count}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>{group.code.points.toFixed(1)}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>{group.totalPoints.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        </tr>
                    ))}
                    <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                        <td colSpan={2} style={{ border: '1px solid #000', padding: '8px' }}>RAZEM</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{reportData.studies.length}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{reportData.totalPoints.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    </tr>
                </tbody>
             </table>

             <div style={{ marginTop: '30px' }}>
                 <div style={{ background: '#f0fff4', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
                    <h4 style={{ color: '#4caf50', marginBottom: '10px' }}>📈 Analiza</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {mostFrequent && <li>• Najczęstszy kod: <strong>{mostFrequent.code.code} ({ (mostFrequent.count / reportData.studies.length * 100).toFixed(1) }%)</strong></li>}
                        {highestValue && <li>• Najwyższa wartość: <strong>{highestValue.code.code} ({ (highestValue.totalPoints / reportData.totalPoints * 100).toFixed(1) }%)</strong></li>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Summary;
