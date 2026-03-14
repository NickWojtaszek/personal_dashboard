import React, { useState, useEffect } from 'react';
import type { RadiologyCode } from '../../types';
import { useTranslations } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useStudy } from '../../context/StudyContext';
import { TrashIcon } from '../Icons';

interface CodeEditFormProps {
  selectedCode: RadiologyCode | null;
  onSelectCode: (code: RadiologyCode | null) => void;
}

const CodeEditForm: React.FC<CodeEditFormProps> = ({ selectedCode, onSelectCode }) => {
  const { t } = useTranslations();
  const { currentTheme } = useTheme();
  const { setRadiologyCodes, radiologyCodes } = useStudy() || { radiologyCodes: [], setRadiologyCodes: () => {} };
  const [formData, setFormData] = useState<Partial<RadiologyCode>>({
    code: '',
    desc: '',
    points: 0,
    category: '',
    fullCode: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (selectedCode) {
      setFormData(selectedCode);
      setIsEditing(true);
    } else {
      setFormData({ code: '', desc: '', points: 0, category: '', fullCode: '' });
      setIsEditing(false);
    }
  }, [selectedCode]);

  const handleInputChange = (field: keyof RadiologyCode, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!formData.code || !formData.desc) {
      alert('Code and Description are required');
      return;
    }

    if (selectedCode) {
      // Update existing code
      const updated = radiologyCodes.map(c =>
        c.code === selectedCode.code
          ? { ...c, ...formData } as RadiologyCode
          : c
      );
      setRadiologyCodes(updated);
    } else {
      // Add new code
      const newCode: RadiologyCode = {
        code: formData.code as string,
        desc: formData.desc as string,
        points: formData.points as number,
        category: formData.category as string,
        fullCode: formData.fullCode as string || (formData.code as string)
      };
      setRadiologyCodes([...radiologyCodes, newCode]);
    }

    handleClear();
  };

  const handleDelete = () => {
    if (!selectedCode) return;
    if (!confirm('Are you sure you want to delete this code?')) return;

    const updated = radiologyCodes.filter(c => c.code !== selectedCode.code);
    setRadiologyCodes(updated);
    handleClear();
  };

  const handleClear = () => {
    onSelectCode(null);
    setFormData({ code: '', desc: '', points: 0, category: '', fullCode: '' });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full gap-4" style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
      <div>
        <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.colors.textPrimary }}>
          {isEditing && selectedCode ? 'Edit Code' : 'Add New Code'}
        </h3>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
            Code *
          </label>
          <input
            type="text"
            value={formData.code || ''}
            onChange={(e) => handleInputChange('code', e.target.value)}
            placeholder="e.g., 088"
            disabled={isEditing && selectedCode}
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: currentTheme.colors.borderColor,
              borderWidth: '1px',
              color: currentTheme.colors.textPrimary
            }}
          />
          {isEditing && <p className="text-xs mt-1" style={{ color: currentTheme.colors.textSecondary }}>Code cannot be changed</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
            Full Code (NFZ) *
          </label>
          <input
            type="text"
            value={formData.fullCode || ''}
            onChange={(e) => handleInputChange('fullCode', e.target.value)}
            placeholder="e.g., 5.03.00.0000088"
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: currentTheme.colors.borderColor,
              borderWidth: '1px',
              color: currentTheme.colors.textPrimary
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
            Description *
          </label>
          <textarea
            value={formData.desc || ''}
            onChange={(e) => handleInputChange('desc', e.target.value)}
            placeholder="Enter code description..."
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 resize-none h-24"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: currentTheme.colors.borderColor,
              borderWidth: '1px',
              color: currentTheme.colors.textPrimary
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
            Points
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.points || 0}
            onChange={(e) => handleInputChange('points', parseFloat(e.target.value))}
            placeholder="0.0"
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: currentTheme.colors.borderColor,
              borderWidth: '1px',
              color: currentTheme.colors.textPrimary
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
            Category
          </label>
          <input
            type="text"
            value={formData.category || ''}
            onChange={(e) => handleInputChange('category', e.target.value)}
            placeholder="e.g., TK Angiografia"
            className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: currentTheme.colors.borderColor,
              borderWidth: '1px',
              color: currentTheme.colors.textPrimary
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2 px-3 rounded font-semibold text-sm hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: '#22c55e',
            color: 'white'
          }}
        >
          {isEditing ? 'Update' : 'Add'}
        </button>
        {isEditing && (
          <button
            onClick={handleDelete}
            className="py-2 px-3 rounded hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: '#ef4444',
              borderWidth: '1px',
              color: '#ef4444'
            }}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleClear}
          className="flex-1 py-2 px-3 rounded font-semibold text-sm hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: currentTheme.colors.bgTertiary,
            borderColor: currentTheme.colors.borderColor,
            borderWidth: '1px',
            color: currentTheme.colors.textPrimary
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default CodeEditForm;
