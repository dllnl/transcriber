import os
from flask import Flask
from flask_cors import CORS
from app.extensions import db, login_manager

def create_app():
    """Cria e configura a aplicação Flask."""
    app = Flask(__name__, instance_relative_config=True)

    # Inicializa o CORS na aplicação. Por padrão, isso permite requisições de todas as origens.
    # Para produção, você pode querer restringir isso a domínios específicos.
    # Ex: CORS(app, resources={r"/api/*": {"origins": "https://seu-dominio.com"}})
    CORS(app)

    # Configurações padrão que podem ser sobrescritas
    app.config.from_mapping(
        SECRET_KEY='dev',
        UPLOAD_FOLDER=os.path.join(app.instance_path, 'uploads'),
        MAX_CONTENT_LENGTH=700 * 1024 * 1024,
        WHISPER_MODEL='base',
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'transcriber.sqlite'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False
    )

    db.init_app(app)
    login_manager.init_app(app)
    
    from app.auth.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Garante que a pasta de instância e a pasta de uploads existam
    try:
        os.makedirs(app.instance_path)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError:
        pass

    # Importa e registra as rotas (views) da aplicação
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    from app.transcriptions import bp as transcriptions_bp
    app.register_blueprint(transcriptions_bp)

    with app.app_context():
        db.create_all()

    return app

