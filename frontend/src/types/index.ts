export interface User {
    id: number;
    username: string;
    whisper_model?: string;
}

export interface Transcription {
    id: number;
    filename: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    timestamp: string;
    error_message?: string;
    segments?: any[];
}

export interface AuthStatus {
    authenticated: boolean;
    user?: User;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pages: number;
    per_page: number;
}
