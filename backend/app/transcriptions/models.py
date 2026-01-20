from app.extensions import db
from datetime import datetime
from app.auth.models import User

class Transcription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(256))
    text = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    structured_data = db.Column(db.JSON)
    
    # Background processing fields
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, processing, completed, failed
    error_message = db.Column(db.Text)
    progress = db.Column(db.Integer, default=0)  # 0-100
    
    author = db.relationship(User, backref='transcriptions')
