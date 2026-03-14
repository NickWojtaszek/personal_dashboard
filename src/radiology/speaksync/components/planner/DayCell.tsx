
import React, { useMemo } from 'react';
import type { Study, PlanStatus } from '../../types';
import { CheckIcon } from '../Icons';

interface DayCellProps {
    date: Date;
    studies: Study[];
    planStatus: PlanStatus;
    isSelected: boolean;
    isEditMode: boolean;
    onSelect: () => void;
    onTogglePlan: () => void;
    isCurrentMonth: boolean;
}

const FULL_DAY_QUOTA = 2000;
const HALF_DAY_QUOTA = 1000;

const DayCell: React.FC<DayCellProps> = ({ 
    date, 
    studies, 
    planStatus, 
    isSelected, 
    isEditMode, 
    onSelect, 
    onTogglePlan,
    isCurrentMonth
}) => {
    // 1. Calculate points for this specific day
    const totalPoints = useMemo(() => studies.reduce((sum, s) => sum + s.points, 0), [studies]);
    
    // 2. Determine Quota
    const quota = planStatus === 'full' ? FULL_DAY_QUOTA : planStatus === 'half' ? HALF_DAY_QUOTA : 0;
    
    // 3. Determine Completion Status
    const isCompleted = quota > 0 && totalPoints >= quota;
    const hasStudies = totalPoints > 0;

    // 4. Handle Interaction
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isEditMode) {
            onTogglePlan();
        } else {
            onSelect();
        }
    };

    // 5. Visual Classes construction
    const baseClasses = "relative w-full aspect-square p-2 transition-all duration-200 cursor-pointer group flex flex-col justify-between rounded-xl overflow-hidden";
    
    let appearanceClasses = "";
    let textClasses = "";

    if (!isCurrentMonth) {
        // Previous/Next month days: Dimmed, flatter
        appearanceClasses = "bg-gray-800/20 border border-gray-800/50 hover:border-gray-700";
        textClasses = "text-gray-600";
    } else if (isSelected) {
        // Selected day: Highlighted border, active background
        appearanceClasses = "bg-gray-800 border-2 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.15)] z-10";
        textClasses = "text-white";
    } else {
        // Normal current month day
        appearanceClasses = "bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-750 hover:shadow-lg";
        textClasses = "text-gray-400 group-hover:text-gray-200";
        
        // Completion tint override
        if (isCompleted) {
            appearanceClasses = "bg-green-900/10 border border-green-500/30 hover:border-green-400/50";
        }
    }

    // Top Bar Logic
    // Using z-0 to stay behind content if needed, but container has overflow-hidden
    const planIndicatorClass = `absolute top-0 left-0 h-1.5 transition-all duration-300 ${
        isCompleted ? 'bg-green-500' : 'bg-sky-400'
    }`;

    return (
        <div 
            onClick={handleClick}
            className={`${baseClasses} ${appearanceClasses}`}
        >
            {/* A. The Indicator Bar (Top of Cell) */}
            {planStatus !== 'none' && (
                <div 
                    className={planIndicatorClass} 
                    style={{ width: planStatus === 'full' ? '100%' : '50%' }} 
                />
            )}

            {/* Top Row: Date & Checkmark */}
            <div className="flex justify-between items-start z-10 mt-1">
                <span className={`text-sm font-bold ${textClasses}`}>
                    {date.getDate()}
                </span>
                {isCompleted && <CheckIcon className="h-4 w-4 text-green-400 drop-shadow-sm" />}
            </div>

            {/* Bottom Row: Stats */}
            <div className="flex justify-end items-end z-10">
                {(hasStudies || (isEditMode && planStatus !== 'none')) && (
                    <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                            {hasStudies && (
                                <span className={`font-bold text-xs ${isCompleted ? 'text-green-400' : 'text-gray-300'}`}>
                                    {totalPoints.toFixed(0)}
                                </span>
                            )}
                            {planStatus !== 'none' && (
                                <span className="text-[10px] text-gray-500 font-mono">
                                    / {quota}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Mode Hover Overlay */}
            {isEditMode && isCurrentMonth && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-[1px] text-xs text-white font-bold pointer-events-none transition-opacity z-20">
                    {planStatus === 'none' ? '+1/2 Day' : planStatus === 'half' ? '+Full Day' : 'Clear'}
                </div>
            )}
        </div>
    );
};

export default DayCell;
