import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-xl shadow-2xl p-6 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
          <h3 className="text-lg font-bold text-slate-100 select-none">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body content */}
        <div className="overflow-y-auto pr-1 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
