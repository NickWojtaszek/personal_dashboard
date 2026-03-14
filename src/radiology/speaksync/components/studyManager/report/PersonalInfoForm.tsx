import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PersonalInfo } from '../../../types';
import { useTranslations } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { ChevronDownIcon, CheckIcon, TrashIcon } from '../../Icons';

// Validation schema for PersonalInfo
const createPersonalInfoSchema = () => z.object({
    fullName: z.string().min(1, 'Full name is required').min(3, 'Full name must be at least 3 characters'),
    pesel: z.string().regex(/^\d{11}$/, 'PESEL must be exactly 11 digits').or(z.literal('')),
    licenseNumber: z.string().optional(),
    specialty: z.string().optional(),
    department: z.string().optional(),
    contractNumber: z.string().optional(),
    addressStreet: z.string().min(1, 'Street address is required'),
    addressCity: z.string().min(1, 'City is required'),
    addressProvince: z.string().min(1, 'Province is required'),
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
    phone: z.string().regex(/^(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/, 'Invalid phone number format').or(z.literal('')),
    taxOffice: z.string().min(1, 'Tax office is required'),
    bankAccount: z.string().regex(/^[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}$|^\d{26}$/, 'Invalid bank account format (use IBAN format: PL followed by 26 digits)').or(z.literal('')),
}).partial();

interface PersonalInfoFormProps {
    personalInfo: Partial<PersonalInfo>;
    onSave: (info: Partial<PersonalInfo>) => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ personalInfo, onSave }) => {
    const { t } = useTranslations();
    const { currentTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [saved, setSaved] = useState(false);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<Partial<PersonalInfo>>({
        resolver: zodResolver(createPersonalInfoSchema()),
        defaultValues: personalInfo,
        mode: 'onBlur', // Validate on blur for better UX
    });

    useEffect(() => {
        reset(personalInfo);
    }, [personalInfo, reset]);

    const onSubmit = (data: Partial<PersonalInfo>) => {
        onSave(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    
    const fields: (keyof PersonalInfo)[] = [
        'fullName', 'pesel', 'licenseNumber', 'specialty', 'department', 'contractNumber',
        'addressStreet', 'addressCity', 'addressProvince', 'email', 'phone', 
        'taxOffice', 'bankAccount'
    ];

    return (
        <div className="rounded-lg" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full flex justify-between items-center p-4 text-left">
                <h2 className="text-xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>{t('studyManager.reports.personalInfo')}</h2>
                <ChevronDownIcon className={`transform transition-transform`} style={{ color: currentTheme.colors.textPrimary, transform: isCollapsed ? 'rotate(0)' : 'rotate(180deg)' }} />
            </button>
            {!isCollapsed && (
                <form onSubmit={handleSubmit(onSubmit)} className="p-6" style={{ borderTopColor: currentTheme.colors.borderColor, borderTopWidth: '1px' }}>
                    <p className="text-sm mb-4" style={{ color: currentTheme.colors.textSecondary }}>{t('studyManager.reports.personalInfoDesc')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields.map(fieldName => (
                            <div key={fieldName}>
                                <label htmlFor={fieldName} className="block text-xs font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
                                    {t(`studyManager.reports.${fieldName}`)}
                                    {['fullName', 'addressStreet', 'addressCity', 'addressProvince', 'email', 'taxOffice'].includes(fieldName) &&
                                        <span className="text-red-500 ml-1">*</span>
                                    }
                                </label>
                                <input
                                    type={fieldName === 'email' ? 'email' : fieldName === 'phone' ? 'tel' : 'text'}
                                    id={fieldName}
                                    {...register(fieldName)}
                                    className={`w-full p-2 rounded-md text-sm focus:outline-none focus:ring-2 ${
                                        errors[fieldName] ? 'border-red-500 ring-2 ring-red-500' : ''
                                    }`}
                                    style={{
                                        backgroundColor: currentTheme.colors.bgPrimary,
                                        borderColor: errors[fieldName] ? '#ef4444' : currentTheme.colors.borderColor,
                                        borderWidth: '1px',
                                        color: currentTheme.colors.textPrimary,
                                        outlineColor: currentTheme.colors.accentPrimary
                                    }}
                                />
                                {errors[fieldName] && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errors[fieldName]?.message}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Signature Image Upload */}
                    <div className="mt-6 pt-4" style={{ borderTopColor: currentTheme.colors.borderColor, borderTopWidth: '1px' }}>
                        <label className="block text-xs font-medium mb-2" style={{ color: currentTheme.colors.textSecondary }}>
                            {t('studyManager.reports.signatureImage') || 'Signature Image (for invoice)'}
                        </label>
                        {personalInfo.signatureImage ? (
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-md" style={{ backgroundColor: '#fff', border: '1px solid #ccc' }}>
                                    <img src={personalInfo.signatureImage} alt="Signature" style={{ maxHeight: '80px', maxWidth: '250px' }} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onSave({ ...personalInfo, signatureImage: '' })}
                                    className="p-2 rounded-full transition-colors hover:bg-red-500/20"
                                    style={{ color: '#ef4444' }}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => signatureInputRef.current?.click()}
                                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                style={{ backgroundColor: currentTheme.colors.bgPrimary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px', color: currentTheme.colors.textSecondary }}
                            >
                                {t('studyManager.reports.uploadSignature') || 'Upload Signature Image'}
                            </button>
                        )}
                        <input
                            ref={signatureInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    const dataUrl = ev.target?.result as string;
                                    onSave({ ...personalInfo, signatureImage: dataUrl });
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                            }}
                        />
                    </div>

                    <div className="mt-6 flex justify-end items-center gap-4">
                         {saved && <span className="text-sm flex items-center gap-1 animate-fade-in" style={{ color: currentTheme.colors.accentSuccess }}><CheckIcon/> {t('studyManager.reports.infoSaved')}</span>}
                         <button type="submit" className="px-4 py-2 rounded-md font-semibold transition-colors text-white" style={{ backgroundColor: currentTheme.colors.buttonPrimary }}>{t('studyManager.reports.saveInfo')}</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PersonalInfoForm;