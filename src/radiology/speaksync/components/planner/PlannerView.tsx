
import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Calendar from './Calendar';
import StudyLogger from './StudyLogger';

const PlannerView: React.FC = () => {
    const { currentTheme } = useTheme();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    return (
        <div className="h-full grid grid-rows-[2fr_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 p-4 animate-fade-in overflow-hidden">
            <div className="min-w-0 rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
                <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </div>
            <div className="min-w-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
                <StudyLogger selectedDate={selectedDate} />
            </div>
        </div>
    );
};

export default PlannerView;
