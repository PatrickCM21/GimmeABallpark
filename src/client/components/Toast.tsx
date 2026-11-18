import React from 'react';
import { createPortal } from 'react-dom';

export const Toast: React.FC = () => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="ballpark-toast"
      className="ballpark-toast"
      role="status"
      aria-live="polite"
      style={{ display: 'none' }}
    >
      <span className="ballpark-toast-icon" aria-hidden="true" />
      <span id="ballpark-toast-text" className="ballpark-toast-text" />
    </div>,
    document.body
  );
};
