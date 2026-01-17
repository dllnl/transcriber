// Variáveis globais
let currentTxtFilename = null;
let originalAudioFilename = null;
// Use relative path if on HTTP/HTTPS (served by Flask), otherwise fallback to localhost (for dev/testing)
const API_BASE_URL = window.location.protocol === 'file:'
    ? 'http://localhost:5000'
    : '';

// Check if running from file protocol and warn user
if (window.location.protocol === 'file:') {
    alert('ATENÇÃO: Você está acessando este arquivo diretamente.\n\nPara que o login funcione corretamente, por favor acesse através do servidor:\nhttp://localhost:5000');
}

// Elementos DOM
const uploadForm = document.getElementById('uploadForm');
const audioFileInput = document.getElementById('audioFile');
const modelSelect = document.getElementById('modelSelect');
const fileNameDisplay = document.getElementById('fileName');
const transcribeBtn = document.getElementById('transcribeBtn');
const alertContainer = document.getElementById('alertContainer');
const transcriptionSection = document.getElementById('transcriptionSection');
const transcriptionText = document.getElementById('transcriptionText');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Atualizar nome do arquivo quando selecionado
audioFileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `Arquivo selecionado: ${file.name} (${formatFileSize(file.size)})`;
        fileNameDisplay.classList.remove('text-muted');
        fileNameDisplay.classList.add('text-success', 'fw-bold');
    } else {
        fileNameDisplay.textContent = '';
    }
});

// Helper functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSpeakerClass(speaker) {
    // Simple hash to pick a color style
    if (!speaker) return 'bg-light';
    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const styles = ['bg-light', 'bg-opacity-10 bg-primary', 'bg-opacity-10 bg-success', 'bg-opacity-10 bg-info', 'bg-opacity-10 bg-warning'];
    return styles[hash % styles.length];
}

// Formatação de tamanho de arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Exibir alerta
function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : 'check-circle'}"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    // Auto-dismiss após 5 segundos
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 12000);
}

// Função auxiliar para fazer parse seguro de JSON
async function safeJsonParse(response) {
    const contentType = response.headers.get('content-type');

    // Clonar a resposta para poder ler o body múltiplas vezes se necessário
    const clonedResponse = response.clone();

    if (!contentType || !contentType.includes('application/json')) {
        // Se não for JSON, ler como texto para ver o erro
        const text = await clonedResponse.text();
        console.error('Resposta não é JSON:', text.substring(0, 200));
        throw new Error(`Servidor retornou resposta inválida (esperado JSON, recebido ${contentType || 'text/html'})`);
    }

    try {
        return await response.json();
    } catch (error) {
        // Se falhar ao fazer parse, tentar ler como texto
        const text = await clonedResponse.text();
        console.error('Erro ao fazer parse de JSON:', error);
        console.error('Resposta recebida:', text.substring(0, 500));
        throw new Error('Erro ao processar resposta do servidor. Verifique o console para mais detalhes.');
    }
}

// Manipular envio do formulário
uploadForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const file = audioFileInput.files[0];
    if (!file) {
        showAlert('Por favor, selecione um arquivo de áudio.');
        return;
    }

    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.wav')) {
        showAlert('Apenas arquivos .wav são permitidos.');
        return;
    }

    // Limpar alertas anteriores
    alertContainer.innerHTML = '';

    // Mostrar loading
    transcribeBtn.classList.add('loading');
    transcribeBtn.disabled = true;

    // Ocultar seção de transcrição anterior
    transcriptionSection.style.display = 'none';
    transcriptionText.value = '';
    currentTxtFilename = null;
    currentTxtFilename = null;
    originalAudioFilename = file.name;

    // Limpar estado anterior
    clearState();
    saveState(); // Save the "cleared" state with new filename info if we want, or just wait for success.
    // Actually, let's just clear persistence for now so if they reload they don't see old data.


    try {
        // Passo 1: Upload do arquivo
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${API_BASE_URL}/transcriptions/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const uploadData = await safeJsonParse(uploadResponse);

        if (uploadResponse.status === 401) {
            showAuthModal();
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        if (!uploadResponse.ok) {
            throw new Error(uploadData.error || 'Erro ao fazer upload do arquivo');
        }

        // Passo 2: Transcrever
        let selectedModel = modelSelect.value;
        // Remove o prefixo 'whisper-' se existir, pois o backend espera apenas o nome do modelo
        if (selectedModel.startsWith('whisper-')) {
            selectedModel = selectedModel.replace('whisper-', '');
        }
        // Se o modelo for 'auto', o backend já sabe como lidar
        // O backend espera 'tiny', 'base', etc., não 'whisper-tiny'

        const transcribeResponse = await fetch(`${API_BASE_URL}/transcriptions/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadData.filename,
                model: selectedModel
            }),
            credentials: 'include'
        });

        const transcribeData = await safeJsonParse(transcribeResponse);

        if (transcribeResponse.status === 401) {
            showAuthModal();
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        if (!transcribeResponse.ok) {
            throw new Error(transcribeData.error || 'Erro durante a transcrição');
        }

        // Exibir transcrição
        transcriptionText.value = transcribeData.transcription;
        currentTxtFilename = transcribeData.txt_filename;
        transcriptionSection.style.display = 'block';

        const container = document.getElementById('transcriptionContainer');
        container.innerHTML = '';

        if (transcribeData.segments && transcribeData.segments.length > 0) {
            let currentSpeaker = null;
            let currentBlock = null;

            transcribeData.segments.forEach(segment => {
                // Determine styling based on speaker
                const speakerClass = getSpeakerClass(segment.speaker);

                const segmentDiv = document.createElement('div');
                segmentDiv.className = `mb-2 p-2 rounded ${speakerClass}`;

                // Add click handler for renaming
                const headerDiv = document.createElement('div');
                headerDiv.className = "fw-bold text-primary mb-1 d-flex align-items-center";
                headerDiv.style.fontSize = "0.9em";
                headerDiv.style.cursor = "pointer";
                headerDiv.title = "Clique para renomear";
                headerDiv.innerHTML = `
                    <i class="bi bi-pencil-square me-1"></i> ${segment.speaker} 
                    <span class="text-muted fw-normal ms-2" style="font-size: 0.8em;">(${formatTime(segment.start)} - ${formatTime(segment.end)})</span>
                `;
                headerDiv.onclick = () => openRenameModal(transcribeData.id, segment.speaker);

                segmentDiv.appendChild(headerDiv);

                const textDiv = document.createElement('div');
                textDiv.textContent = segment.text;
                segmentDiv.appendChild(textDiv);

                container.appendChild(segmentDiv);
            });
        } else {
            container.innerHTML = `<p style="white-space: pre-wrap;">${transcribeData.transcription}</p>`;
        }

        // Salvar estado
        saveState({
            transcription: transcribeData.transcription,
            segments: transcribeData.segments,
            txtFilename: currentTxtFilename,
            audioFilename: originalAudioFilename,
            id: transcribeData.id
        });

        // Scroll para a transcrição
        transcriptionSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        showAlert('Transcrição concluída com sucesso!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        showAlert(error.message || 'Ocorreu um erro durante o processamento.');
    } finally {
        // Remover loading
        transcribeBtn.classList.remove('loading');
        transcribeBtn.disabled = false;
    }
});

// Função para copiar para clipboard
async function copiarParaClipboard() {
    const text = transcriptionText.value.trim();

    if (!text) {
        showAlert('Não há texto para copiar.');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);

        // Feedback visual
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
        copyBtn.classList.remove('btn-success');
        copyBtn.classList.add('btn-success', 'disabled');

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('disabled');
        }, 2000);

    } catch (error) {
        console.error('Erro ao copiar:', error);

        // Fallback para navegadores antigos
        transcriptionText.select();
        transcriptionText.setSelectionRange(0, 99999); // Para mobile

        try {
            document.execCommand('copy');
            showAlert('Texto copiado para a área de transferência!', 'success');
        } catch (err) {
            showAlert('Erro ao copiar texto. Por favor, copie manualmente.');
        }
    }
}

// Função para baixar como TXT
function baixarComoTxt() {
    const text = transcriptionText.value.trim();

    if (!text) {
        showAlert('Não há texto para baixar.');
        return;
    }

    // Check if we have an ID (preferred for dynamic generation) or filename
    // We try to find the ID from the current state if available
    let downloadId = null;

    // Try to find the ID in the state object we passed to saveState
    try {
        const savedState = localStorage.getItem('transcriptionState');
        if (savedState) {
            const data = JSON.parse(savedState);
            downloadId = data.id;
        }
    } catch (e) { }

    // Fallback: If we just transcribed, it might be in a global variable? 
    // We should probably store it globally like currentTxtFilename
    // For now, let's rely on the saveState logic or add a global variable if needed.
    // Actually, let's check if we have the ID available in the DOM/Memory

    if (downloadId) {
        // Baixar arquivo gerado dinamicamente
        window.location.href = `${API_BASE_URL}/transcriptions/${downloadId}/download`;
    } else if (currentTxtFilename) {
        // Legacy fallback
        window.location.href = `${API_BASE_URL}/transcriptions/download/${currentTxtFilename}`;
    } else {
        // Fallback: criar blob e baixar manually from text area
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use original filename if available, replacing extension
        if (originalAudioFilename) {
            const baseName = originalAudioFilename.replace(/\.[^/.]+$/, "");
            a.download = `${baseName}.txt`;
        } else {
            a.download = 'transcricao.txt';
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert('Arquivo baixado com sucesso!', 'success');
    }
}

// Event listeners para botões
copyBtn.addEventListener('click', copiarParaClipboard);
downloadBtn.addEventListener('click', baixarComoTxt);

// Drag and drop
const fileInputWrapper = document.querySelector('.file-input-wrapper');
const fileInputLabel = document.querySelector('.file-input-label');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileInputWrapper.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    fileInputWrapper.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    fileInputWrapper.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    fileInputLabel.style.backgroundColor = '#e9ecef';
    fileInputLabel.style.borderColor = '#764ba2';
}

function unhighlight(e) {
    fileInputLabel.style.backgroundColor = '#f8f9fa';
    fileInputLabel.style.borderColor = '#667eea';
}

fileInputWrapper.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.wav')) {
            audioFileInput.files = files;
            const event = new Event('change', { bubbles: true });
            audioFileInput.dispatchEvent(event);
        } else {
            showAlert('Apenas arquivos .wav são permitidos.');
        }
    }
}

// Auth Logic
const authModal = new bootstrap.Modal(document.getElementById('authModal'));
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authAlert = document.getElementById('authAlert');

function showAuthModal() {
    authModal.show();
}

function hideAuthModal() {
    authModal.hide();
}

function showAuthAlert(message, type = 'danger') {
    authAlert.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, { credentials: 'include' });
        const data = await response.json();
        if (!data.authenticated) {
            showAuthModal();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showAuthAlert('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                hideAuthModal();
                authAlert.innerHTML = '';
                loginForm.reset();
            }, 1000);
        } else {
            showAuthAlert(result.error || 'Erro ao fazer login');
        }
    } catch (error) {
        showAuthAlert('Erro de conexão');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.status === 201) {
            showAuthAlert('Conta criada com sucesso! Faça login.', 'success');
            registerForm.reset();
            // Switch to login tab
            document.getElementById('login-tab').click();
        } else {
            showAuthAlert(result.error || 'Erro ao registrar');
        }
    } catch (error) {
        showAuthAlert('Erro de conexão');
    }
});

// Rename Logic
const renameModal = new bootstrap.Modal(document.getElementById('renameModal'));
const renameForm = document.getElementById('renameForm');

function openRenameModal(transcriptionId, oldLabel) {
    if (!transcriptionId) {
        console.error("ID da transcrição não encontrado");
        return;
    }
    document.getElementById('renameTranscriptionId').value = transcriptionId;
    document.getElementById('renameOldLabel').value = oldLabel;
    document.getElementById('renameOldLabelDisplay').value = oldLabel;
    document.getElementById('renameNewLabel').value = '';
    renameModal.show();
}

renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('renameTranscriptionId').value;
    const oldLabel = document.getElementById('renameOldLabel').value;
    const newLabel = document.getElementById('renameNewLabel').value;

    try {
        const response = await fetch(`${API_BASE_URL}/transcriptions/${id}/rename-speaker`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_label: oldLabel, new_label: newLabel }),
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Orador renomeado com sucesso!', 'success');
            renameModal.hide();
            // In a real app, we should reload the data. 
            // For now, let's just update the DOM locally or reload the list if we were in a list view.
            // Since we don't strictly have a "reload current view" easily without re-fetching everything,
            // let's just alert the user that they might need to refresh or re-transcribe to see it clean,
            // OR ideally, we assume the user just did a transcription.

            // To make it perfect, we should update all instances in the DOM immediately:
            document.querySelectorAll('#transcriptionContainer div.fw-bold').forEach(el => {
                if (el.textContent.includes(oldLabel)) {
                    el.innerHTML = el.innerHTML.replace(oldLabel, newLabel);
                }
            });

        } else {
            const data = await response.json();
            alert(data.error || 'Erro ao renomear');
        }
    } catch (error) {
        console.error(error);
        alert('Erro de conexão');
    }
});

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    restoreState();
});

// State Persistence
function saveState(data) {
    if (!data) {
        // If no data provided, save current state from DOM variables if possible, 
        // but here we are calling it with explicit data from the transcribe success.
        // Or we can save partial state (like just the filename) if needed.
        localStorage.setItem('transcriptionState', JSON.stringify({
            audioFilename: originalAudioFilename
        }));
        return;
    }
    localStorage.setItem('transcriptionState', JSON.stringify({
        ...data,
        timestamp: new Date().getTime()
    }));
}

function restoreState() {
    const savedState = localStorage.getItem('transcriptionState');
    if (!savedState) return;

    try {
        const data = JSON.parse(savedState);

        // Optional: Check expiration (e.g., 24h)
        if (new Date().getTime() - data.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('transcriptionState');
            return;
        }

        if (data.audioFilename) {
            originalAudioFilename = data.audioFilename;
            // Update UI to show "Restored session" or similar?
            if (data.audioFilename) {
                fileNameDisplay.textContent = `Sessão restaurada: ${data.audioFilename}`;
                fileNameDisplay.classList.remove('text-muted');
                fileNameDisplay.classList.add('text-info');
            }
        }

        if (data.transcription) {
            transcriptionText.value = data.transcription;
            currentTxtFilename = data.txtFilename;
            transcriptionSection.style.display = 'block';

            // Re-render segments
            const container = document.getElementById('transcriptionContainer');
            container.innerHTML = '';

            if (data.segments && data.segments.length > 0) {
                data.segments.forEach(segment => {
                    const speakerClass = getSpeakerClass(segment.speaker);
                    const segmentDiv = document.createElement('div');
                    segmentDiv.className = `mb-2 p-2 rounded ${speakerClass}`;

                    const headerDiv = document.createElement('div');
                    headerDiv.className = "fw-bold text-primary mb-1 d-flex align-items-center";
                    headerDiv.style.fontSize = "0.9em";
                    headerDiv.style.cursor = "pointer";
                    headerDiv.title = "Clique para renomear";
                    headerDiv.innerHTML = `
                        <i class="bi bi-pencil-square me-1"></i> ${segment.speaker} 
                        <span class="text-muted fw-normal ms-2" style="font-size: 0.8em;">(${formatTime(segment.start)} - ${formatTime(segment.end)})</span>
                    `;
                    // Note: 'data.id' needs to be saved too for renaming to work
                    headerDiv.onclick = () => openRenameModal(data.id, segment.speaker);

                    segmentDiv.appendChild(headerDiv);
                    const textDiv = document.createElement('div');
                    textDiv.textContent = segment.text;
                    segmentDiv.appendChild(textDiv);
                    container.appendChild(segmentDiv);
                });
            } else {
                container.innerHTML = `<p style="white-space: pre-wrap;">${data.transcription}</p>`;
            }
        }

    } catch (e) {
        console.error('Erro ao restaurar estado:', e);
        localStorage.removeItem('transcriptionState');
    }
}

function clearState() {
    localStorage.removeItem('transcriptionState');
}
