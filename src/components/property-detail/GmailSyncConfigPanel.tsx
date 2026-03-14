import React, { useState } from 'react';
import type { GmailSyncConfig, GmailSyncRule, SyncRuleCategory } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, TrashIcon } from './Icons';
import {
  isGmailAuthenticated,
  signInWithGmail,
  signOutGmail,
} from '../../lib/gmail';
import { getCategoryPillColor, CATEGORY_EMPTY } from '../../lib/categoryColors';

interface GmailSyncConfigPanelProps {
  syncConfig: GmailSyncConfig;
  onSave: (config: GmailSyncConfig) => void;
  onSyncNow: (selectedRuleIds?: string[]) => void;
  onFullResync?: () => void;
  onClearGmail?: () => void;
  gmailCount?: number;
  isSyncing: boolean;
  propertyName?: string;
}

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

const GmailSyncConfigPanel: React.FC<GmailSyncConfigPanelProps> = ({
  syncConfig,
  onSave,
  onSyncNow,
  onFullResync,
  onClearGmail,
  gmailCount = 0,
  isSyncing,
  propertyName,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(isGmailAuthenticated());
  const [newQuery, setNewQuery] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [authError, setAuthError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(() => new Set(syncConfig.rules.map(r => r.id)));

  // Auto-select newly added rules, prune deleted ones
  const ruleIdsCsv = syncConfig.rules.map(r => r.id).join(',');
  React.useEffect(() => {
    const currentIds = ruleIdsCsv.split(',').filter(Boolean);
    setSelectedRuleIds((prev: Set<string>) => {
      const next = new Set<string>();
      for (const id of currentIds) {
        if (prev.has(id)) next.add(id);   // preserve existing toggle
        else next.add(id);                 // auto-select new rules
      }
      return next;
    });
  }, [ruleIdsCsv]);

  const tags = syncConfig.tags || [];

  const handleSignIn = async () => {
    try {
      setAuthError('');
      await signInWithGmail();
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const handleSignOut = () => {
    signOutGmail();
    setIsAuthenticated(false);
  };

  // ─── Tag management ───────────────────────────────────────────────

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onSave({ ...syncConfig, tags: [...tags, tag] });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    onSave({
      ...syncConfig,
      tags: tags.filter(t => t !== tag),
      rules: syncConfig.rules.map(r => r.category === tag ? { ...r, category: undefined } : r),
    });
  };

  // ─── Rule management ──────────────────────────────────────────────

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const query = newQuery.trim();
    if (!query) return;

    const rule: GmailSyncRule = {
      id: uuidv4(),
      query,
      label: newLabel.trim() || undefined,
      category: newCategory || undefined,
    };

    onSave({
      ...syncConfig,
      rules: [...syncConfig.rules, rule],
    });
    setNewQuery('');
    setNewLabel('');
    setNewCategory('');
    setShowAddRule(false);
  };

  const handleRemoveRule = (ruleId: string) => {
    onSave({
      ...syncConfig,
      rules: syncConfig.rules.filter(r => r.id !== ruleId),
    });
  };

  const handleUpdateRuleCategory = (ruleId: string, category: SyncRuleCategory | undefined) => {
    onSave({
      ...syncConfig,
      rules: syncConfig.rules.map(r => r.id === ruleId ? { ...r, category } : r),
    });
  };

  const handleToggleAutoSync = () => {
    onSave({ ...syncConfig, autoSync: !syncConfig.autoSync });
  };

  const handleToggleRule = (ruleId: string) => {
    setSelectedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  };

  const handleToggleAll = () => {
    const allIds = syncConfig.rules.map(r => r.id);
    setSelectedRuleIds(prev =>
      prev.size === allIds.length ? new Set<string>() : new Set(allIds)
    );
  };

  const allSelected = selectedRuleIds.size === syncConfig.rules.length;
  const someSelected = selectedRuleIds.size > 0;

  const inputClasses =
    'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition';

  return (
    <div className="space-y-3">
      {/* Auth status — compact row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-slate-400'}`} />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {isAuthenticated ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {isAuthenticated ? (
          <button
            onClick={handleSignOut}
            className="text-xs px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleSignIn}
            className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in
          </button>
        )}
      </div>

      {authError && (
        <p className="text-xs text-red-500 dark:text-red-400">{authError}</p>
      )}

      {/* Tags — inline */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">Tags</span>
          {tags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${getCategoryPillColor(tag)}`}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                title="Remove tag"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddTag} className="flex gap-1.5">
          <input
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="New tag..."
            className={`${inputClasses} flex-1`}
          />
          <button
            type="submit"
            disabled={!newTag.trim()}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Add
          </button>
        </form>
      </div>

      {/* Search Rules — collapsible header */}
      <div>
        <button
          onClick={() => setShowRules(!showRules)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full"
        >
          <ChevronIcon open={showRules} />
          Search Rules
          <span className="text-slate-400 dark:text-slate-500">({syncConfig.rules.length})</span>
        </button>

        {showRules && (
          <div className="mt-2 space-y-1">
            {/* Compact rule rows */}
            {syncConfig.rules.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                {syncConfig.rules.length > 1 && (
                  <button
                    onClick={handleToggleAll}
                    className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-1"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
                {syncConfig.rules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-1.5 py-1 px-2 rounded bg-slate-50 dark:bg-slate-800/50 group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRuleIds.has(rule.id)}
                      onChange={() => handleToggleRule(rule.id)}
                      className="w-3 h-3 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                      title="Include in sync"
                    />
                    <code className="text-[11px] text-blue-600 dark:text-blue-400 truncate flex-1 min-w-0">
                      {rule.query}
                    </code>
                    <select
                      value={rule.category || ''}
                      onChange={e => handleUpdateRuleCategory(rule.id, e.target.value || undefined)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border-0 cursor-pointer outline-none flex-shrink-0 ${
                        rule.category ? getCategoryPillColor(rule.category) : CATEGORY_EMPTY
                      }`}
                    >
                      <option value="">no tag</option>
                      {tags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-0.5 text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add rule — toggle */}
            {showAddRule ? (
              <form onSubmit={handleAddRule} className="mt-2 space-y-1.5 p-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                <input
                  type="text"
                  value={newQuery}
                  onChange={e => setNewQuery(e.target.value)}
                  placeholder={propertyName ? `e.g. "${propertyName}" or from:agent@example.com` : 'Gmail search query...'}
                  className={inputClasses}
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className={`${inputClasses} w-28 flex-shrink-0`}
                  >
                    <option value="">Tag</option>
                    {tags.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className={`${inputClasses} flex-1`}
                  />
                  <button
                    type="submit"
                    disabled={!newQuery.trim()}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddRule(false); setNewQuery(''); setNewLabel(''); setNewCategory(''); }}
                    className="px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddRule(true)}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 transition-colors"
              >
                <PlusIcon /> Add rule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer: auto-sync + sync button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={syncConfig.autoSync}
              onChange={handleToggleAutoSync}
              className="sr-only"
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${syncConfig.autoSync ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${syncConfig.autoSync ? 'translate-x-4' : ''}`} />
            </div>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">Auto-sync</span>
        </label>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {syncConfig.lastSyncedAt
              ? new Date(syncConfig.lastSyncedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Never synced'}
          </span>
          <button
            onClick={() => onSyncNow(someSelected && !allSelected ? Array.from(selectedRuleIds) : undefined)}
            disabled={!isAuthenticated || !someSelected || isSyncing}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"/></svg>
                Sync{!allSelected && someSelected ? ` (${selectedRuleIds.size})` : ''}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full re-sync / Clear Gmail */}
      {gmailCount > 0 && (onFullResync || onClearGmail) && (
        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">{gmailCount} synced email{gmailCount !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            {onFullResync && (
              <button onClick={onFullResync} disabled={isSyncing} className="text-xs px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40">
                Full Re-sync
              </button>
            )}
            {onClearGmail && (
              <button onClick={onClearGmail} className="text-xs px-2 py-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                Clear Gmail
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailSyncConfigPanel;
