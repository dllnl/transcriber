import React from 'react';
import type { Transcription } from '../types';
import { Clock, CheckCircle2, AlertCircle, Loader2, Download, Eye, Mic, User, RotateCcw } from 'lucide-react';
import { formatTimestamp, cn } from '../utils';
import { api } from '../api/client';

interface TranscriptionCardProps {
    item: Transcription;
    onView: (item: Transcription) => void;
    onManageSpeakers: (item: Transcription) => void;
    onRetry?: (item: Transcription) => void;
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({ item, onView, onManageSpeakers, onRetry }) => {
    const statusConfig: Record<string, { label: string, icon: any, color: string, animate?: string }> = {
        pending: { label: 'Na Fila', icon: Clock, color: 'text-amber-500 bg-amber-50' },
        processing: { label: 'Processando...', icon: Loader2, color: 'text-blue-500 bg-blue-50', animate: 'animate-spin' },
        completed: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
        failed: { label: 'Falhou', icon: AlertCircle, color: 'text-red-500 bg-red-50' },
    };

    const config = statusConfig[item.status];

    return (
        <div className="list-row group flex items-center justify-between gap-4 border border-transparent hover:border-primary-light/20 shadow-sm hover:shadow-md relative">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    item.status === 'completed' ? "bg-primary-light/10 text-primary-dark" : "bg-slate-100 text-slate-400"
                )}>
                    {item.status === 'processing' ? (
                        <Loader2 size={24} className="animate-spin" />
                    ) : item.status === 'failed' ? (
                        <AlertCircle size={24} className="text-red-400" />
                    ) : (
                        <Mic size={24} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate text-sm sm:text-base mb-0.5" title={item.filename}>
                        {item.filename}
                    </h3>
                    <div className="flex items-center gap-3">
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} /> {formatTimestamp(item.timestamp)}
                        </p>
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                            config.color.split(' ')[0]
                        )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", config.color.split(' ')[1])} />
                            {config.label}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {item.status === 'completed' && (
                    <>
                        <button
                            onClick={() => onManageSpeakers(item)}
                            className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
                            title="Gerenciar Oradores"
                        >
                            <User size={20} />
                        </button>

                        <a
                            href={api.transcriptions.downloadUrl(item.id)}
                            className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
                            title="Baixar Arquivo"
                        >
                            <Download size={20} />
                        </a>

                        <button
                            onClick={() => onView(item)}
                            className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
                            title="Visualizar Transcrição"
                        >
                            <Eye size={20} />
                        </button>
                    </>
                )}

                {item.status === 'failed' && onRetry && (
                    <button
                        onClick={() => onRetry(item)}
                        className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                        title="Tentar Novamente"
                    >
                        <RotateCcw size={20} />
                    </button>
                )}
            </div>

            {item.status === 'failed' && item.error_message && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 px-4">
                    <p className="text-[10px] text-red-500 bg-red-50 p-1.5 rounded-lg border border-red-100 shadow-sm">
                        {item.error_message}
                    </p>
                </div>
            )}
        </div>
    );
};
