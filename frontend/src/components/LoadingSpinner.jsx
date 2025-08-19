import React from 'react';

const LoadingSpinner = ({ message = "Loading...", size = "medium" }) => {
  const sizeClasses = {
    small: "h-8 w-8",
    medium: "h-12 w-12", 
    large: "h-16 w-16"
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-brand-cyan mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-lg text-cyan-300">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;