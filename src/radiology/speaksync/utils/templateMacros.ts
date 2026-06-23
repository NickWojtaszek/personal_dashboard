/**
 * Lightweight macro / parameter syntax for report templates.
 *
 * A template without any tokens behaves exactly as plain text (fully backward
 * compatible). Tokens turn a static template into a "clickable macro":
 *
 *   {{name}}                    text field (empty default)
 *   {{name=default}}            text/number field, pre-filled with `default`
 *   {{name|optA|optB|...}}      choice dropdown (first option is the default)
 *   [[name: text]]              optional block — included by default, untick to drop
 *   [[name: onText || offText]] toggle block — checked => onText, unchecked => offText
 *
 * Inner {{...}} fields may appear inside [[...]] blocks. Field/block `name`s are
 * the labels shown in the fill-in form and are de-duplicated (same name == same value).
 */

export type MacroControl =
  | { kind: 'text'; name: string; default: string }
  | { kind: 'choice'; name: string; options: string[] }
  | { kind: 'block'; name: string; hasOff: boolean };

export interface MacroValues {
  fields: Record<string, string>;  // field/choice name -> value
  blocks: Record<string, boolean>; // block name -> included?
}

// Non-greedy so multiple tokens on one line parse independently.
const BLOCK_RE = /\[\[\s*([^:\]]+?)\s*:\s*([\s\S]*?)\]\]/g;
const FIELD_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

function parseField(inner: string):
  | { kind: 'text'; name: string; default: string }
  | { kind: 'choice'; name: string; options: string[] } {
  if (inner.includes('|')) {
    const parts = inner.split('|').map(s => s.trim());
    return { kind: 'choice', name: parts[0], options: parts.slice(1) };
  }
  const eq = inner.indexOf('=');
  if (eq >= 0) {
    return { kind: 'text', name: inner.slice(0, eq).trim(), default: inner.slice(eq + 1).trim() };
  }
  return { kind: 'text', name: inner.trim(), default: '' };
}

/** True if the template contains any fill-in tokens. */
export function hasMacros(content: string): boolean {
  BLOCK_RE.lastIndex = 0;
  FIELD_RE.lastIndex = 0;
  return BLOCK_RE.test(content) || FIELD_RE.test(content);
}

/** All controls (blocks first, then fields) in order of first appearance, de-duped by name. */
export function analyzeTemplate(content: string): MacroControl[] {
  const controls: MacroControl[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(content)) !== null) {
    const name = m[1].trim();
    const key = 'b:' + name;
    if (!seen.has(key)) {
      seen.add(key);
      controls.push({ kind: 'block', name, hasOff: m[2].includes('||') });
    }
  }

  FIELD_RE.lastIndex = 0;
  while ((m = FIELD_RE.exec(content)) !== null) {
    const f = parseField(m[1]);
    const key = 'f:' + f.name;
    if (!seen.has(key)) {
      seen.add(key);
      controls.push(f);
    }
  }

  return controls;
}

/** Default values (defaults for fields, first option for choices, "on" for blocks). */
export function defaultValues(controls: MacroControl[]): MacroValues {
  const fields: Record<string, string> = {};
  const blocks: Record<string, boolean> = {};
  for (const c of controls) {
    if (c.kind === 'text') fields[c.name] = c.default;
    else if (c.kind === 'choice') fields[c.name] = c.options[0] ?? '';
    else blocks[c.name] = true;
  }
  return { fields, blocks };
}

/** Render the template with the supplied values into final report text. */
export function renderTemplate(content: string, values: MacroValues): string {
  // 1) resolve optional / toggle blocks
  let out = content.replace(BLOCK_RE, (_full, rawName: string, body: string) => {
    const name = rawName.trim();
    const on = values.blocks[name] !== false; // default included
    if (body.includes('||')) {
      const [onText, offText] = body.split('||');
      return (on ? onText : (offText ?? '')).trim();
    }
    return on ? body.trim() : '';
  });

  // 2) resolve fields / choices
  out = out.replace(FIELD_RE, (_full, inner: string) => {
    const f = parseField(inner);
    const v = values.fields[f.name];
    if (v !== undefined && v !== '') return v;
    if (f.kind === 'text') return f.default;
    return f.options[0] ?? '';
  });

  // 3) tidy whitespace left behind by removed blocks / blank tokens
  return out
    .replace(/[ \t]+\n/g, '\n')   // trailing spaces
    .replace(/\n{3,}/g, '\n\n')   // collapse blank runs
    .replace(/ {2,}/g, ' ')       // double spaces
    .replace(/ +([.,;:)])/g, '$1') // space before punctuation
    .trim();
}

// ---------------------------------------------------------------------------
// Color-coded preview: render into typed segments so the UI can highlight
// static text vs field values vs optional-block text.
// ---------------------------------------------------------------------------

export type SegmentKind = 'static' | 'field' | 'optional';
export interface RenderSegment { text: string; kind: SegmentKind; }

function pushSeg(segs: RenderSegment[], text: string, kind: SegmentKind): void {
  if (!text) return;
  const last = segs[segs.length - 1];
  if (last && last.kind === kind) last.text += text;
  else segs.push({ text, kind });
}

// Segment a piece of text that may contain {{...}} fields; literal parts get `literalKind`.
function segmentFields(text: string, values: MacroValues, literalKind: SegmentKind, segs: RenderSegment[]): void {
  let last = 0;
  let m: RegExpExecArray | null;
  FIELD_RE.lastIndex = 0;
  while ((m = FIELD_RE.exec(text)) !== null) {
    if (m.index > last) pushSeg(segs, text.slice(last, m.index), literalKind);
    const f = parseField(m[1]);
    const v = values.fields[f.name];
    let val: string;
    if (v !== undefined && v !== '') val = v;
    else if (f.kind === 'text') val = f.default;
    else val = f.options[0] ?? '';
    pushSeg(segs, val, 'field');
    last = m.index + m[0].length;
  }
  if (last < text.length) pushSeg(segs, text.slice(last), literalKind);
}

function cleanupSegments(segs: RenderSegment[]): RenderSegment[] {
  for (const s of segs) {
    s.text = s.text.replace(/ {2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }
  for (let i = 0; i < segs.length - 1; i++) {
    if (/ $/.test(segs[i].text) && /^ /.test(segs[i + 1].text)) {
      segs[i + 1].text = segs[i + 1].text.replace(/^ +/, '');
    }
    if (/ $/.test(segs[i].text) && /^[.,;:)]/.test(segs[i + 1].text)) {
      segs[i].text = segs[i].text.replace(/ +$/, '');
    }
  }
  return segs.filter(s => s.text.length > 0);
}

/** Render to typed segments (for color-coded preview). Field values are 'field',
 *  text inside optional/toggle blocks is 'optional', everything else 'static'. */
export function renderSegments(content: string, values: MacroValues): RenderSegment[] {
  const segs: RenderSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(content)) !== null) {
    if (m.index > last) segmentFields(content.slice(last, m.index), values, 'static', segs);
    const name = m[1].trim();
    const body = m[2];
    const on = values.blocks[name] !== false;
    let chosen = '';
    if (body.includes('||')) {
      const [onText, offText] = body.split('||');
      chosen = (on ? onText : (offText ?? '')).trim();
    } else {
      chosen = on ? body.trim() : '';
    }
    if (chosen) segmentFields(chosen, values, 'optional', segs);
    last = m.index + m[0].length;
  }
  if (last < content.length) segmentFields(content.slice(last), values, 'static', segs);
  return cleanupSegments(segs);
}
