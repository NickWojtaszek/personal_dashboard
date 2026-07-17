/**
 * Trigger a browser download of an in-memory string as a file. Replaces the
 * ad-hoc Blob+anchor pattern that was copied across several components.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8;'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
