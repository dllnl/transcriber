import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from app.extensions import db, login_manager

def create_app():
    """Cria e configura a aplicação Flask."""
    app = Flask(__name__, instance_relative_config=True, static_folder='../static', static_url_path='/static')

    # Inicializa o CORS na aplicação. Por padrão, isso permite requisições de todas as origens.
    # Para produção, você pode querer restringir isso a domínios específicos.
    # Ex: CORS(app, resources={r"/api/*": {"origins": "https://seu-dominio.com"}})
    CORS(app, supports_credentials=True)

    # Configurações padrão que podem ser sobrescritas
    app.config.from_mapping(
        SECRET_KEY='dev',
        UPLOAD_FOLDER=os.path.join(app.instance_path, 'uploads'),
        MAX_CONTENT_LENGTH=700 * 1024 * 1024,
        WHISPER_MODEL='base',
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'transcriber.sqlite'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=False,  # Importante para localhost sem HTTPS
        SESSION_COOKIE_HTTPONLY=True
    )

    db.init_app(app)
    login_manager.init_app(app)
    # login_manager.session_protection = "strong" # Pode causar problemas se o IP mudar, vamos comentar por enquanto

    from app.auth.models import User

    @login_manager.user_loader
    def load_user(user_id):
        print(f"DEBUG: Loading user {user_id}")
        return User.query.get(int(user_id))

    # Garante que a pasta de instância e a pasta de uploads existam
    try:
        os.makedirs(app.instance_path)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError:
        pass

    # Rota para servir o frontend
    @app.route('/')
    def index():
        return send_from_directory('..', 'index.html')

    # Importa e registra as rotas (views) da aplicação

    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    from app.transcriptions import bp as transcriptions_bp
    app.register_blueprint(transcriptions_bp)

    with app.app_context():
        db.create_all()

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

