import type { Document, PropertyInfo, InsuranceInfo, InvoiceInfo, VehicleInfo, ContractInfo } from '../types';

/**
 * Field-shape adapter for the document hub.
 *
 * Entities store documents in inconsistent shapes — `document`, `documents[]`,
 * vehicle's `renewalDocument`/`paymentDocument`, and many nested docs inside
 * history/operations/compliance. Rather than enumerate every path, we deep-walk
 * each entity and collect every Document-like object, tagging it with which
 * entity it belongs to and the field (role) it was found under. Read-only — it
 * never mutates stored data.
 */

export type DocEntityType = 'Property' | 'Insurance' | 'Invoice' | 'Vehicle' | 'Contract';

export interface DocumentRef {
  doc: Document;
  entityType: DocEntityType;
  entityId: string;
  entityName: string;
  role: string;
}

/** A value is a stored Document if it has name+url plus a document-specific field. */
function isDocument(v: unknown): v is Document {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== 'string' || typeof o.url !== 'string') return false;
  return 'data' in o || 'mimeType' in o || 'uploadedAt' in o || 'category' in o;
}

/** Humanize a field key into a role label, e.g. renewalDocument -> "Renewal". */
function humanizeRole(key: string): string {
  const cleaned = key
    .replace(/Document$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const label = (cleaned || key).trim();
  if (!label || /^documents?$/i.test(label)) return 'Document';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Walk a value tree (the entity's fields) collecting documents + the key they sit under. */
function walkDocs(value: unknown, keyHint: string, out: Array<{ doc: Document; role: string }>): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(v => walkDocs(v, keyHint, out));
    return;
  }
  if (isDocument(value)) {
    out.push({ doc: value, role: humanizeRole(keyHint) });
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    walkDocs(v, k, out);
  }
}

function refsFor(entity: { id: string }, entityType: DocEntityType, entityName: string): DocumentRef[] {
  const found: Array<{ doc: Document; role: string }> = [];
  // Walk the entity's fields (not the entity object itself, which has name+url too).
  for (const [k, v] of Object.entries(entity as Record<string, unknown>)) {
    walkDocs(v, k, found);
  }
  return found.map(f => ({ doc: f.doc, entityType, entityId: entity.id, entityName, role: f.role }));
}

export interface DocumentSources {
  properties: PropertyInfo[];
  insurance: InsuranceInfo[];
  invoices: InvoiceInfo[];
  vehicles: VehicleInfo[];
  contracts: ContractInfo[];
}

/** Collect every stored document across all entities as a flat, taggable list. */
export function collectAllDocuments(sources: DocumentSources): DocumentRef[] {
  const out: DocumentRef[] = [];
  for (const p of sources.properties) out.push(...refsFor(p, 'Property', p.name || 'Untitled property'));
  for (const i of sources.insurance) out.push(...refsFor(i, 'Insurance', i.name || 'Untitled policy'));
  for (const inv of sources.invoices) out.push(...refsFor(inv, 'Invoice', inv.description || 'Untitled invoice'));
  for (const v of sources.vehicles) out.push(...refsFor(v, 'Vehicle', v.name || v.rego || 'Untitled vehicle'));
  for (const c of sources.contracts) out.push(...refsFor(c, 'Contract', c.name || 'Untitled contract'));
  return out;
}
