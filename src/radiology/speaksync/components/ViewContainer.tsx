import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ViewContainerProps {
    children: React.ReactNode;
    rightPanel?: React.ReactNode;
    leftLabel?: string;
    rightLabel?: string;
}

/**
 * Unified container for all main views to ensure consistent width across the app.
 * Uses planner layout as reference baseline - applies 2/3 to 1/3 split.
 * Left side (2/3): Main content
 * Right side (1/3): Optional right panel content (default empty)
 * Dev-only badges can be toggled with VITE_DEV_BADGES=true
 */
const ViewContainer: React.FC<ViewContainerProps> = ({ children, rightPanel, leftLabel, rightLabel }) => {
    const { currentTheme } = useTheme();
    const showBadges = false;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 p-4">
            <div
                className="relative flex-grow lg:w-2/3 min-w-0 rounded-xl overflow-hidden flex flex-col"
                style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}
            >
                {children}
                {showBadges && leftLabel && (
                    <div className="absolute bottom-1 left-2 px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-700 text-white opacity-80 pointer-events-none">
                        {leftLabel}
                    </div>
                )}
            </div>
            <div
                className="relative lg:w-1/3 min-w-[320px] rounded-xl overflow-hidden flex flex-col"
                style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}
            >
                {rightPanel && (
                    <div className="p-4 h-full overflow-auto flex flex-col">
                        {rightPanel}
                    </div>
                )}
                {showBadges && rightPanel && rightLabel && (
                    <div className="absolute bottom-1 left-2 px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-700 text-white opacity-80 pointer-events-none">
                        {rightLabel}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewContainer;
