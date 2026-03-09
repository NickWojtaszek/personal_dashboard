import React, { forwardRef } from 'react';
import type { PropertyInfo } from '../types';
import { getColorForGroup } from '../constants';

interface PropertyCardProps {
    property: PropertyInfo;
    isAdminMode: boolean;
    onEdit: (property: PropertyInfo) => void;
    onSelect: (id: string) => void;
    listeners?: any;
    style?: React.CSSProperties;
    isDragging?: boolean;
    [key: string]: any;
}

const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const GripVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);

const CardContent: React.FC<{ property: PropertyInfo }> = ({ property }) => (
    <div className="flex flex-col p-6 h-full">
        <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-800 dark:text-gray-200 group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{property.name}</h3>
        </div>
        
        <div className="flex-grow mb-4">
            <p className="text-slate-600 dark:text-slate-300 text-sm">
                {property.overview?.propertyType ? `${property.overview.propertyType} in ` : ''}{property.location}
            </p>
        </div>
        
        {property.groups && property.groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                {property.groups.map(group => (
                    <span key={group} className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(group)}`}>{group}</span>
                ))}
            </div>
        )}
    </div>
);

const PropertyCard = forwardRef<HTMLDivElement, PropertyCardProps>(({ property, isAdminMode, onEdit, onSelect, listeners, style, isDragging, ...rest }, ref) => {
    const baseClasses = "relative group flex flex-col h-full bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700 text-left w-full";
    const draggingClasses = isDragging ? "opacity-70 shadow-2xl scale-105" : "";
    
    const cardContent = <CardContent property={property} />;

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
                <div onClick={() => onSelect(property.id)} className="cursor-pointer h-full">
                    {cardContent}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(property); }}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-brand-primary/20 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary/40"
                    aria-label={`Edit ${property.name}`}
                >
                    <EditIcon/>
                </button>
            </div>
        );
    }

    const hoverClasses = "hover:border-brand-primary dark:hover:border-brand-secondary hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/10 dark:hover:shadow-brand-secondary/10";
    return (
        <button onClick={() => onSelect(property.id)} className={`${baseClasses} ${hoverClasses}`}>
            {cardContent}
        </button>
    );
});

PropertyCard.displayName = 'PropertyCard';
export default PropertyCard;