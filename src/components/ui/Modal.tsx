import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, description, children, footer, size = 'md'
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render into document.body via portal so the overlay always covers
  // the full viewport — including the sidebar and top navbar — regardless
  // of any parent stacking context or transform.
  return createPortal(
    <div
      ref={overlayRef}
      // Use inset-0 fixed so it covers 100vw × 100vh from the viewport origin
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Full-viewport backdrop blur — covers sidebar + topbar */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative bg-white rounded-xl shadow-modal w-full animate-scale-in flex flex-col max-h-[90vh]',
          sizes[size],
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between p-5 border-b border-slate-100 flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="ml-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
