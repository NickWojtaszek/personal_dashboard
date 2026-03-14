import React from 'react';
import type { ReportData } from '../ReportGenerator';
import type { PersonalInfo } from '../../../types';
import { useTranslations } from '../../../context/LanguageContext';

interface InvoiceProps {
    reportData: ReportData;
    personalInfo: Partial<PersonalInfo>;
    reportDate: Date;
}

// Simple number to words converter for Polish
function amountToWords(amount: number): string {
    const units = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
    const teens = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
    const tens = ["", "dziesięć", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
    const hundreds = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];
    const thousands = [
        { one: "tysiąc", few: "tysiące", many: "tysięcy" },
        { one: "milion", few: "miliony", many: "milionów" },
    ];

    function convert(n: number): string {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`;
        if (n < 1000) return `${hundreds[Math.floor(n / 100)]} ${convert(n % 100)}`;
        return '';
    }

    let words = [];
    let num = Math.floor(amount);

    if (num === 0) words.push("zero");
    
    for (let i = 0; num > 0; i++) {
        let chunk = num % 1000;
        if (chunk > 0) {
            let chunkWords = convert(chunk);
            if (i > 0) {
                let form;
                if (chunk === 1) form = thousands[i - 1].one;
                else if ([2, 3, 4].includes(chunk % 10) && ![12, 13, 14].includes(chunk % 100)) form = thousands[i-1].few;
                else form = thousands[i-1].many;
                words.unshift(`${chunkWords} ${form}`);
            } else {
                words.unshift(chunkWords);
            }
        }
        num = Math.floor(num / 1000);
    }

    const zlotyPart = words.join(' ').trim();
    const grosz = Math.round((amount * 100) % 100);

    return `${zlotyPart} zł ${grosz}/100`;
}

const Invoice: React.FC<InvoiceProps> = ({ reportData, personalInfo, reportDate }) => {
    const { t } = useTranslations();
    const safeDate = reportDate || new Date();
    const monthName = safeDate.toLocaleString('pl', { month: 'long' }).toUpperCase();
    const year = safeDate.getFullYear();
    const today = new Date().toLocaleDateString('pl-PL');

    const nameParts = personalInfo.fullName?.trim().split(' ') || [];
    const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.5 }}>
            <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                <p>Warszawa, dnia {today}</p>
            </div>
             <div style={{ margin: '20px 0', lineHeight: 2 }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li>• <strong>NAZWISKO:</strong> {lastName}</li>
                    <li>• <strong>IMIĘ (imiona):</strong> {firstName}</li>
                    <li>• <strong>NR PESEL:</strong> {personalInfo.pesel}</li>
                    <li>• <strong>Miejscowość (kod pocztowy):</strong> {personalInfo.addressCity}</li>
                    <li>• <strong>Ulica (nr domu i mieszkania):</strong> {personalInfo.addressStreet}</li>
                    <li>• <strong>Województwo/gmina/dzielnica:</strong> {personalInfo.addressProvince}</li>
                    <li>• <strong>Adres mailowy:</strong> {personalInfo.email}</li>
                    <li>• <strong>Nr telefonu:</strong> {personalInfo.phone}</li>
                    <li>• <strong>Urząd Skarbowy:</strong> {personalInfo.taxOffice}</li>
                </ul>
            </div>

            <div style={{ fontWeight: 'bold', margin: '30px 0', fontSize: '14pt', textAlign: 'center' }}>
                <p>RACHUNEK DO UMOWY ZLECENIA nr {personalInfo.contractNumber}</p>
                <p>MIESIĄC {monthName} {year}</p>
            </div>

             <div style={{ margin: '20px 0' }}>
                <p>dla UCK WUM, ul. Banacha 1a, 02-097 Warszawa,</p>
                <p style={{ marginTop: '10px' }}>za wykonywanie zadań:</p>
                <p><strong>{personalInfo.specialty?.toUpperCase()}</strong></p>
            </div>

            <div style={{ margin: '30px 0' }}>
                 <p><strong>Kwota złotych {reportData.totalAmount.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł brutto</strong></p>
                 <p>(słownie złotych: {amountToWords(reportData.totalAmount)})</p>
            </div>

            <div style={{ marginTop: '80px', textAlign: 'center' }}>
                {personalInfo.signatureImage ? (
                    <div>
                        <img src={personalInfo.signatureImage} alt="Podpis" style={{ maxHeight: '120px', maxWidth: '300px', margin: '0 auto', display: 'block' }} />
                    </div>
                ) : (
                    <>
                        <p>{personalInfo.fullName}</p>
                        <p>{personalInfo.specialty?.toUpperCase()}</p>
                        <p>{personalInfo.licenseNumber}</p>
                    </>
                )}
            </div>

            <div style={{ margin: '30px 0' }}>
                <p>Wynagrodzenie proszę wypłacić przelewem na rachunek bankowy nr:</p>
                <p style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '10px' }}>{personalInfo.bankAccount}</p>
            </div>
        </div>
    );
};

export default Invoice;
