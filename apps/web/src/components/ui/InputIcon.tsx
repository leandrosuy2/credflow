'use client';

import type { InputHTMLAttributes } from 'react';

interface InputIconProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  label?: string;
}

export function InputIcon({ icon, label, className = '', ...props }: InputIconProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
        <input
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400 ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
