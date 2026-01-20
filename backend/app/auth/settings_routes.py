from flask import request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from . import bp
from .user_preferences import UserPreferences

@bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    """Get user settings/preferences"""
    preferences = UserPreferences.query.filter_by(user_id=current_user.id).first()
    
    if not preferences:
        # Create default preferences if they don't exist
        preferences = UserPreferences(
            user_id=current_user.id,
            whisper_model='base'
        )
        db.session.add(preferences)
        db.session.commit()
    
    return jsonify(preferences.to_dict())

@bp.route('/settings', methods=['PUT'])
@login_required
def update_settings():
    """Update user settings/preferences"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Nenhum dado fornecido'}), 400
    
    preferences = UserPreferences.query.filter_by(user_id=current_user.id).first()
    
    if not preferences:
        preferences = UserPreferences(user_id=current_user.id)
        db.session.add(preferences)
    
    # Update whisper_model if provided
    if 'whisper_model' in data:
        whisper_model = data['whisper_model']
        # Validate model name
        valid_models = ['tiny', 'base', 'small', 'medium', 'large', 'auto']
        if whisper_model not in valid_models:
            return jsonify({'error': f'Modelo inválido. Opções válidas: {", ".join(valid_models)}'}), 400
        preferences.whisper_model = whisper_model
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Configurações atualizadas com sucesso',
            'preferences': preferences.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao salvar configurações: {str(e)}'}), 500
