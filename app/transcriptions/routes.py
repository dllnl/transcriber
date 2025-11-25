import os
import re
from flask import request, jsonify, send_file, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

from app.extensions import db
from . import bp
from .models import Transcription
from .services import transcribe_audio

ALLOWED_EXTENSIONS = {'wav'}
ALLOWED_MIME_TYPES = {'audio/wav', 'audio/x-wav', 'audio/wave'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(filename):
    filename = secure_filename(filename)
    return re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

@bp.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    if not allowed_file(file.filename) or file.content_type not in ALLOWED_MIME_TYPES:
        return jsonify({'error': 'Formato não suportado. Apenas arquivos .wav são permitidos'}), 400
    
    filename = sanitize_filename(file.filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    try:
        file.save(filepath)
        return jsonify({
            'success': True,
            'filename': filename,
            'message': 'Arquivo enviado com sucesso'
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao salvar arquivo: {str(e)}'}), 500

@bp.route('/transcribe', methods=['POST'])
@login_required
def transcribe_route():
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({'error': 'Nome do arquivo não fornecido'}), 400
    
    filename = data['filename']
    model_name = data.get('model', current_app.config['WHISPER_MODEL'])
    
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    try:
        result = transcribe_audio(filepath, model_name)
        
        if result.get('error'):
            return jsonify(result), 400

        # Save to database
        transcription_record = Transcription(
            filename=filename,
            text=result['transcription'],
            user_id=current_user.id
        )
        db.session.add(transcription_record)
        db.session.commit()
            
        return jsonify({
            'success': True,
            'transcription': result['transcription'],
            'model_used': result['model_used'],
            'id': transcription_record.id
        })

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Erro inesperado no servidor: {str(e)}'}), 500

@bp.route('/', methods=['GET'])
@login_required
def list_transcriptions():
    transcriptions = Transcription.query.filter_by(user_id=current_user.id).order_by(Transcription.timestamp.desc()).all()
    return jsonify([{
        'id': t.id,
        'filename': t.filename,
        'text': t.text,
        'timestamp': t.timestamp.isoformat()
    } for t in transcriptions])
