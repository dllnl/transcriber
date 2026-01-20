import type { AuthStatus, PaginatedResponse, Transcription } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function handleResponse(response: Response) {
    if (response.status === 401) {
        // Handle unauthorized
        window.dispatchEvent(new CustomEvent('unauthorized'));
        return null;
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}

export const api = {
    auth: {
        status: (): Promise<AuthStatus> =>
            fetch(`${API_BASE}/auth/status`, { credentials: 'include' }).then(handleResponse),

        login: (username: string, password: string) =>
            fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            }).then(handleResponse),

        register: (username: string, password: string) =>
            fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            }).then(handleResponse),

        logout: () =>
            fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            }).then(handleResponse),

        getSettings: () =>
            fetch(`${API_BASE}/auth/settings`, { credentials: 'include' }).then(handleResponse),

        updateSettings: (data: { whisper_model: string }) =>
            fetch(`${API_BASE}/auth/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            }).then(handleResponse),
    },

    transcriptions: {
        list: (page = 1, perPage = 10): Promise<PaginatedResponse<Transcription>> =>
            fetch(`${API_BASE}/transcriptions/?page=${page}&per_page=${perPage}`, {
                credentials: 'include'
            }).then(handleResponse),

        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(`${API_BASE}/transcriptions/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            }).then(handleResponse);
        },

        start: (filename: string) =>
            fetch(`${API_BASE}/transcriptions/transcribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename }),
                credentials: 'include'
            }).then(handleResponse),

        retry: (id: number) =>
            fetch(`${API_BASE}/transcriptions/${id}/retry`, {
                method: 'POST',
                credentials: 'include'
            }).then(handleResponse),

        status: (id: number): Promise<Transcription> =>
            fetch(`${API_BASE}/transcriptions/${id}/status`, {
                credentials: 'include'
            }).then(handleResponse),

        downloadUrl: (id: number) => `${API_BASE}/transcriptions/${id}/download`,

        renameSpeaker: (id: number, oldLabel: string, newLabel: string) =>
            fetch(`${API_BASE}/transcriptions/${id}/rename-speaker`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_label: oldLabel, new_label: newLabel }),
                credentials: 'include'
            }).then(handleResponse),
    }
};
