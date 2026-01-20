import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Transcription } from '../types';

export function useTranscriptions() {
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTranscriptions = useCallback(async (p = 1) => {
        try {
            const data = await api.transcriptions.list(p);
            if (data) {
                setTranscriptions(data.items);
                setTotalPages(data.pages);
                setPage(data.page);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTranscriptions();
    }, [fetchTranscriptions]);

    // Polling for active transcriptions
    useEffect(() => {
        const activeIds = transcriptions
            .filter(t => t.status === 'pending' || t.status === 'processing')
            .map(t => t.id);

        if (activeIds.length === 0) return;

        const interval = setInterval(async () => {
            const updates = await Promise.all(
                activeIds.map(id => api.transcriptions.status(id))
            );

            setTranscriptions(prev => prev.map(t => {
                const update = updates.find(u => u.id === t.id);
                return update ? update : t;
            }));

            // If anything finished, refresh the whole list to be sure
            if (updates.some(u => u.status === 'completed' || u.status === 'failed')) {
                fetchTranscriptions(page);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [transcriptions, fetchTranscriptions, page]);

    return {
        transcriptions,
        loading,
        page,
        totalPages,
        setPage,
        refresh: fetchTranscriptions
    };
}
