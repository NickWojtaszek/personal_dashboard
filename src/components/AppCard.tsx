import React, { forwardRef } from 'react';
import type { AppInfo } from '../types';
import { ICONS, getColorForGroup } from '../constants';
import { EditIcon, GripVerticalIcon } from './Icons';
import Card from './ui/Card';

interface AppCardProps {
    app: AppInfo;
    isAdminMode: boolean;
    onEdit: (app: AppInfo) => void;
    listeners?: any;
    style?: React.CSSProperties;
    isDragging?: boolean;
    [key: string]: any; // Allow other props from dnd-kit
}

const CardContent: React.FC<{ app: AppInfo, isInactive: boolean }> = ({ app, isInactive }) => (
    <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
            <h3 className={`font-semibold transition-colors ${isInactive ? 'text-slate-500 dark:text-gray-400' : 'text-slate-800 dark:text-gray-200 group-hover:text-brand-primary dark:group-hover:text-brand-secondary'}`}>{app.name}</h3>
            <div className={`transition-colors ${isInactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {React.cloneElement(ICONS[app.icon], { className: "w-6 h-6" })}
            </div>
        </div>
        
        <div className="flex-grow mb-4">
            {app.description && <p className="text-slate-600 dark:text-slate-300 text-sm">{app.description}</p>}
        </div>
        
        {app.groups && app.groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                {app.groups.slice(0, 3).map(group => (
                    <span key={group} className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(group)}`}>{group}</span>
                ))}
            </div>
        )}
    </div>
);


const AppCard = forwardRef<HTMLDivElement, AppCardProps>(({ app, isAdminMode, onEdit, listeners, style, isDragging, ...rest }, ref) => {
    const isInactive = app.url === '#';
    const activeClasses = isDragging ? "opacity-70 shadow-2xl scale-105" : "";

    const BaseCard = (
        <Card 
            hoverEffect={!isInactive && !isAdminMode} 
            className={`flex flex-col h-full relative group ${activeClasses}`}
        >
             <CardContent app={app} isInactive={isInactive} />
        </Card>
    );

    if (isAdminMode) {
        return (
            <div ref={ref} style={style} className={`h-full ${activeClasses}`} {...rest}>
                <div className="relative h-full">
                     <Card className="h-full">
                        <div
                            className="absolute top-2 right-2 p-2 cursor-grab touch-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
                            aria-label="Drag to reorder"
                            {...listeners}
                        >
                            <GripVerticalIcon className="w-5 h-5" />
                        </div>
                        <div onClick={() => onEdit(app)} className="cursor-pointer h-full">
                             <CardContent app={app} isInactive={isInactive} />
                        </div>
                        <button
                            onClick={() => onEdit(app)}
                            className="absolute bottom-4 right-4 p-2 rounded-full bg-brand-primary/20 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary/40"
                            aria-label={`Edit ${app.name}`}
                        >
                            <EditIcon/>
                        </button>
                    </Card>
                </div>
            </div>
        );
    }

    if (isInactive) {
        return (
             <div className="h-full">
                  <Card className="h-full">
                    <CardContent app={app} isInactive={isInactive} />
                  </Card>
             </div>
        )
    }

    return (
        <a href={app.url} target="_blank" rel="noopener noreferrer" className="block h-full">
            {BaseCard}
        </a>
    );
});

AppCard.displayName = 'AppCard';

export default AppCard;
