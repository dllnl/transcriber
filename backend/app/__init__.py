import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from app.extensions import db, login_manager
from config import Config

def create_app(config_class=Config):
    """Cria e configura a aplicação Flask."""
    app = Flask(__name__, instance_relative_config=True)

    # Inicializa o CORS na aplicação.
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

    # Configurações a partir do objeto Config
    app.config.from_object(config_class)
    
    # Executa lógica de inicialização da config (ex: garantir pastas)
    config_class.init_app(app)

    db.init_app(app)
    login_manager.init_app(app)
    # login_manager.session_protection = "strong" # Pode causar problemas se o IP mudar, vamos comentar por enquanto

    from app.auth.models import User

    @login_manager.user_loader
    def load_user(user_id):
        print(f"DEBUG: Loading user {user_id}")
        return User.query.get(int(user_id))


    # Importa e registra as rotas (views) da aplicação

    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    from app.transcriptions import bp as transcriptions_bp
    app.register_blueprint(transcriptions_bp)

    with app.app_context():
        db.create_all()
        
        # Recover interrupted tasks (ghost tasks)
        from app.transcriptions.task_queue import recover_ghost_tasks
        recover_ghost_tasks(app)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Autenticação necessária'}), 401

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Recurso não encontrado'}), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({'error': 'Erro interno do servidor'}), 500

    @app.shell_context_processor
    def make_shell_context():
        from app.auth.models import User
        return {'db': db, 'User': User}

    return app

