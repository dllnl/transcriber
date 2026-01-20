import React, { useState, useEffect } from 'react';
import { X, Save, Cpu, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [model, setModel] = useState('base');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.auth.getSettings()
                .then(data => {
                    if (data && data.whisper_model) {
                        setModel(data.whisper_model);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.auth.updateSettings({ whisper_model: model });
            setSuccess(true);
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
                    className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Cpu size={20} className="text-primary-dark" />
                                <h2 className="font-bold text-slate-800">Configurações</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {loading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <Loader2 className="animate-spin" size={32} />
                                    <p className="text-sm font-medium">Carregando preferências...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3">
                                            Modelo de Transcrição
                                        </label>
                                        <div className="space-y-2">
                                            {[
                                                { id: 'auto', label: 'Automático', desc: 'Melhor equilíbrio disponível' },
                                                { id: 'tiny', label: 'Whisper Tiny', desc: 'Rápido, menor precisão' },
                                                { id: 'base', label: 'Whisper Base', desc: 'Recomendado para uso geral' },
                                                { id: 'small', label: 'Whisper Small', desc: 'Boa precisão' },
                                                { id: 'medium', label: 'Whisper Medium', desc: 'Alta precisão' },
                                                { id: 'large', label: 'Whisper Large', desc: 'Máxima precisão (Lento)' },
                                            ].map((opt) => (
                                                <label
                                                    key={opt.id}
                                                    className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${model === opt.id
                                                        ? 'border-primary-light bg-primary-light/5 text-primary-dark'
                                                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="model"
                                                            value={opt.id}
                                                            checked={model === opt.id}
                                                            onChange={() => setModel(opt.id)}
                                                            className="hidden"
                                                        />
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${model === opt.id ? 'border-primary-light' : 'border-slate-300'
                                                            }`}>
                                                            {model === opt.id && <div className="w-2 h-2 bg-primary-light rounded-full" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold leading-none mb-1">{opt.label}</p>
                                                            <p className="text-[10px] opacity-70 leading-none">{opt.desc}</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving || success}
                                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${success
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : (success ? <CheckCircle2 /> : <Save size={20} />)}
                                        {success ? 'Salvo com Sucesso!' : 'Salvar Configurações'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
