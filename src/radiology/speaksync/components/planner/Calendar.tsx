
import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';
import { useStudy } from '../../context/StudyContext';
import { useTranslations } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import DayCell from './DayCell';

interface CalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onSelectDate }) => {
    const { t } = useTranslations();
    const { currentTheme } = useTheme();
    const { plannedDays, togglePlannedDay, studies } = useStudy();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isEditMode, setIsEditMode] = useState(false);

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun)
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const monthStats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const monthStudies = studies.filter(s => {
            const d = new Date(s.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Calculate planned points for the month
        let plannedPoints = 0;
        Object.entries(plannedDays).forEach(([dateStr, status]) => {
            const [y, m] = dateStr.split('-').map(Number);
            if (y === year && m === month + 1) {
                if (status === 'half') plannedPoints += 1000;
                else if (status === 'full') plannedPoints += 2000;
            }
        });

        return {
            count: monthStudies.length,
            points: monthStudies.reduce((sum, s) => sum + s.points, 0),
            plannedPoints
        };
    }, [studies, currentMonth, plannedDays]);

    const dayStats = useMemo(() => {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const dayStudies = studies.filter(s => s.date.startsWith(dateStr));
        
        return {
            count: dayStudies.length,
            points: dayStudies.reduce((sum, s) => sum + s.points, 0)
        };
    }, [studies, selectedDate]);

    const renderDays = () => {
        const days = [];
        const totalDays = daysInMonth(currentMonth);
        const startDay = firstDayOfMonth(currentMonth);
        const prevMonthDays = daysInMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

        // Padding for previous month
        for (let i = 0; i < startDay; i++) {
            const prevDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDays - startDay + i + 1);
            days.push(
                <DayCell 
                    key={`prev-${i}`}
                    date={prevDate}
                    studies={[]} // We don't render stats for prev month days in this view to keep it clean
                    planStatus='none'
                    isSelected={false}
                    isEditMode={false} // Disable editing for previous month padding
                    onSelect={() => {}}
                    onTogglePlan={() => {}}
                    isCurrentMonth={false}
                />
            );
        }

        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            const isSelected = selectedDate.getDate() === i && 
                               selectedDate.getMonth() === currentMonth.getMonth() && 
                               selectedDate.getFullYear() === currentMonth.getFullYear();
            
            const dayStudies = studies.filter(s => s.date.startsWith(dateStr));
            const planStatus = plannedDays[dateStr] || 'none';

            days.push(
                <DayCell 
                    key={i}
                    date={date}
                    studies={dayStudies}
                    planStatus={planStatus}
                    isSelected={isSelected}
                    isEditMode={isEditMode}
                    onSelect={() => onSelectDate(date)}
                    onTogglePlan={() => togglePlannedDay(dateStr)}
                    isCurrentMonth={true}
                />
            );
        }

        return days;
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: `${currentTheme.colors.bgSecondary}80` }}>
            <div className="flex items-center justify-between p-4" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px' }}>
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold capitalize" style={{ color: currentTheme.colors.textPrimary }}>
                        {currentMonth.toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="p-1 rounded" style={{ color: currentTheme.colors.textPrimary }}><ChevronLeftIcon className="h-5 w-5"/></button>
                        <button onClick={handleNextMonth} className="p-1 rounded" style={{ color: currentTheme.colors.textPrimary }}><ChevronRightIcon className="h-5 w-5"/></button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Day Stats Box */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm" style={{ borderColor: currentTheme.colors.borderColor, backgroundColor: `${currentTheme.colors.bgPrimary}80` }}>
                        <span className="font-semibold uppercase text-xs tracking-wider" style={{ color: currentTheme.colors.textSecondary }}>
                            {selectedDate.toLocaleDateString(t('langName') === 'Polski' ? 'pl' : 'en-US', { day: 'numeric', month: 'short' })}:
                        </span>
                        <span className="font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                            {dayStats.points.toFixed(0)} <span className="font-normal text-xs" style={{ color: currentTheme.colors.textMuted }}>pts</span>
                        </span>
                        <span style={{ color: currentTheme.colors.textSecondary }}>/</span>
                        <span className="font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                            {dayStats.count} <span className="font-normal text-xs" style={{ color: currentTheme.colors.textMuted }}>st.</span>
                        </span>
                    </div>

                    {/* Month Stats Box */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm" style={{ borderColor: currentTheme.colors.accentPrimary, backgroundColor: `${currentTheme.colors.accentPrimary}20` }}>
                        <span className="font-semibold uppercase text-xs tracking-wider" style={{ color: currentTheme.colors.accentPrimary }}>
                            {currentMonth.toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long' })}:
                        </span>
                        <span className="font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                            {monthStats.points.toFixed(0)} <span className="font-normal text-xs" style={{ color: currentTheme.colors.textSecondary }}>pts</span>
                        </span>
                        <span style={{ color: currentTheme.colors.textSecondary }}>/</span>
                        <span className="font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                            {monthStats.count} <span className="font-normal text-xs" style={{ color: currentTheme.colors.textSecondary }}>st.</span>
                        </span>
                        {monthStats.plannedPoints > 0 && (
                            <>
                                <span style={{ color: currentTheme.colors.textSecondary }}>|</span>
                                <span className="font-semibold uppercase text-xs tracking-wider" style={{ color: currentTheme.colors.accentPrimary }}>
                                    Plan:
                                </span>
                                <span className="font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
                                    {monthStats.plannedPoints.toFixed(0)} <span className="font-normal text-xs" style={{ color: currentTheme.colors.textSecondary }}>pts</span>
                                </span>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="px-3 py-1.5 text-sm rounded-md border transition-colors font-medium"
                        style={{
                            backgroundColor: isEditMode ? '#0ea5e9' : currentTheme.colors.bgTertiary,
                            borderColor: isEditMode ? '#0284c7' : currentTheme.colors.borderColor,
                            color: isEditMode ? '#fff' : currentTheme.colors.textPrimary,
                            boxShadow: isEditMode ? '0_0_10px_rgba(2,132,199,0.5)' : 'none'
                        }}
                    >
                        {isEditMode ? 'Done Planning' : 'Plan Days'}
                    </button>
                </div>
            </div>
            
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 px-2 py-3 border-b text-center text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderBottomColor: currentTheme.colors.borderColor, color: currentTheme.colors.textSecondary }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-max flex-grow overflow-y-auto p-2 gap-1">
                {renderDays()}
            </div>
        </div>
    );
};

export default Calendar;
