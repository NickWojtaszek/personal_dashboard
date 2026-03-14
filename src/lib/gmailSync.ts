/**
 * Gmail sync engine.
 *
 * Pulls emails matching a property's sync rules, deduplicates against
 * existing correspondence, and returns the merged result.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CorrespondenceItem, GmailSyncConfig, EmailAttachment } from '../types';
import {
  searchMessages,
  getThreads,
  parseGmailMessage,
  isGmailAuthenticated,
  type ParsedEmail,
} from './gmail';

export interface SyncResult {
  correspondence: CorrespondenceItem[];
  syncConfig: GmailSyncConfig;
  newCount: number;
}

/**
 * Build the combined Gmail search query from rules.
 * Multiple rules are OR'd together: (rule1) OR (rule2) OR ...
 * Optionally scoped to emails after lastSyncedAt.
 * If selectedRuleIds is provided, only those rules are included.
 */
function buildQuery(config: GmailSyncConfig, selectedRuleIds?: string[]): string {
  const rules = selectedRuleIds
    ? config.rules.filter(r => selectedRuleIds.includes(r.id))
    : config.rules;
  if (rules.length === 0) return '';

  const ruleQueries = rules.map(r => `(${r.query})`);
  let query = ruleQueries.length === 1 ? ruleQueries[0] : ruleQueries.join(' OR ');

  if (config.lastSyncedAt) {
    // Gmail after: uses YYYY/MM/DD format
    const afterDate = config.lastSyncedAt.split('T')[0].replace(/-/g, '/');
    query = `(${query}) after:${afterDate}`;
  }

  return query;
}

/**
 * Convert a parsed Gmail email into a CorrespondenceItem.
 */
function emailToCorrespondence(email: ParsedEmail): CorrespondenceItem {
  const attachments: EmailAttachment[] = email.attachments.map(a => ({
    id: a.id,
    name: a.name,
    mimeType: a.mimeType,
    size: a.size,
  }));

  return {
    id: uuidv4(),
    date: email.date,
    from: email.from,
    to: email.to,
    subject: email.subject,
    body: email.body,
    source: 'gmail',
    gmailMessageId: email.id,
    gmailThreadId: email.threadId,
    labelIds: email.labelIds,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Sync emails from Gmail for a given property.
 *
 * - Fetches emails matching the property's sync rules
 * - Deduplicates against existing gmail correspondence by gmailMessageId
 * - Returns the merged correspondence array and updated sync config
 */
export async function syncGmailForProperty(
  existingCorrespondence: CorrespondenceItem[],
  syncConfig: GmailSyncConfig,
  fullSync = false,
  selectedRuleIds?: string[]
): Promise<SyncResult> {
  if (!isGmailAuthenticated()) {
    throw new Error('Not authenticated with Gmail');
  }

  const activeRules = selectedRuleIds
    ? syncConfig.rules.filter(r => selectedRuleIds.includes(r.id))
    : syncConfig.rules;

  if (activeRules.length === 0) {
    return { correspondence: existingCorrespondence, syncConfig, newCount: 0 };
  }

  // For full sync, ignore lastSyncedAt
  const configForQuery = fullSync
    ? { ...syncConfig, lastSyncedAt: undefined }
    : syncConfig;

  const query = buildQuery(configForQuery, selectedRuleIds);
  if (!query) {
    return { correspondence: existingCorrespondence, syncConfig, newCount: 0 };
  }

  // Collect existing Gmail message IDs for deduplication
  const existingGmailIds = new Set(
    existingCorrespondence
      .filter(c => c.source === 'gmail' && c.gmailMessageId)
      .map(c => c.gmailMessageId!)
  );

  // Search Gmail
  const searchResult = await searchMessages(query, 500);
  if (!searchResult.messages || searchResult.messages.length === 0) {
    return {
      correspondence: existingCorrespondence,
      syncConfig: { ...syncConfig, lastSyncedAt: new Date().toISOString() },
      newCount: 0,
    };
  }

  // Collect unique thread IDs — fetching full threads captures our replies too
  const threadIds = [...new Set(searchResult.messages.map(m => m.threadId))];

  // Fetch complete threads (includes all messages: incoming + our replies)
  const threads = await getThreads(threadIds);

  // Flatten all messages from all threads, dedup against already-synced
  const allMessages = threads.flatMap(t => t.messages || []);
  const newMessages = allMessages.filter(m => !existingGmailIds.has(m.id));

  if (newMessages.length === 0) {
    return {
      correspondence: existingCorrespondence,
      syncConfig: { ...syncConfig, lastSyncedAt: new Date().toISOString() },
      newCount: 0,
    };
  }

  const parsed = newMessages.map(parseGmailMessage);
  const newItems = parsed.map(emailToCorrespondence);

  // Merge: manual items stay untouched, add new gmail items
  const merged = [...existingCorrespondence, ...newItems];

  return {
    correspondence: merged,
    syncConfig: { ...syncConfig, lastSyncedAt: new Date().toISOString() },
    newCount: newItems.length,
  };
}

/**
 * Generic alias — identical to syncGmailForProperty but with a clearer name
 * for non-property contexts (standalone correspondence tab, etc.).
 */
export const syncGmail = syncGmailForProperty;

/**
 * Remove all Gmail-sourced correspondence items (useful for re-sync).
 */
export function clearGmailCorrespondence(correspondence: CorrespondenceItem[]): CorrespondenceItem[] {
  return correspondence.filter(c => c.source !== 'gmail');
}
