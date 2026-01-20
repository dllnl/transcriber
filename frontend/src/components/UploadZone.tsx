import React, { useState } from 'react';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { cn } from '../utils';

interface UploadZoneProps {
    onSuccess: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onSuccess }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.wav')) {
            setError('Por favor, selecione um arquivo .wav');
            return;
        }

        setIsUploading(true);
        setError(null);
        try {
            const uploadData = await api.transcriptions.upload(file);
            await api.transcriptions.start(uploadData.filename);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro no upload');
        } finally {
            setIsUploading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.wav';
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFile(file);
                    };
                    input.click();
                }}
                className={cn(
                    "relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group",
                    isDragging ? "border-primary-light bg-primary-light/5" : "border-slate-200 hover:border-primary-light hover:bg-slate-50",
                    isUploading && "pointer-events-none opacity-50"
                )}
            >
                <div className="flex flex-col items-center">
                    <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all",
                        isDragging ? "bg-primary-light text-white animate-bounce" : "bg-slate-100 text-slate-400 group-hover:text-primary-light group-hover:bg-primary-light/10"
                    )}>
                        {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={32} />}
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">
                        {isUploading ? 'Processando arquivo...' : 'Nova Transcrição'}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                        Arraste seu áudio aqui ou clique para buscar
                    </p>
                    <div className="mt-4 flex gap-2">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">.WAV APENAS</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}
        </div>
    );
};
