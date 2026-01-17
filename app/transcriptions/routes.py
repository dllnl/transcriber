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
            structured_data=result.get('segments'),
            user_id=current_user.id
        )
        db.session.add(transcription_record)
        db.session.commit()
        
        # Save TXT file for download
        # Save TXT file for download
        txt_filename = filename.rsplit('.', 1)[0] + '.txt'
        txt_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], txt_filename)
        
        with open(txt_filepath, 'w', encoding='utf-8') as f:
            segments = result.get('segments')
            if segments and len(segments) > 0:
                # Write with speaker labels
                for segment in segments:
                    speaker = segment.get('speaker', 'Unknown')
                    text = segment.get('text', '').strip()
                    start = segment.get('start', 0)
                    end = segment.get('end', 0)
                    
                    # Format: [00:00 - 00:10] Speaker A: Hello world
                    # Helper to format time could be useful, or just raw seconds? 
                    # Let's do simple MM:SS format
                    def fmt_time(s):
                        m = int(s // 60)
                        sec = int(s % 60)
                        return f"{m:02d}:{sec:02d}"
                    
                    time_str = f"[{fmt_time(start)} - {fmt_time(end)}]"
                    f.write(f"{time_str} {speaker}: {text}\n")
            else:
                # Fallback to raw text if no segments
                f.write(result['transcription'])

        return jsonify({
            'success': True,
            'transcription': result['transcription'],
            'model_used': result['model_used'],
            'id': transcription_record.id,
            'segments': result.get('segments'),
            'txt_filename': txt_filename
        })

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Erro inesperado no servidor: {str(e)}'}), 500

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
    transcriptions = Transcription.query.filter_by(user_id=current_user.id).order_by(Transcription.timestamp.desc()).all()
    return jsonify([{
        'id': t.id,
        'filename': t.filename,
        'text': t.text,
        'segments': t.structured_data,
        'timestamp': t.timestamp.isoformat()
    } for t in transcriptions])

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
