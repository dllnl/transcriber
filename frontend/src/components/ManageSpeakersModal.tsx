import React, { useState, useEffect } from 'react';
import { X, Save, User, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

interface ManageSpeakersModalProps {
    isOpen: boolean;
    onClose: () => void;
    transcriptionId: number;
    segments: any[];
    onSuccess: () => void;
}

export const ManageSpeakersModal: React.FC<ManageSpeakersModalProps> = ({
    isOpen,
    onClose,
    transcriptionId,
    segments,
    onSuccess
}) => {
    const [speakers, setSpeakers] = useState<string[]>([]);
    const [names, setNames] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && segments) {
            const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker))).filter(Boolean);
            setSpeakers(uniqueSpeakers);
            const initialNames: Record<string, string> = {};
            uniqueSpeakers.forEach(s => {
                initialNames[s] = s;
            });
            setNames(initialNames);
        }
    }, [isOpen, segments]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Loop through all changed names and call the rename API
            for (const oldLabel of speakers) {
                const newLabel = names[oldLabel];
                if (newLabel && newLabel !== oldLabel) {
                    await api.transcriptions.renameSpeaker(transcriptionId, oldLabel, newLabel);
                }
            }
            setSuccess(true);
            onSuccess();
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User size={20} className="text-primary-dark" />
                                <h2 className="font-bold text-slate-800">Gerenciar Oradores</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                Identifique as pessoas nesta transcrição. Isso alterará o nome em todas as falas correspondentes.
                            </p>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-4">
                                    {speakers.map((s) => (
                                        <div key={s} className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                                Rótulo Original: {s}
                                            </label>
                                            <input
                                                type="text"
                                                value={names[s] || ''}
                                                onChange={(e) => setNames(prev => ({ ...prev, [s]: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary-light outline-none transition-all text-sm font-medium"
                                                placeholder="Ex: João, Maria..."
                                            />
                                        </div>
                                    ))}
                                    {speakers.length === 0 && (
                                        <p className="text-center py-8 text-slate-400 text-sm">Nenhum orador identificado.</p>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving || success || speakers.length === 0}
                                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${success
                                                ? 'bg-green-500 text-white'
                                                : 'bg-primary-dark text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : (success ? <CheckCircle2 /> : <Save size={20} />)}
                                        {success ? 'Alterado com Sucesso!' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
