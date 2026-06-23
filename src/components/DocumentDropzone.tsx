import React, { useState, useCallback } from 'react';

interface DocumentDropzoneProps {
  /** Called with the selected/dropped files (from drop or the file input). */
  onFiles: (files: FileList | null) => void;
  accept?: string;
  disabled?: boolean;
  /** Base classes for the dropzone <label>. */
  className?: string;
  /** Extra classes applied while a file is being dragged over. */
  activeClassName?: string;
  /** Extra classes applied when not dragging. */
  inactiveClassName?: string;
  /** Inner content (icon + helper text). */
  children: React.ReactNode;
}

/**
 * Shared drag-and-drop + click-to-upload dropzone. Owns the drag state and the
 * hidden file input; callers supply the styling and inner content so each
 * existing dropzone keeps its exact look.
 */
const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  onFiles,
  accept = 'application/pdf',
  disabled = false,
  className = '',
  activeClassName = '',
  inactiveClassName = '',
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled) onFiles(e.dataTransfer.files);
  }, [disabled, onFiles]);

  return (
    <label
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`${className} ${isDragging ? activeClassName : inactiveClassName}`}
    >
      {children}
      <input type="file" className="hidden" accept={accept} disabled={disabled} onChange={(e) => onFiles(e.target.files)} />
    </label>
  );
};

export default DocumentDropzone;
