import React from 'react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-indigo-700 focus:ring-indigo-500 border border-transparent",
    secondary: "bg-secondary text-white hover:bg-emerald-600 focus:ring-emerald-500 border border-transparent",
    outline: "bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-500 hover:text-indigo-600 focus:ring-indigo-500"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverable = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden p-6 
        ${hoverable ? 'cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all transform hover:-translate-y-1' : ''} 
        ${className}`}
    >
      {children}
    </div>
  );
};

// --- Spinner ---
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg', color?: string }> = ({ size = 'md', color = 'text-primary' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  
  return (
    <svg className={`animate-spin ${sizes[size]} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};

// --- ProgressBar ---
export const ProgressBar: React.FC<{ progress: number; label?: string }> = ({ progress, label }) => (
  <div className="w-full">
    {label && <div className="text-sm font-medium text-gray-700 mb-1 flex justify-between"><span>{label}</span> <span>{progress}%</span></div>}
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div 
        className="bg-primary h-2.5 rounded-full transition-all duration-300" 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  </div>
);