import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import type { AuthStatus, Transcription } from './types';
import { LogIn, UserPlus, Mic, Loader2, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranscriptions } from './hooks/useTranscriptions';
import { UploadZone } from './components/UploadZone';
import { TranscriptionCard } from './components/TranscriptionCard';
import { ReaderView } from './components/ReaderView';
import { SettingsModal } from './components/SettingsModal';
import { ManageSpeakersModal } from './components/ManageSpeakersModal';

// Dummy implementation for now, will split into files later
const Login = ({ onAuth }: { onAuth: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await api.auth.login(username, password);
      } else {
        await api.auth.register(username, password);
        setIsLogin(true);
        setError('Conta criada! Faça login.');
        return;
      }
      onAuth();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-brand">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-premium p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-brand rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Mic className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Transcriber AI</h1>
          <p className="text-slate-500">Transforme áudio em texto com precisão</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-white shadow-sm text-primary-dark' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-white shadow-sm text-primary-dark' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              placeholder="Digite sua senha"
              required
            />
          </div>

          {error && (
            <p className={`text-sm ${error.includes('sucesso') || error.includes('criada') ? 'text-green-600' : 'text-red-500'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? 'Entrar Agora' : 'Criar Minha Conta'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }: { user: any, onLogout: () => void }) => {
  const { transcriptions, loading, refresh } = useTranscriptions();
  const [viewingItem, setViewingItem] = useState<Transcription | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speakerItem, setSpeakerItem] = useState<Transcription | null>(null);

  const handleRetry = async (item: Transcription) => {
    try {
      await api.transcriptions.retry(item.id);
      refresh();
    } catch (err: any) {
      alert(`Erro ao reiniciar: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center shadow-lg">
            <Mic size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-brand bg-clip-text text-transparent">Transcriber</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-primary-dark uppercase tracking-widest leading-none">Pro Plan</span>
            <span className="text-sm text-slate-600 font-medium">{user?.username}</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            title="Configurações"
          >
            <SettingsIcon size={20} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-600"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Suas Transcrições</h2>
              {loading && <Loader2 className="animate-spin text-slate-400" size={20} />}
            </div>

            <div className="space-y-3 pb-12">
              {transcriptions.length > 0 ? (
                transcriptions.map(item => (
                  <TranscriptionCard
                    key={item.id}
                    item={item}
                    onView={setViewingItem}
                    onManageSpeakers={setSpeakerItem}
                    onRetry={handleRetry}
                  />
                ))
              ) : !loading && (
                <div className="col-span-full card-premium p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Mic className="text-slate-400" />
                  </div>
                  <p className="text-slate-500">Nenhuma transcrição encontrada. <br /> Comece fazendo um upload ao lado!</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Processar Áudio</h2>
              <UploadZone onSuccess={refresh} />

              <div className="mt-8 card-premium p-6 bg-gradient-to-br from-primary-light/5 to-primary-dark/5 border-primary-light/10">
                <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                  <SettingsIcon size={16} className="text-primary-dark" />
                  Dica de Uso
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para melhores resultados, utilize arquivos .wav com alta qualidade e evite ruídos de fundo intensos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ReaderView
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        onManageSpeakers={setSpeakerItem}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ManageSpeakersModal
        isOpen={!!speakerItem}
        onClose={() => setSpeakerItem(null)}
        transcriptionId={speakerItem?.id || 0}
        segments={speakerItem?.segments || []}
        onSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const status = await api.auth.status();
      setAuth(status);
    } catch (err) {
      setAuth({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    window.addEventListener('unauthorized', () => setAuth({ authenticated: false }));
  }, []);

  const handleLogout = async () => {
    await api.auth.logout();
    setAuth({ authenticated: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-dark w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="font-sans">
      {auth?.authenticated ? (
        <Dashboard user={auth.user} onLogout={handleLogout} />
      ) : (
        <Login onAuth={checkAuth} />
      )}
    </div>
  );
}
