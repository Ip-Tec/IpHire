'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Check local storage or class on html tag
    const isDarkTheme = document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
    
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer focus:outline-none"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-deepsea-400" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-deepsea-700" />
      )}
    </button>
  );
};
