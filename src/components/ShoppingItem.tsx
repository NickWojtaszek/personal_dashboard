
import React from 'react';
import type { ShoppingItem } from '../types';
import { getColorForGroup } from '../constants';

interface ShoppingItemRowProps {
    item: ShoppingItem;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (item: ShoppingItem) => void;
    isAdminMode: boolean;
    listeners?: any;
    isDragging?: boolean;
    style?: React.CSSProperties;
}

const GripVerticalIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 0 0-2.09 2.134v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);

const ShoppingItemRow = React.forwardRef<HTMLDivElement, ShoppingItemRowProps>(({ item, onToggle, onDelete, onEdit, isAdminMode, listeners, isDragging, style }, ref) => {
    const opacity = isDragging ? 'opacity-50' : '';
    
    return (
        <div ref={ref} style={style} className={`group flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${opacity}`}>
            <div className="flex items-center gap-4 flex-grow">
                {isAdminMode && (
                    <button {...listeners} className="cursor-grab p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <GripVerticalIcon/>
                    </button>
                )}
                
                <input 
                    type="checkbox" 
                    checked={item.checked} 
                    onChange={() => onToggle(item.id)}
                    className="w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                />
                
                <div className={`flex-grow ${item.checked ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className={`font-medium text-slate-900 dark:text-white ${item.checked ? 'line-through text-slate-500' : ''}`}>
                            {item.name}
                        </span>
                        {item.quantity && (
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                {item.quantity}
                            </span>
                        )}
                    </div>
                    {item.notes && <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{item.notes}</p>}
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(item.category)}`}>
                        {item.category}
                    </span>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                            <PencilIcon />
                        </button>
                        <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                            <TrashIcon />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ShoppingItemRow;
