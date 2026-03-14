import React, { useState, useMemo } from 'react';
import type { RadiologyCode } from '../../types';
import { useTranslations } from '../../context/LanguageContext';
import { MagnifyingGlassPlusIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon, XCircleIcon } from '../Icons';

interface CodesDictionaryProps {
    codes: RadiologyCode[];
    onSelectCode?: (code: RadiologyCode | null) => void;
    selectedCode?: RadiologyCode | null;
    onUpdateCode?: (code: RadiologyCode) => void;
}

const CodesDictionary: React.FC<CodesDictionaryProps> = ({ codes, onSelectCode, selectedCode, onUpdateCode }) => {
    const { t } = useTranslations();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof RadiologyCode, direction: 'asc' | 'desc' } | null>(null);
    const [editingCode, setEditingCode] = useState<RadiologyCode | null>(null);
    const [editFormData, setEditFormData] = useState<RadiologyCode | null>(null);
    const [isEditPanelCollapsed, setIsEditPanelCollapsed] = useState(true);
    const [saved, setSaved] = useState(false);

    const filteredAndSortedCodes = useMemo(() => {
        let result = [...codes];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(c => 
                c.code.includes(lowerTerm) || 
                c.desc.toLowerCase().includes(lowerTerm) ||
                c.category.toLowerCase().includes(lowerTerm)
            );
        }

        if (sortConfig) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [codes, searchTerm, sortConfig]);

    const requestSort = (key: keyof RadiologyCode) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: keyof RadiologyCode) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline ml-1"/> : <ChevronDownIcon className="h-4 w-4 inline ml-1"/>;
    };

    const handleEditClick = (code: RadiologyCode) => {
        setEditingCode(code);
        setEditFormData({ ...code });
        setIsEditPanelCollapsed(false);
    };

    const handleSaveEdit = () => {
        if (editFormData && onUpdateCode) {
            onUpdateCode(editFormData);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleCancelEdit = () => {
        setEditingCode(null);
        setEditFormData(null);
        setIsEditPanelCollapsed(true);
    };

    const handleEditFormChange = (field: keyof RadiologyCode, value: any) => {
        if (editFormData) {
            setEditFormData({
                ...editFormData,
                [field]: field === 'points' ? parseFloat(value) : value
            });
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 flex-grow min-h-0">
                {/* Left column: main content with header + table */}
                <div className="flex-grow lg:w-2/3 min-w-0 rounded-xl overflow-hidden flex flex-col bg-gray-800/50 border border-gray-700">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                        <h2 className="text-2xl font-bold text-white">{t('studyManager.codesDictionaryTitle')}</h2>
                        <div className="relative w-64">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('templates.searchPlaceholder')}
                                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <MagnifyingGlassPlusIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/80 sticky top-0 backdrop-blur-sm">
                                <tr>
                                    <th onClick={() => requestSort('code')} className="p-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none">{t('studyManager.table.code')} {renderSortIcon('code')}</th>
                                    <th onClick={() => requestSort('desc')} className="p-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none">{t('studyManager.table.description')} {renderSortIcon('desc')}</th>
                                    <th onClick={() => requestSort('points')} className="p-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none">{t('studyManager.table.points')} {renderSortIcon('points')}</th>
                                    <th onClick={() => requestSort('category')} className="p-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none">{t('studyManager.table.category')} {renderSortIcon('category')}</th>
                                    <th className="p-3 text-sm font-semibold text-gray-300 w-16">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedCodes.map(c => (
                                    <tr 
                                        key={c.code} 
                                        onClick={() => onSelectCode?.(c)}
                                        className={`border-b border-gray-700/50 last:border-b-0 transition-colors cursor-pointer ${
                                            selectedCode?.code === c.code 
                                              ? 'bg-blue-900/40 hover:bg-blue-900/60' 
                                              : 'hover:bg-gray-700/30'
                                        }`}
                                    >
                                        <td className="p-3 font-mono text-blue-300 font-bold">{c.code}</td>
                                        <td className="p-3 text-gray-300 text-sm">{c.desc}</td>
                                        <td className="p-3 text-gray-300">{c.points.toFixed(1)}</td>
                                        <td className="p-3 text-gray-400 text-sm">{c.category}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(c);
                                                }}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right column: side panel aligned like ReportSubmissionPage */}
                <div className="lg:w-1/3 min-w-[320px] rounded-xl overflow-hidden flex flex-col bg-gray-800/50 border border-gray-700">
                    {editingCode && editFormData ? (
                        <>
                            <button 
                                onClick={() => setIsEditPanelCollapsed(!isEditPanelCollapsed)} 
                                className="flex justify-between items-center p-4 text-left bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                <h3 className="text-lg font-bold text-white">Edit Code</h3>
                                <ChevronDownIcon className={`h-5 w-5 transform transition-transform ${isEditPanelCollapsed ? '' : 'rotate-180'}`} />
                            </button>
                            {!isEditPanelCollapsed && (
                                <form className="p-6 flex-grow overflow-y-auto space-y-4">
                                    {/* Code Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Code</label>
                                        <input
                                            type="text"
                                            value={editFormData.code}
                                            onChange={(e) => handleEditFormChange('code', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Full Code Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Full Code</label>
                                        <input
                                            type="text"
                                            value={editFormData.fullCode}
                                            onChange={(e) => handleEditFormChange('fullCode', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Description Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                        <textarea
                                            value={editFormData.desc}
                                            onChange={(e) => handleEditFormChange('desc', e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>

                                    {/* Points Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Points</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={editFormData.points}
                                            onChange={(e) => handleEditFormChange('points', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Category Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={editFormData.category}
                                            onChange={(e) => handleEditFormChange('category', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                                        <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckIcon className="h-4 w-4" />
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircleIcon className="h-4 w-4" />
                                            Cancel
                                        </button>
                                    </div>

                                    {saved && (
                                        <div className="flex items-center justify-center gap-2 p-2 bg-green-900/30 border border-green-600 rounded text-green-400 text-sm">
                                            <CheckIcon className="h-4 w-4" />
                                            Saved
                                        </div>
                                    )}
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="p-6 text-sm text-gray-400 h-full">Select a code to edit.</div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default CodesDictionary;
