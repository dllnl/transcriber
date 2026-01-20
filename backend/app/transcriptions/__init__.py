from flask import Blueprint

bp = Blueprint('transcriptions', __name__, url_prefix='/transcriptions')

from . import routes
