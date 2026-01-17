
import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev'
    
    # Database
    # Default to sqlite in the instance folder
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'instance', 'transcriber.sqlite')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Uploads
    # instance/uploads
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or \
        os.path.join(basedir, 'instance', 'uploads')
    MAX_CONTENT_LENGTH = 700 * 1024 * 1024  # 700MB

    # Whisper
    WHISPER_MODEL = os.environ.get('WHISPER_MODEL') or 'base'

    # Diarization
    HF_TOKEN = os.environ.get('HF_TOKEN')

    # Session / Cookies
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE') == 'True' # False by default
    SESSION_COOKIE_HTTPONLY = True

    @staticmethod
    def init_app(app):
        # Create necessary directories
        try:
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            # Ensure instance folder exists (though Flask usually handles this)
            instance_path = os.path.join(basedir, 'instance')
            if not os.path.exists(instance_path):
                os.makedirs(instance_path)
        except OSError:
            pass
