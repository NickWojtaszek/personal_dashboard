import React, { forwardRef } from 'react';
import type { ProjectInfo } from '../types';
import { getColorForGroup } from '../constants';

interface ProjectCardProps {
    project: ProjectInfo;
    isAdminMode: boolean;
    onEdit: (project: ProjectInfo) => void;
    listeners?: any;
    style?: React.CSSProperties;
    isDragging?: boolean;
    [key: string]: any;
}

const ClockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);
const ExternalLinkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-4.5 0V6m0 0h3.75m-3.75 0-7.5 7.5" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const GripVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);

const CardContent: React.FC<{ project: ProjectInfo }> = ({ project }) => (
    <div className="flex flex-col p-6 h-full">
        <div className="flex items-start justify-between mb-2">
            <div>
                <h3 className="font-semibold text-slate-800 dark:text-gray-200 group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{project.name}</h3>
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-gray-400 mt-1">
                    <ClockIcon />
                    <span>Updated {project.lastUpdated}</span>
                </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-gray-500">
                {project.url !== '#' && !event?.['shiftKey'] && <ExternalLinkIcon />}
            </div>
        </div>
        
        <div className="flex-grow mb-4">
            {project.description && <p className="text-slate-600 dark:text-slate-300 text-sm">{project.description}</p>}
        </div>
        
        {project.groups && project.groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                {project.groups.slice(0, 3).map(group => (
                    <span key={group} className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(group)}`}>{group}</span>
                ))}
                {project.groups.length > 3 && <span className="text-xs text-slate-500 dark:text-gray-400 self-center">+{project.groups.length - 3} more</span>}
            </div>
        )}
    </div>
);

const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(({ project, isAdminMode, onEdit, listeners, style, isDragging, ...rest }, ref) => {
    const baseClasses = "relative group flex flex-col h-full bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700";
    const draggingClasses = isDragging ? "opacity-70 shadow-2xl scale-105" : "";
    
    const cardContent = <CardContent project={project} />;

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
                <div onClick={() => onEdit(project)} className="cursor-pointer h-full">
                    {cardContent}
                </div>
                <button
                    onClick={() => onEdit(project)}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-brand-primary/20 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary/40"
                    aria-label={`Edit ${project.name}`}
                >
                    <EditIcon/>
                </button>
            </div>
        );
    }

    const hoverClasses = "hover:border-brand-primary dark:hover:border-brand-secondary hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/10 dark:hover:shadow-brand-secondary/10";
    return (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className={`${baseClasses} ${hoverClasses}`}>
            {cardContent}
        </a>
    );
});

ProjectCard.displayName = 'ProjectCard';
export default ProjectCard;