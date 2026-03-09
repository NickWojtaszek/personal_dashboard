import React, { forwardRef } from 'react';
import type { AppInfo } from '../types';
import { ICONS, getColorForGroup } from '../constants';

interface AppCardProps {
    app: AppInfo;
    isAdminMode: boolean;
    onEdit: (app: AppInfo) => void;
    listeners?: any;
    style?: React.CSSProperties;
    isDragging?: boolean;
    [key: string]: any; // Allow other props from dnd-kit
}

const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const GripVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);


const CardContent: React.FC<{ app: AppInfo, isInactive: boolean }> = ({ app, isInactive }) => (
    <div className="flex flex-col p-6 h-full">
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
    const baseClasses = "relative group flex flex-col h-full bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700";
    const draggingClasses = isDragging ? "opacity-70 shadow-2xl scale-105" : "";
    const cardContent = <CardContent app={app} isInactive={isInactive} />;

    if (isAdminMode) {
        return (
            <div ref={ref} style={style} className={`${baseClasses} ${draggingClasses}`} {...rest}>
                <div
                    className="absolute top-2 right-2 p-2 cursor-grab touch-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
                    aria-label="Drag to reorder"
                    {...listeners}
                >
                    <GripVerticalIcon className="w-5 h-5" />
                </div>
                <div onClick={() => onEdit(app)} className="cursor-pointer h-full">
                    {cardContent}
                </div>
                <button
                    onClick={() => onEdit(app)}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-brand-primary/20 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary/40"
                    aria-label={`Edit ${app.name}`}
                >
                    <EditIcon/>
                </button>
            </div>
        );
    }

    if (isInactive) {
        return (
             <div className={`${baseClasses}`}>
                {cardContent}
             </div>
        )
    }

    const hoverClasses = "hover:border-brand-primary dark:hover:border-brand-secondary hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/10 dark:hover:shadow-brand-secondary/10";
    return (
        <a href={app.url} target="_blank" rel="noopener noreferrer" className={`${baseClasses} ${hoverClasses}`}>
            {cardContent}
        </a>
    );
});

AppCard.displayName = 'AppCard';

export default AppCard;
