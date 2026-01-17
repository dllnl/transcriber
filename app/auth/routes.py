from flask import request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db
from . import bp
from .models import User

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    user = User(username=data['username'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user is None or not user.check_password(data['password']):
        print(f"DEBUG: Login failed for {data['username']}")
        return jsonify({'error': 'Invalid username or password'}), 401
    
    login_user(user)
    print(f"DEBUG: User {user.id} logged in successfully. Session created.")
    return jsonify({'message': 'Logged in successfully', 'user_id': user.id})

@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@bp.route('/status')
def status():
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'username': current_user.username})
    return jsonify({'authenticated': False})
