/**
 * Google Sheets export via OAuth2 + Sheets API (client-side, no backend).
 *
 * Prerequisites:
 *   1. Google Cloud project with OAuth 2.0 Client ID (Web application type)
 *   2. Enable "Google Sheets API" and "Google Drive API"
 *   3. Add http://localhost:3000 to authorized JavaScript origins
 *   4. Set GOOGLE_CLIENT_ID in .env.local
 */

import type { InvoiceInfo } from '../types';

// Declared by the Google Identity Services script loaded in index.html
declare const google: any;

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const CURRENCY_SYMBOLS: Record<string, string> = {
    GBP: '\u00a3', USD: '$', AUD: 'A$', EUR: '\u20ac', PLN: 'z\u0142',
};

// --- Auth ---

let cachedAccessToken: string | null = null;

function getAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            reject(new Error('GOOGLE_CLIENT_ID not configured. Add it to .env.local'));
            return;
        }

        // If we have a cached token, try it first
        if (cachedAccessToken) {
            resolve(cachedAccessToken);
            return;
        }

        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (response: any) => {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    cachedAccessToken = response.access_token;
                    // Token expires in ~1hr, clear cache before that
                    setTimeout(() => { cachedAccessToken = null; }, 50 * 60 * 1000);
                    resolve(response.access_token);
                },
            });
            client.requestAccessToken();
        } catch (err) {
            reject(err);
        }
    });
}

// --- Sheets API helpers ---

async function sheetsRequest(path: string, method: string, body?: any, token?: string) {
    const accessToken = token || await getAccessToken();
    const res = await fetch(`${SHEETS_API}${path}`, {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.text();
        // If auth expired, clear cache and throw
        if (res.status === 401) cachedAccessToken = null;
        throw new Error(`Sheets API ${res.status}: ${err}`);
    }
    return res.json();
}

// --- Color helpers ---

type RgbColor = { red: number; green: number; blue: number; alpha?: number };

const COLORS = {
    headerBg: { red: 0.2, green: 0.4, blue: 0.7 } as RgbColor,
    headerText: { red: 1, green: 1, blue: 1 } as RgbColor,
    sectionBg: { red: 0.9, green: 0.93, blue: 0.98 } as RgbColor,
    totalBg: { red: 0.95, green: 0.95, blue: 0.95 } as RgbColor,
    altRowBg: { red: 0.97, green: 0.97, blue: 0.99 } as RgbColor,
};

// --- Main export function ---

export interface SheetsExportOptions {
    invoices: InvoiceInfo[];
    groupBy: 'location' | 'category';
    title?: string;
}

export async function exportToGoogleSheets(options: SheetsExportOptions): Promise<string> {
    const { invoices, groupBy, title } = options;
    const accessToken = await getAccessToken();
    const sheetTitle = title || `Invoices Export - ${new Date().toLocaleDateString('en-GB')}`;

    // 1. Create spreadsheet
    const createRes = await sheetsRequest('', 'POST', {
        properties: { title: sheetTitle },
        sheets: [{ properties: { title: 'Invoices', sheetId: 0 } }],
    }, accessToken);

    const spreadsheetId = createRes.spreadsheetId;
    const spreadsheetUrl = createRes.spreadsheetUrl;

    // 2. Build rows grouped by location or category
    const groups: Record<string, InvoiceInfo[]> = {};
    invoices.forEach(inv => {
        let key: string;
        if (groupBy === 'location') {
            key = inv.location || 'Unassigned';
        } else {
            key = (inv.groups && inv.groups.length > 0) ? inv.groups.join(', ') : 'Uncategorised';
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(inv);
    });

    const rows: any[][] = [];
    const sectionRowIndices: number[] = [];   // Row indices for section headers
    const totalRowIndices: number[] = [];     // Row indices for subtotal rows
    const headerRowIndex = 0;

    // Header row
    rows.push(['Description', 'Category', 'Location', 'Date', 'Currency', 'Amount', 'Has Receipt']);

    // Sort groups alphabetically
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    for (const [groupName, items] of sortedGroups) {
        // Section header
        sectionRowIndices.push(rows.length);
        rows.push([groupName, '', '', '', '', '', '']);

        // Sort items by date (newest first)
        items.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

        for (const inv of items) {
            const sym = CURRENCY_SYMBOLS[inv.currency || 'GBP'] || inv.currency || '\u00a3';
            rows.push([
                inv.description,
                (inv.groups || []).join(', '),
                inv.location || '',
                inv.purchaseDate,
                inv.currency || 'GBP',
                `${sym}${inv.amount.toFixed(2)}`,
                inv.document ? 'Yes' : 'No',
            ]);
        }

        // Subtotal row per currency
        const subtotals: Record<string, number> = {};
        items.forEach(inv => {
            const c = inv.currency || 'GBP';
            subtotals[c] = (subtotals[c] || 0) + inv.amount;
        });
        for (const [currency, total] of Object.entries(subtotals)) {
            const sym = CURRENCY_SYMBOLS[currency] || currency;
            totalRowIndices.push(rows.length);
            rows.push(['', '', '', `Subtotal (${groupName})`, currency, `${sym}${total.toFixed(2)}`, '']);
        }

        // Blank separator
        rows.push(['', '', '', '', '', '', '']);
    }

    // Grand totals
    const grandTotals: Record<string, number> = {};
    invoices.forEach(inv => {
        const c = inv.currency || 'GBP';
        grandTotals[c] = (grandTotals[c] || 0) + inv.amount;
    });
    rows.push(['', '', '', '', '', '', '']);
    for (const [currency, total] of Object.entries(grandTotals)) {
        const sym = CURRENCY_SYMBOLS[currency] || currency;
        totalRowIndices.push(rows.length);
        rows.push(['', '', '', 'GRAND TOTAL', currency, `${sym}${total.toFixed(2)}`, '']);
    }

    // 3. Write data
    await sheetsRequest(`/${spreadsheetId}/values/Invoices!A1:G${rows.length}?valueInputOption=RAW`, 'PUT', {
        range: `Invoices!A1:G${rows.length}`,
        majorDimension: 'ROWS',
        values: rows,
    }, accessToken);

    // 4. Format the spreadsheet
    const requests: any[] = [];

    // Auto-resize columns
    requests.push({
        autoResizeDimensions: {
            dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 7 },
        },
    });

    // Header row formatting
    requests.push({
        repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
            cell: {
                userEnteredFormat: {
                    backgroundColor: COLORS.headerBg,
                    textFormat: { bold: true, foregroundColor: COLORS.headerText, fontSize: 11 },
                    horizontalAlignment: 'CENTER',
                },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        },
    });

    // Freeze header row
    requests.push({
        updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
        },
    });

    // Section header formatting
    for (const idx of sectionRowIndices) {
        requests.push({
            repeatCell: {
                range: { sheetId: 0, startRowIndex: idx, endRowIndex: idx + 1, startColumnIndex: 0, endColumnIndex: 7 },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: COLORS.sectionBg,
                        textFormat: { bold: true, fontSize: 11 },
                    },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
        });
        // Merge section header across columns
        requests.push({
            mergeCells: {
                range: { sheetId: 0, startRowIndex: idx, endRowIndex: idx + 1, startColumnIndex: 0, endColumnIndex: 4 },
                mergeType: 'MERGE_ALL',
            },
        });
    }

    // Subtotal/total row formatting
    for (const idx of totalRowIndices) {
        requests.push({
            repeatCell: {
                range: { sheetId: 0, startRowIndex: idx, endRowIndex: idx + 1, startColumnIndex: 0, endColumnIndex: 7 },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: COLORS.totalBg,
                        textFormat: { bold: true },
                    },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
        });
    }

    // Amount column right-aligned
    requests.push({
        repeatCell: {
            range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length, startColumnIndex: 5, endColumnIndex: 6 },
            cell: {
                userEnteredFormat: { horizontalAlignment: 'RIGHT' },
            },
            fields: 'userEnteredFormat(horizontalAlignment)',
        },
    });

    // Apply all formatting
    await sheetsRequest(`/${spreadsheetId}:batchUpdate`, 'POST', { requests }, accessToken);

    return spreadsheetUrl;
}

export function isGoogleSheetsConfigured(): boolean {
    return !!process.env.GOOGLE_CLIENT_ID;
}
