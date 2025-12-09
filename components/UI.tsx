import React from 'react';

// Card
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-semibold text-brand-dark text-lg">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

// Form Label
export const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-sm font-medium text-brand-gray mb-1.5 ml-1">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Input: React.FC<InputProps> = ({ label, className = "", ...props }) => (
  <div className="mb-4">
    {label && <Label required={props.required}>{label}</Label>}
    <input
      className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm text-gray-800 placeholder-gray-400 ${className}`}
      {...props}
    />
  </div>
);

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
}
export const Select: React.FC<SelectProps> = ({ label, options, className = "", placeholder, ...props }) => (
  <div className="mb-4">
    {label && <Label required={props.required}>{label}</Label>}
    <div className="relative">
      <select
        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm text-gray-800 appearance-none ${className}`}
        {...props}
      >
        <option value="" disabled>{placeholder || "Seleccionar..."}</option>
        {options.map((opt, idx) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          return <option key={idx} value={value}>{label}</option>
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = "", ...props }) => {
  const base = "px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-dark text-white hover:bg-opacity-90 hover:shadow-md",
    secondary: "bg-brand-primary text-white hover:bg-blue-400",
    outline: "bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};