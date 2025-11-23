import os
import re
from flask import (
    Blueprint, render_template, request, jsonify, send_file, current_app
)
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge, HTTPException

# Importa a lógica de transcrição do nosso módulo
from . import transcription

# Blueprints são a forma do Flask de organizar rotas.
# Em vez de @app.route, usamos @bp.route
bp = Blueprint('main', __name__, url_prefix='/')

ALLOWED_EXTENSIONS = {'wav'}
ALLOWED_MIME_TYPES = {'audio/wav', 'audio/x-wav', 'audio/wave'}

def allowed_file(filename):
    """Verifica se o arquivo tem extensão .wav"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(filename):
    """Limpa o nome do arquivo para evitar problemas de segurança."""
    filename = secure_filename(filename)
    return re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

@bp.route('/')
def index():
    """Retorna um status simples para indicar que a API está online."""
    return jsonify({
        'status': 'online',
        'message': 'Welcome to the Transcriber API!'
    })

@bp.route('/upload', methods=['POST'])
def upload_file():
    """Recebe e salva o arquivo de áudio enviado pelo usuário."""
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    if not allowed_file(file.filename) or file.content_type not in ALLOWED_MIME_TYPES:
        return jsonify({'error': 'Formato não suportado. Apenas arquivos .wav são permitidos'}), 400
    
    filename = sanitize_filename(file.filename)
    # Usamos current_app.config para acessar as configurações da aplicação
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    try:
        file.save(filepath)
        return jsonify({
            'success': True,
            'filename': filename,
            'message': 'Arquivo enviado com sucesso'
        })
    except Exception as e:
        # Log do erro seria uma boa prática aqui
        return jsonify({'error': f'Erro ao salvar arquivo: {str(e)}'}), 500

@bp.route('/transcribe', methods=['POST'])
def transcribe_route():
    """Inicia o processo de transcrição do áudio."""
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({'error': 'Nome do arquivo não fornecido'}), 400
    
    filename = data['filename']
    # O usuário pode opcionalmente enviar um modelo, senão usa o padrão do config
    model_name = data.get('model', current_app.config['WHISPER_MODEL'])
    
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    try:
        # Chama a função de transcrição do nosso módulo separado
        result = transcription.transcribe_audio(filepath, model_name)
        
        if result.get('error'):
            return jsonify(result), 400 # Retorna erro se a transcrição falhar

        # Salva a transcrição em um arquivo .txt
        txt_filename = filename.rsplit('.', 1)[0] + '.txt'
        txt_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], txt_filename)
        with open(txt_filepath, 'w', encoding='utf-8') as f:
            f.write(result['transcription'])
            
        return jsonify({
            'success': True,
            'transcription': result['transcription'],
            'txt_filename': txt_filename,
            'model_used': result['model_used']
        })

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        # Captura outros erros inesperados
        return jsonify({'error': f'Erro inesperado no servidor: {str(e)}'}), 500

@bp.route('/download/<filename>')
def download_transcription_file(filename):
    """Permite o download do arquivo .txt da transcrição."""
    filename = sanitize_filename(filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    return send_file(filepath, as_attachment=True, download_name=filename)

# --- Gerenciadores de Erro ---
# Eles capturam erros HTTP e garantem que a resposta seja sempre JSON,
# o que é uma boa prática para APIs.

@bp.app_errorhandler(HTTPException)
def handle_exception(e):
    """Garante que todos os erros HTTP retornem JSON."""
    response = e.get_response()
    response.data = jsonify({
        "code": e.code,
        "name": e.name,
        "description": e.description,
    }).data
    response.content_type = "application/json"
    return response

@bp.app_errorhandler(RequestEntityTooLarge)
def handle_request_too_large(e):
    """Handler específico para arquivos muito grandes."""
    return jsonify({'error': 'Arquivo muito grande. O tamanho máximo é 700MB.'}), 413
