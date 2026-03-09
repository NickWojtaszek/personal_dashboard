import React, { useState, useMemo } from 'react';
import type { DueDateItem } from './dateUtils';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CalendarViewProps {
    dueDates: DueDateItem[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ dueDates }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, DueDateItem[]>();
        dueDates.forEach(item => {
            const dateKey = item.date.slice(0, 10); // YYYY-MM-DD
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)?.push(item);
        });
        return map;
    }, [dueDates]);

    // Month view handlers
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToPrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    // Year view handlers
    const goToNextYear = () => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    const goToPrevYear = () => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));

    const renderMonthHeader = () => {
        const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
        return (
            <div className="flex justify-between items-center px-2 py-3">
                <button onClick={goToPrevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ChevronLeftIcon /></button>
                <h2 className="font-semibold text-lg">{dateFormat.format(currentDate)}</h2>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ChevronRightIcon /></button>
            </div>
        );
    };

    const renderDaysOfWeek = (short = false) => {
        const days = short ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="grid grid-cols-7">
                {days.map((day, index) => (
                    <div className="text-center text-xs font-medium text-slate-500 dark:text-gray-400 py-2" key={`${day}-${index}`}>{day}</div>
                ))}
            </div>
        );
    };

    const renderMonthCells = () => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

        const rows = [];
        let days = [];
        let day = new Date(startDate);
        const today = new Date();
        today.setHours(0,0,0,0);

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const dayKey = day.toISOString().slice(0, 10);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.getTime() === today.getTime();
                const events = eventsByDate.get(dayKey) || [];

                days.push(
                    <div className={`p-2 h-32 border-t border-l border-slate-100 dark:border-slate-700/50 flex flex-col ${!isCurrentMonth ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`} key={day.toString()}>
                        <span className={`text-sm font-semibold ${isToday ? 'bg-brand-primary text-white rounded-full w-7 h-7 flex items-center justify-center' : ''} ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                            {day.getDate()}
                        </span>
                        <div className="flex-grow overflow-y-auto mt-1 text-xs space-y-1">
                            {events.map(event => (
                                <div key={event.id + event.subType} className="flex items-start gap-1 p-1 rounded-md" title={`${event.subType}: ${event.sourceName}`}>
                                    <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${ event.type === 'Property' ? 'bg-sky-500' : event.type === 'Insurance' ? 'bg-green-500' : event.type === 'Vehicle' ? 'bg-orange-500' : 'bg-purple-500' }`}></span>
                                    <p className="leading-tight text-slate-700 dark:text-gray-300 truncate">{event.subType}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                day.setDate(day.getDate() + 1);
            }
            rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
            days = [];
        }
        return <div>{rows}</div>;
    };

    const renderYearHeader = () => (
        <div className="flex justify-between items-center px-2 py-3">
            <button onClick={goToPrevYear} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ChevronLeftIcon /></button>
            <h2 className="font-semibold text-lg">{currentDate.getFullYear()}</h2>
            <button onClick={goToNextYear} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ChevronRightIcon /></button>
        </div>
    );
    
    const renderMonthInYear = (monthIndex: number) => {
        const year = currentDate.getFullYear();
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));
    
        const cells = [];
        let day = new Date(startDate);
        const today = new Date();
        today.setHours(0,0,0,0);
    
        while (day <= endDate) {
            const dayKey = day.toISOString().slice(0, 10);
            const isCurrentMonth = day.getMonth() === monthIndex;
            const isToday = day.getTime() === today.getTime();
            const events = eventsByDate.get(dayKey) || [];
            const hasEvents = events.length > 0;
            const tooltipText = hasEvents 
                ? events.map(e => `• ${e.subType}: ${e.sourceName}`).join('\n') 
                : '';
    
            cells.push(
                <div 
                    key={day.toString()}
                    onMouseEnter={(e) => {
                        if (hasEvents) {
                            setTooltip({ content: tooltipText, x: e.pageX, y: e.pageY });
                        }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onMouseMove={(e) => {
                        if (tooltip) {
                            setTooltip(t => t ? { ...t, x: e.pageX, y: e.pageY } : null);
                        }
                    }}
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${
                        isCurrentMonth ? '' : 'text-slate-400 dark:text-slate-500'
                    } ${
                        hasEvents && isCurrentMonth ? 'bg-brand-primary/20 dark:bg-brand-secondary/30 font-bold cursor-help' : ''
                    } ${
                        isToday ? 'bg-brand-primary text-white' : ''
                    }`}>
                    {isCurrentMonth ? day.getDate() : ''}
                </div>
            );
            day.setDate(day.getDate() + 1);
        }
    
        return (
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <h3 className="font-semibold text-center text-sm mb-2">{new Intl.DateTimeFormat('en-US', { month: 'long' }).format(monthStart)}</h3>
                {renderDaysOfWeek(true)}
                <div className="grid grid-cols-7 gap-y-1 place-items-center">
                    {cells}
                </div>
            </div>
        );
    };

    const renderYearView = () => (
        <>
            {renderYearHeader()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i}>
                        {renderMonthInYear(i)}
                    </div>
                ))}
            </div>
        </>
    );

    const renderMonthView = () => (
        <>
            {renderMonthHeader()}
            {renderDaysOfWeek()}
            {renderMonthCells()}
        </>
    );

    const ViewToggleButton: React.FC<{ view: 'month' | 'year'; children: React.ReactNode }> = ({ view, children }) => (
        <button
            onClick={() => setViewMode(view)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === view ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            {tooltip && (
                <div
                    className="fixed z-50 p-3 text-sm bg-slate-900 text-white dark:bg-slate-700 dark:text-gray-200 rounded-lg shadow-xl pointer-events-none whitespace-pre-wrap max-w-xs"
                    style={{
                        top: tooltip.y + 15,
                        left: tooltip.x + 15,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-xl font-bold flex items-center gap-3"><CalendarIcon /> Calendar View</h2>
                <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                    <ViewToggleButton view="month">Month</ViewToggleButton>
                    <ViewToggleButton view="year">Year</ViewToggleButton>
                </div>
            </div>
            <div className="p-2">
                {viewMode === 'month' ? renderMonthView() : renderYearView()}
            </div>
        </div>
    );
};

export default CalendarView;
