/**
 * Gmail API service layer.
 *
 * Handles OAuth 2.0 via Google Identity Services (GIS) and provides
 * methods to search, fetch, and send emails using the Gmail REST API.
 *
 * Setup: Create a Google Cloud project, enable Gmail API, create OAuth 2.0
 * Web Client ID, and set VITE_GOOGLE_CLIENT_ID in your .env file.
 * Add http://localhost:5173 as an authorized JavaScript origin.
 */

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify';
const STORAGE_KEY = 'gmail-auth-token';

export interface GmailToken {
  access_token: string;
  expires_at: number; // epoch ms
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  filename?: string;
  body: { attachmentId?: string; size: number; data?: string };
  headers?: GmailMessageHeader[];
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  internalDate: string; // epoch ms as string
  payload: {
    mimeType: string;
    headers: GmailMessageHeader[];
    body: { size: number; data?: string };
    parts?: GmailMessagePart[];
  };
}

export interface GmailSearchResult {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

// ─── Token management ────────────────────────────────────────────────

function loadStoredToken(): GmailToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const token: GmailToken = JSON.parse(raw);
    if (Date.now() >= token.expires_at) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function storeToken(token: GmailToken) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

export function clearGmailToken() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredToken(): GmailToken | null {
  return loadStoredToken();
}

export function isGmailAuthenticated(): boolean {
  return loadStoredToken() !== null;
}

// ─── OAuth flow via Google Identity Services ─────────────────────────

let tokenClientReady = false;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

/** Load the GIS script if not already present. */
function ensureGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve();
      return;
    }
    if (document.getElementById('gis-script')) {
      // Script tag exists but hasn't loaded yet — wait for it
      const existing = document.getElementById('gis-script') as HTMLScriptElement;
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Initiate the Gmail OAuth sign-in flow.
 * Returns a token on success.
 */
export async function signInWithGmail(): Promise<GmailToken> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file.');
  }

  await ensureGisScript();

  return new Promise((resolve, reject) => {
    if (!tokenClientReady) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          const token: GmailToken = {
            access_token: response.access_token,
            expires_at: Date.now() + (response.expires_in ?? 3600) * 1000,
          };
          storeToken(token);
          resolve(token);
        },
      });
      tokenClientReady = true;
    }

    tokenClient!.requestAccessToken({ prompt: '' });
  });
}

export function signOutGmail() {
  const token = loadStoredToken();
  if (token) {
    try {
      google.accounts.oauth2.revoke(token.access_token, () => {});
    } catch { /* ignore if GIS not loaded */ }
  }
  clearGmailToken();
  tokenClientReady = false;
  tokenClient = null;
}

// ─── API helpers ─────────────────────────────────────────────────────

async function gmailFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = loadStoredToken();
  if (!token) throw new Error('Not authenticated with Gmail');

  const res = await fetch(`${GMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    clearGmailToken();
    throw new Error('Gmail token expired. Please sign in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gmail API error: ${res.status}`);
  }

  return res.json();
}

// ─── Search & Fetch ──────────────────────────────────────────────────

/**
 * Search Gmail with a query string (same syntax as Gmail search box).
 * Returns message IDs and thread IDs.
 */
export async function searchMessages(
  query: string,
  maxResults = 50,
  pageToken?: string
): Promise<GmailSearchResult> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  if (pageToken) params.set('pageToken', pageToken);
  return gmailFetch(`/messages?${params}`);
}

/**
 * Fetch a full message by ID including body and attachment metadata.
 */
export async function getMessage(messageId: string): Promise<GmailMessage> {
  return gmailFetch(`/messages/${messageId}?format=full`);
}

/**
 * Fetch multiple messages in parallel (batched by 10 to avoid rate limits).
 */
export async function getMessages(messageIds: string[]): Promise<GmailMessage[]> {
  const results: GmailMessage[] = [];
  const batchSize = 10;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const fetched = await Promise.all(batch.map(id => getMessage(id)));
    results.push(...fetched);
  }
  return results;
}

// ─── Message parsing ─────────────────────────────────────────────────

function getHeader(headers: GmailMessageHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

function extractTextBody(payload: GmailMessage['payload']): string {
  // Direct body
  if (payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — prefer text/plain, fallback to text/html stripped
  if (payload.parts) {
    const plainPart = findPart(payload.parts, 'text/plain');
    if (plainPart?.body.data) {
      return decodeBase64Url(plainPart.body.data);
    }

    const htmlPart = findPart(payload.parts, 'text/html');
    if (htmlPart?.body.data) {
      const html = decodeBase64Url(htmlPart.body.data);
      return stripHtml(html);
    }
  }

  return '';
}

function findPart(parts: GmailMessagePart[], mimeType: string): GmailMessagePart | undefined {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) return found;
    }
  }
  return undefined;
}

function stripHtml(html: string): string {
  // Basic HTML to text — strip tags, decode entities
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  date: string;       // YYYY-MM-DD
  from: string;
  to: string;
  subject: string;
  body: string;
  labelIds: string[];
  attachments: {
    id: string;        // attachment ID for download
    name: string;
    mimeType: string;
    size: number;
    messageId: string; // parent message ID needed for download
  }[];
}

function extractAttachments(parts: GmailMessagePart[] | undefined, messageId: string): ParsedEmail['attachments'] {
  if (!parts) return [];
  const attachments: ParsedEmail['attachments'] = [];

  for (const part of parts) {
    if (part.body.attachmentId && part.filename) {
      attachments.push({
        id: part.body.attachmentId,
        name: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        messageId,
      });
    }
    if (part.parts) {
      attachments.push(...extractAttachments(part.parts, messageId));
    }
  }

  return attachments;
}

export function parseGmailMessage(msg: GmailMessage): ParsedEmail {
  const headers = msg.payload.headers;
  const dateStr = getHeader(headers, 'Date');
  const date = dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';

  return {
    id: msg.id,
    threadId: msg.threadId,
    date,
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    subject: getHeader(headers, 'Subject'),
    body: extractTextBody(msg.payload),
    labelIds: msg.labelIds || [],
    attachments: extractAttachments(msg.payload.parts, msg.id),
  };
}

// ─── Threads ─────────────────────────────────────────────────────────

export interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

/**
 * Fetch a full thread by ID — returns all messages in the conversation,
 * including the user's sent replies.
 */
export async function getThread(threadId: string): Promise<GmailThread> {
  return gmailFetch(`/threads/${threadId}?format=full`);
}

/**
 * Fetch multiple threads in parallel (batched by 5 to avoid rate limits).
 */
export async function getThreads(threadIds: string[]): Promise<GmailThread[]> {
  const results: GmailThread[] = [];
  const batchSize = 5;
  for (let i = 0; i < threadIds.length; i += batchSize) {
    const batch = threadIds.slice(i, i + batchSize);
    const fetched = await Promise.all(batch.map(id => getThread(id)));
    results.push(...fetched);
  }
  return results;
}

// ─── Attachments ─────────────────────────────────────────────────────

export interface AttachmentData {
  data: string; // base64
  size: number;
}

/**
 * Download an attachment's raw data. Returns base64-encoded content.
 */
export async function getAttachment(messageId: string, attachmentId: string): Promise<AttachmentData> {
  const result = await gmailFetch<AttachmentData>(
    `/messages/${messageId}/attachments/${attachmentId}`
  );
  // Convert from base64url to standard base64
  result.data = result.data.replace(/-/g, '+').replace(/_/g, '/');
  return result;
}

// ─── Send ────────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  threadId?: string;    // reply within thread
  inReplyTo?: string;   // Message-ID header for threading
  references?: string;  // References header for threading
}

/**
 * Send an email via Gmail API.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ id: string; threadId: string }> {
  const { to, subject, body, threadId, inReplyTo, references } = params;

  let raw = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n`;
  if (inReplyTo) raw += `In-Reply-To: ${inReplyTo}\r\n`;
  if (references) raw += `References: ${references}\r\n`;
  raw += `\r\n${body}`;

  const encoded = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const payload: Record<string, string> = { raw: encoded };
  if (threadId) payload.threadId = threadId;

  return gmailFetch('/messages/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Labels ──────────────────────────────────────────────────────────

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
}

export async function listLabels(): Promise<GmailLabel[]> {
  const result = await gmailFetch<{ labels: GmailLabel[] }>('/labels');
  return result.labels || [];
}
