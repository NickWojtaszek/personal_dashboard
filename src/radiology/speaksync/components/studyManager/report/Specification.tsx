import React from 'react';
import type { ReportData } from '../ReportGenerator';
import type { PersonalInfo } from '../../../types';
import { useTranslations } from '../../../context/LanguageContext';

interface SpecificationProps {
    reportData: ReportData;
    personalInfo: Partial<PersonalInfo>;
    reportDate: Date;
}

const Specification: React.FC<SpecificationProps> = ({ reportData, personalInfo, reportDate }) => {
    const { t } = useTranslations();
    const safeDate = reportDate || new Date();
    const monthName = safeDate.toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long' }).toUpperCase();
    const monthNameLower = safeDate.toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long' });
    const year = safeDate.getFullYear();

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: 1.5 }}>
            {/* Top right label */}
            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                <span>Załącznik nr 1</span>
            </div>

            {/* Two-column header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ lineHeight: 1.8 }}>
                    <div><em>Imię i Nazwisko Przyjmującego Zamówienie:</em></div>
                    <div><em>Komórka Organizacyjna:</em></div>
                    <div><em>Umowa nr:</em> {personalInfo.contractNumber}</div>
                    <div><em>na udzielanie świadczeń w zakresie:</em></div>
                    <div><em>Miesiąc:</em> {monthName}</div>
                </div>
                <div style={{ textAlign: 'center', lineHeight: 1.8 }}>
                    <div><strong>Specyfikacja udzielonych świadczeń</strong></div>
                    <div>{personalInfo.fullName}</div>
                    <div>UCK WUM</div>
                    <div><strong>{personalInfo.specialty?.toUpperCase()}</strong></div>
                    <div>{year}</div>
                </div>
            </div>

            {/* Main study list table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: '9pt' }}>
                <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>Kod NFZ</th>
                        <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>Numer badania</th>
                        <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>Data opisu</th>
                    </tr>
                </thead>
                <tbody>
                    {reportData.studies.map(study => (
                         <tr key={study.id}>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{reportData.groupedByCode.find(g => g.code.code === study.code)?.code.fullCode}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{study.patientId}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{new Date(study.date).toLocaleDateString('pl-PL')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary by codes section */}
            <h3 style={{ marginTop: '30px', marginBottom: '15px', fontSize: '10pt', fontWeight: 'bold' }}>Zestawienie według kodów świadczeń:</h3>

            {/* Sub-header with month/name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '9pt' }}>
                <span><strong>{monthNameLower} {year}</strong></span>
                <span><strong>{personalInfo.fullName} UCK WUM</strong></span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                <thead style={{ background: '#f0f0f0' }}>
                     <tr>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold', width: '40px' }}>Lp</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Kod świadczenia</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Zakres świadczeń medycznych</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>Liczba</th>
                    </tr>
                </thead>
                <tbody>
                    {reportData.groupedByCode.map((group, index) => (
                         <tr key={group.code.code}>
                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{group.code.fullCode}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{group.code.desc}</td>
                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{group.count}</td>
                        </tr>
                    ))}
                    <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', paddingRight: '20px' }}>Razem</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{reportData.studies.length}</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer summary lines */}
            <div style={{ marginTop: '20px', fontSize: '10pt', lineHeight: 2 }}>
                <div>Razem liczba godzin/konsultacji: <strong>{reportData.studies.length}</strong></div>
                <div>Stawka za jedną godzinę/konsultację brutto: <strong>według kodów powyżej</strong></div>
                <div>Razem kwota brutto: <strong>{reportData.totalAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</strong></div>
            </div>

            {/* Signature blocks - two columns */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
                {/* Left: Kierownik */}
                <div style={{ width: '45%' }}>
                    <p>Kierownik właściwej komórki organizacyjnej:</p>
                    <p>Potwierdzam wykonanie umowy</p>
                    <div style={{ borderBottom: '1px dotted #000', marginTop: '60px' }}></div>
                    <p style={{ fontSize: '9pt', marginTop: '5px' }}>podpis Kierownika/Oddziałowej komórki organizacyjnej</p>
                </div>

                {/* Right: Zleceniobiorca */}
                <div style={{ width: '45%', textAlign: 'center' }}>
                    {personalInfo.signatureImage && (
                        <div style={{ marginBottom: '5px' }}>
                            <img src={personalInfo.signatureImage} alt="Podpis" style={{ maxHeight: '100px', maxWidth: '250px', margin: '0 auto', display: 'block' }} />
                        </div>
                    )}
                    <p><strong>{personalInfo.fullName}</strong></p>
                    <p>{personalInfo.specialty?.toUpperCase()}</p>
                    <p>{personalInfo.licenseNumber}</p>
                    <div style={{ borderBottom: '1px dotted #000', marginTop: personalInfo.signatureImage ? '10px' : '30px' }}></div>
                    <p style={{ fontSize: '9pt', marginTop: '5px' }}>Czytelny podpis Zleceniobiorcy</p>
                </div>
            </div>

            {/* Bottom: Stwierdzam zgodność */}
            <div style={{ marginTop: '40px', width: '55%' }}>
                <p>Stwierdzam zgodność z umową</p>
                <div style={{ borderBottom: '1px dotted #000', marginTop: '60px', width: '80%' }}></div>
                <p style={{ fontSize: '9pt', marginTop: '5px' }}>podpis pracownika kadr DSPiP</p>
            </div>
        </div>
    );
};

export default Specification;
