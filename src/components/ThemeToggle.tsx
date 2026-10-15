import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { Button } from './ui/button';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`h-8 px-2.5 gap-1.5 text-xs font-medium cursor-pointer ${className}`}
      aria-label="Alternar tema claro u oscuro"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform" />
          <span className="hidden sm:inline text-[11px] text-foreground font-medium">Claro</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300 transition-transform" />
          <span className="hidden sm:inline text-[11px] text-foreground font-medium">Oscuro</span>
        </>
      )}
    </Button>
  );
};
