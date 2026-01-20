import os
import re
from flask import request, jsonify, send_file, current_app, send_from_directory
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

from app.extensions import db
from . import bp
from .models import Transcription
from .services import transcribe_audio
from .task_queue import get_task_queue
from app.auth.user_preferences import UserPreferences

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
    """Submit a transcription task for background processing"""
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({'error': 'Nome do arquivo não fornecido'}), 400
    
    filename = data['filename']
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    # Check if file exists
    if not os.path.exists(filepath):
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    # Get user's preferred model from preferences
    preferences = UserPreferences.query.filter_by(user_id=current_user.id).first()
    if preferences:
        model_name = preferences.whisper_model
    else:
        # Use default if no preferences set
        model_name = current_app.config.get('WHISPER_MODEL', 'base')
    
    try:
        # Create transcription record with pending status
        transcription_record = Transcription(
            filename=filename,
            text='',  # Will be filled when processing completes
            user_id=current_user.id,
            status='pending',
            progress=0
        )
        db.session.add(transcription_record)
        db.session.commit()
        
        # Submit to background queue
        task_queue = get_task_queue()
        task_queue.submit_task(
            transcription_id=transcription_record.id,
            filepath=filepath,
            model_name=model_name
        )
        
        # Return immediately with transcription ID
        return jsonify({
            'success': True,
            'id': transcription_record.id,
            'status': 'pending',
            'message': 'Transcrição iniciada em segundo plano'
        }), 202  # 202 Accepted
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao iniciar transcrição: {str(e)}'}), 500

@bp.route('/<int:id>/status', methods=['GET'])
@login_required
def get_transcription_status(id):
    """Get the current status of a transcription"""
    transcription = Transcription.query.get_or_404(id)
    
    # Check ownership
    if transcription.user_id != current_user.id:
        return jsonify({'error': 'Não autorizado'}), 403
    
    response = {
        'id': transcription.id,
        'filename': transcription.filename,
        'status': transcription.status,
        'progress': transcription.progress,
        'timestamp': transcription.timestamp.isoformat()
    }
    
    # Include results if completed
    if transcription.status == 'completed':
        response['transcription'] = transcription.text
        response['segments'] = transcription.structured_data
    
    # Include error if failed
    if transcription.status == 'failed':
        response['error_message'] = transcription.error_message
    
    return jsonify(response)

@bp.route('/<int:id>/retry', methods=['POST'])
@login_required
def retry_transcription(id):
    """Re-submit a failed transcription to the task queue"""
    transcription = Transcription.query.get_or_404(id)
    
    # Check ownership
    if transcription.user_id != current_user.id:
        return jsonify({'error': 'Não autorizado'}), 403
    
    # Check if failed or should be allowed to retry
    if transcription.status not in ['failed', 'pending']:
        return jsonify({'error': 'Apenas transcrições que falharam ou estão pendentes podem ser reiniciadas'}), 400
    
    try:
        # Reset status and progress
        transcription.status = 'pending'
        transcription.progress = 0
        transcription.error_message = None
        db.session.commit()
        
        # Get user's preferred model
        from app.auth.user_preferences import UserPreferences
        prefs = UserPreferences.query.filter_by(user_id=current_user.id).first()
        model_name = prefs.whisper_model if prefs else 'base'
        
        # Audio path
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], transcription.filename)
        
        # Submit to queue
        from app.transcriptions.task_queue import get_task_queue
        task_queue = get_task_queue()
        task_queue.submit_task(transcription.id, filepath, model_name)
        
        return jsonify({
            'success': True,
            'id': transcription.id,
            'status': 'pending',
            'message': 'Transcrição reiniciada'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao reiniciar transcrição: {str(e)}'}), 500

@bp.route('/<int:id>/download', methods=['GET'])
@login_required
def download_transcription(id):
    transcription = Transcription.query.get_or_404(id)
    
    if transcription.user_id != current_user.id:
        return jsonify({'error': 'Não autorizado'}), 403
    
    # Generate content on-the-fly
    content = ""
    segments = transcription.structured_data
    
    if segments and len(segments) > 0:
        for segment in segments:
            speaker = segment.get('speaker', 'Unknown')
            text = segment.get('text', '').strip()
            start = segment.get('start', 0)
            end = segment.get('end', 0)
            
            # Simple MM:SS format
            def fmt_time(s):
                m = int(s // 60)
                sec = int(s % 60)
                return f"{m:02d}:{sec:02d}"
            
            time_str = f"[{fmt_time(start)} - {fmt_time(end)}]"
            content += f"{time_str} {speaker}: {text}\n"
    else:
        # Fallback to raw text
        content = transcription.text if transcription.text else ""

    # Create in-memory file
    from io import BytesIO
    mem_file = BytesIO()
    mem_file.write(content.encode('utf-8'))
    mem_file.seek(0)
    
    download_name = transcription.filename.rsplit('.', 1)[0] + '.txt'
    
    return send_file(
        mem_file,
        as_attachment=True,
        download_name=download_name,
        mimetype='text/plain'
    )

# Removed old static file download route to avoid confusion, 
# or keep it but checking explicit ownership if needed. 
# For now, we will leave the old one as legacy or fallback if someone hits it manually, 
# but the frontend will assume IDs.


@bp.route('/', methods=['GET'])
@login_required
def list_transcriptions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)
    
    pagination = Transcription.query.filter_by(user_id=current_user.id)\
        .order_by(Transcription.timestamp.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': [{
            'id': t.id,
            'filename': t.filename,
            'text': t.text,
            'segments': t.structured_data,
            'timestamp': t.timestamp.isoformat(),
            'status': t.status,
            'progress': t.progress,
            'error_message': t.error_message
        } for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@bp.route('/<int:id>/rename-speaker', methods=['PUT'])
@login_required
def rename_speaker(id):
    transcription = Transcription.query.get_or_404(id)
    
    if transcription.user_id != current_user.id:
        return jsonify({'error': 'Não autorizado'}), 403
        
    data = request.get_json()
    old_label = data.get('old_label')
    new_label = data.get('new_label')
    
    if not old_label or not new_label:
        return jsonify({'error': 'Labels antigo e novo são obrigatórios'}), 400
        
    # Update structured data
    segments = transcription.structured_data
    if not segments:
        return jsonify({'error': 'Não há dados estruturados para esta transcrição'}), 400
        
    updated = False
    
    # We need to create a new list to ensure SQLAlchemy detects the change in JSON
    new_segments = []
    
    for segment in segments:
        new_segment = segment.copy()
        if new_segment['speaker'] == old_label:
            new_segment['speaker'] = new_label
            updated = True
        new_segments.append(new_segment)
        
    if updated:
        transcription.structured_data = new_segments
        # Optional: Update text blob if desired, but sticking to JSON update for now as planned
        db.session.commit()
        return jsonify({'success': True, 'message': 'Orador renomeado com sucesso'})
    
    return jsonify({'error': 'Orador não encontrado'}), 404
