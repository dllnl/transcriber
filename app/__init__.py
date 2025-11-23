import os
from flask import Flask
from flask_cors import CORS

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
        WHISPER_MODEL='base'
    )

    # Garante que a pasta de instância e a pasta de uploads existam
    try:
        os.makedirs(app.instance_path)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError:
        pass

    # Importa e registra as rotas (views) da aplicação
    from . import routes
    app.register_blueprint(routes.bp)

    return app

