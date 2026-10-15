import React, { useState } from 'react';

interface LogoMunicipalidadProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'landing';
}

export const LogoMunicipalidad: React.FC<LogoMunicipalidadProps> = ({
  className = '',
  variant = 'header',
}) => {
  // Intentamos primero con .png (color oficial de Coquimbo) y si falla pasamos a .svg
  const [currentSrc, setCurrentSrc] = useState<string>('/logo-municipalidad.png');
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (currentSrc === '/logo-municipalidad.png') {
      setCurrentSrc('/logo-municipalidad.svg');
    } else {
      setHasError(true);
    }
  };

  const dimensions =
    variant === 'landing'
      ? 'h-14 w-14'
      : variant === 'sidebar'
        ? 'h-11 w-11'
        : 'h-10 w-10';

  return (
    <div
      title="Ilustre Municipalidad de Coquimbo"
      className={`relative flex items-center justify-center rounded-lg bg-white p-1 shadow-xs border border-border/60 overflow-hidden select-none shrink-0 ${dimensions} ${className}`}
    >
      {!hasError ? (
        <img
          src={currentSrc}
          alt="Logo Ilustre Municipalidad de Coquimbo"
          className="h-full w-full object-contain"
          onError={handleError}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center px-2 py-0.5">
          <span className="text-[10px] font-bold tracking-wider text-primary uppercase leading-tight font-mono">
            COQUIMBO
          </span>
          <span className="text-[8px] text-muted-foreground uppercase font-semibold">
            MUNICIPALIDAD
          </span>
        </div>
      )}
    </div>
  );
};
