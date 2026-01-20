import React, { useEffect, useState } from 'react';
import { X, Download, Copy, Check, Loader2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import type { Transcription } from '../types';

interface ReaderViewProps {
    item: Transcription | null;
    onClose: () => void;
    onManageSpeakers: (item: Transcription) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ item, onClose, onManageSpeakers }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchContent = async () => {
        if (!item) return;
        setLoading(true);
        try {
            const res = await fetch(api.transcriptions.downloadUrl(item.id), { credentials: 'include' });
            const text = await res.text();
            setContent(text);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (item && item.status === 'completed') {
            fetchContent();
        }
    }, [item]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!item) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white md:bg-slate-900/40 md:backdrop-blur-sm flex items-end md:items-center justify-center"
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full h-[95vh] md:h-[90vh] md:max-w-4xl bg-white md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div className="min-w-0 pr-4">
                            <h2 className="font-bold text-slate-800 truncate">{item.filename}</h2>
                            <p className="text-xs text-slate-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Modo de Leitura
                            </p>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={() => item && onManageSpeakers(item)}
                                className="p-2 hover:bg-primary-light/10 text-primary-dark rounded-xl transition-all flex items-center gap-1.5"
                                title="Gerenciar Oradores"
                            >
                                <Settings2 size={18} />
                                <span className="hidden sm:inline text-xs font-bold uppercase">Oradores</span>
                            </button>

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all flex items-center gap-1.5"
                                title="Copiar texto"
                            >
                                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                <span className="hidden sm:inline text-xs font-bold uppercase">Copiar</span>
                            </button>

                            <a
                                href={api.transcriptions.downloadUrl(item.id)}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"
                                title="Baixar"
                            >
                                <Download size={18} />
                            </a>

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-400 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/30">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <Loader2 className="animate-spin" size={40} />
                                <p className="font-medium">Carregando transcrição...</p>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <article className="prose prose-slate prose-lg max-w-none">
                                    {content.split('\n').map((line, i) => {
                                        // Regex matches: [MM:SS - MM:SS] SPEAKER: Text
                                        const segmentMatch = line.match(/^(\[.*?\])\s+(.*?):\s+(.*)$/);
                                        if (segmentMatch) {
                                            const [, time, speaker, text] = segmentMatch;
                                            return (
                                                <div key={i} className="mb-8 last:mb-0 group">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {time}
                                                        </span>
                                                        <span className="inline-block px-2 py-0.5 rounded-md bg-primary-light/10 text-primary-dark text-[10px] font-bold uppercase tracking-widest">
                                                            {speaker}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-700 leading-relaxed text-lg pl-4 border-l-2 border-slate-100 group-hover:border-primary-light/30 transition-colors">
                                                        {text}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return line.trim() ? <p key={i} className="text-slate-700 leading-relaxed text-lg">{line}</p> : <br key={i} />;
                                    })}
                                </article>
                            </div>
                        )}
                    </div>

                    {/* Footer - Mobile optimization removed/simplified */}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
