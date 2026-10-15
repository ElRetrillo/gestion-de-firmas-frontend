import React from 'react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Badge } from './ui/badge';

export const Header: React.FC = () => {
  const { wsConectado } = useTelemetriaStore();
  const { usuario } = useAuthStore();

  return (
    <header className="bg-gob-blue text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Identidad Institucional con Espacio para Foto/Logo de la Municipalidad */}
        <div className="flex items-center space-x-3.5">
          <LogoMunicipalidad variant="header" className="h-10 w-32 shrink-0 bg-white/10 border-white/30 text-white" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-amber-300">
                Ilustre Municipalidad de Coquimbo
              </span>
              <span className="text-slate-400 text-xs">• Depto. Sistemas y TICs</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Gestión de Firmas & Telemetría de Tokens
              <span className="text-[11px] font-mono font-normal bg-blue-950/80 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                v1.0 ANCI
              </span>
            </h1>
          </div>
        </div>

        {/* Estado en vivo & Usuario (Sin iconos) */}
        <div className="flex items-center space-x-4">
          {/* Indicador de WebSocket */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
              wsConectado
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${wsConectado ? 'bg-emerald-400 live-indicator' : 'bg-rose-400'}`} />
            <span>{wsConectado ? 'TELEMETRÍA EN VIVO' : 'WS DESCONECTADO'}</span>
          </div>

          {/* Tarjeta de Usuario ClaveÚnica / Municipal */}
          <div className="bg-white/5 border border-white/15 px-3 py-1.5 rounded-lg text-xs leading-tight">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              {usuario.nombre}
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                {usuario.rol}
              </span>
            </div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              {usuario.unidad} • RUT: {usuario.rut}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
