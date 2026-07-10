
import type { GrammarError } from '../types';
import DOMPurify from 'dompurify';

/**
 * Gets the plain text content of an HTML element.
 * @param element The HTML element to get text from.
 * @returns The plain text content.
 */
export const getPlainText = (element: HTMLElement | null): string => {
    if (!element) return '';
    // Use innerText to get visually rendered text, which respects line breaks.
    return element.innerText;
};

/**
 * Inserts HTML content at the current cursor position (caret).
 *
 * Uses document.execCommand('insertHTML') when available: despite being
 * deprecated it is supported by every current browser, and it is the ONLY
 * insertion path that participates in the contentEditable's native undo
 * stack — Range.insertNode edits are invisible to Ctrl+Z and break undo of
 * the surrounding typing. Falls back to the Range API where execCommand is
 * missing or refuses.
 * @param html The HTML string to insert (will be sanitized for XSS protection).
 */
export const insertHtmlAtCursor = (html: string): void => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['span', 'br', 'p', 'strong', 'em', 'u', 'b', 'i'],
        ALLOWED_ATTR: ['class', 'style', 'data-error-id'],
        ALLOW_DATA_ATTR: true
    });

    if (typeof document.execCommand === 'function') {
        try {
            if (document.execCommand('insertHTML', false, sanitizedHtml)) return;
        } catch { /* fall through to Range fallback */ }
    }

    const range = sel.getRangeAt(0);
    range.deleteContents();

    // Create a temporary element to parse the sanitized HTML string
    const el = document.createElement("div");
    el.innerHTML = sanitizedHtml;

    const frag = document.createDocumentFragment();
    let node;
    let lastNode;
    while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
    }

    range.insertNode(frag);

    // Move cursor to the end of the inserted content
    if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

/**
 * Deletes the contents of a Range through the native undo stack.
 * Selects the range and issues execCommand('delete') so Ctrl+Z can restore
 * it; falls back to Range.deleteContents() (non-undoable) if unavailable.
 */
export const deleteRangeUndoable = (range: Range): void => {
    const sel = window.getSelection();
    if (sel && typeof document.execCommand === 'function') {
        try {
            sel.removeAllRanges();
            sel.addRange(range);
            if (document.execCommand('delete')) return;
        } catch { /* fall through */ }
    }
    range.deleteContents();
};

/**
 * Traverses the DOM tree of a contentEditable element and wraps found grammar errors in a styled span.
 * @param editor The contentEditable div element.
 * @param errors An array of GrammarError objects from the API.
 */
export const applyGrammarHighlighting = (editor: HTMLElement | null, errors: GrammarError[]): void => {
    if (!editor || errors.length === 0) return;
    
    const sortedErrors = [...errors].sort((a, b) => b.originalText.length - a.originalText.length);
    
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    const nodesToProcess: Text[] = [];

    while (node = walker.nextNode()) {
        nodesToProcess.push(node as Text);
    }

    for (const textNode of nodesToProcess) {
        let currentNode: Node = textNode;
        let textContent = currentNode.textContent || '';
        
        for (const error of sortedErrors) {
            const index = textContent.indexOf(error.originalText);
            
            if (index !== -1 && currentNode.nodeType === Node.TEXT_NODE) {
                const parent = currentNode.parentNode;
                if (!parent) continue;

                const beforeText = textContent.substring(0, index);
                const afterText = textContent.substring(index + error.originalText.length);

                const beforeNode = document.createTextNode(beforeText);
                const afterNode = document.createTextNode(afterText);
                
                const span = document.createElement('span');
                span.className = 'grammar-error';
                span.textContent = error.originalText;
                span.dataset.errorId = error.id;
                
                const fragment = document.createDocumentFragment();
                if(beforeText) fragment.appendChild(beforeNode);
                fragment.appendChild(span);
                if(afterText) fragment.appendChild(afterNode);
                
                parent.replaceChild(fragment, currentNode);
                
                // Continue searching in the 'after' part
                currentNode = afterNode; 
                textContent = afterText;
            }
        }
    }
};

/**
 * Removes grammar error highlighting spans from the editor, merging the text back together.
 * @param editor The contentEditable div element.
 */
export const removeGrammarHighlighting = (editor: HTMLElement | null): void => {
    if (!editor) return;
    const errorSpans = editor.querySelectorAll('span.grammar-error');
    
    errorSpans.forEach(span => {
        const parent = span.parentNode;
        if (parent) {
            const textNode = document.createTextNode(span.textContent || '');
            parent.replaceChild(textNode, span);
            parent.normalize(); // Merges adjacent text nodes
        }
    });
};
