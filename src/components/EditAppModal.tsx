import React, { useState, useEffect, useRef } from 'react';
import type { AppInfo } from '../types';

interface EditAppModalProps {
    app: AppInfo;
    onSave: (app: AppInfo) => void;
    onClose: () => void;
    allGroups: string[];
    onGroupsChange: (groups: string[]) => void;
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);

const EditAppModal: React.FC<EditAppModalProps> = ({ app, onSave, onClose, allGroups, onGroupsChange }) => {
    const [formData, setFormData] = useState(app);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(app.groups || []));
    const [newGroup, setNewGroup] = useState('');
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        setFormData(app);
        setSelectedGroups(new Set(app.groups || []));
    }, [app]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            groups: Array.from(selectedGroups),
        });
    };
    
    const toggleGroup = (group: string) => {
        setSelectedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(group)) {
                newSet.delete(group);
            } else {
                newSet.add(group);
            }
            return newSet;
        });
    };

    const handleAddGroup = () => {
        const trimmedGroup = newGroup.trim();
        if (trimmedGroup && !allGroups.includes(trimmedGroup)) {
            onGroupsChange([...allGroups, trimmedGroup]);
            setSelectedGroups(prev => new Set(prev).add(trimmedGroup));
            setNewGroup('');
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        mouseDownTarget.current = e.target;
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md m-4 border border-slate-200 dark:border-slate-700"
            >
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{app.name ? 'Edit Application' : 'New Application'}</h2>
                        {app.name && <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Update the details for "{app.name}".</p>}
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="appName" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">App Name</label>
                            <input
                                type="text"
                                id="appName"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <div>
                            <label htmlFor="appDescription" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                id="appDescription"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <div>
                            <label htmlFor="appUrl" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">URL</label>
                            <input
                                type="url"
                                id="appUrl"
                                name="url"
                                value={formData.url}
                                onChange={handleInputChange}
                                placeholder="https://example.com"
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">Groups</label>
                            <div className="flex gap-2 mb-3">
                                <input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())} placeholder="Create new group" className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
                                <button type="button" onClick={handleAddGroup} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors flex items-center gap-1"><PlusIcon/> Add</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-40 overflow-y-auto p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                                {allGroups.sort().map(group => (
                                    <label key={group} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedGroups.has(group)} onChange={() => toggleGroup(group)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary" />
                                        <span className="text-sm text-slate-700 dark:text-gray-300">{group}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditAppModal;