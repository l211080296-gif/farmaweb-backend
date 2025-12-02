import os
from flask import Flask, render_template, request, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# --- CONFIGURACIÓN ---

# 1. Base de Datos (Detecta automáticamente si estás en Render o en tu PC)
database_url = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 2. Configuración de Correo (Necesitas poner estas variables en Render)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USER')     # Tu correo Gmail
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASS')     # Tu contraseña de aplicación
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_USER')

# 3. Clave secreta (Para tokens de seguridad)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'una-clave-secreta-muy-dificil')

db = SQLAlchemy(app)
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# --- MODELOS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False) # Aumentado para hash
    role = db.Column(db.String(20), default='user')

# --- RUTAS ---

@app.route('/')
def index():
    return render_template('index.html')

# 1. Registro
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'El correo ya está registrado'}), 400
    
    # --- CAMBIO SEGURIDAD: Encriptar contraseña ---
    hashed_password = generate_password_hash(data['password'])
    
    new_user = User(name=data['name'], email=data['email'], password=hashed_password, role='user')
    
    db.session.add(new_user)
    db.session.commit()

    # Enviar correo de notificación al ADMIN
    admin_email = os.environ.get('ADMIN_EMAIL') # Correo del dueño
    if admin_email:
        try:
            msg = Message("Nuevo Registro en FarmaWeb", recipients=[admin_email])
            msg.body = f"Se registró un nuevo usuario:\nNombre: {new_user.name}\nEmail: {new_user.email}"
            mail.send(msg)
        except Exception as e:
            print(f"Error enviando correo: {e}")

    return jsonify({'success': True, 'message': 'Usuario registrado', 'user': {'name': new_user.name, 'email': new_user.email, 'role': new_user.role}})

# 2. Login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    
    # --- CAMBIO SEGURIDAD: Buscar por email y verificar hash ---
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password, data['password']):
        return jsonify({'success': True, 'user': {'name': user.name, 'email': user.email, 'role': user.role}})
        
    return jsonify({'success': False, 'message': 'Credenciales incorrectas'}), 401

# 3. Actualizar Perfil (NUEVO)
@app.route('/api/user/update', methods=['PUT'])
def update_user():
    data = request.json
    email = data.get('email') # Usamos el email para buscar (idealmente sería ID/Token)
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
        
    if 'name' in data:
        user.name = data['name']
    if 'phone' in data:
        pass # Aquí podrías guardar el teléfono si agregas la columna a la DB
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'Perfil actualizado correctamente'})

# 4. Solicitar Recuperación de Contraseña (NUEVO)
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    
    if user:
        # Generar token válido por 1 hora
        token = serializer.dumps(email, salt='recover-password')
        link = url_for('reset_password_page', token=token, _external=True)
        
        try:
            msg = Message("Recuperar Contraseña - FarmaWeb", recipients=[email])
            msg.body = f"Hola {user.name},\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace:\n{link}\n\nSi no lo solicitaste, ignora este mensaje."
            mail.send(msg)
        except Exception as e:
            return jsonify({'success': False, 'message': 'Error al enviar correo'}), 500
            
    # Siempre decimos "enviado" por seguridad para no revelar qué emails existen
    return jsonify({'success': True, 'message': 'Si el correo existe, recibirás instrucciones.'})

# 5. Página para poner la nueva contraseña (Backend Render)
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password_page(token):
    try:
        email = serializer.loads(token, salt='recover-password', max_age=3600)
    except:
        return "<h1>El enlace ha expirado o es inválido.</h1>"

    if request.method == 'POST':
        new_password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user:
            # --- CAMBIO SEGURIDAD: Encriptar también al recuperar ---
            user.password = generate_password_hash(new_password)
            db.session.commit()
            return "<h1>Contraseña actualizada. Ya puedes iniciar sesión en la app.</h1>"
    
    # Formulario simple HTML incrustado para no crear otro archivo template
    return f'''
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h2>Restablecer Contraseña para {email}</h2>
        <form method="POST">
            <input type="password" name="password" placeholder="Nueva contraseña" required style="padding: 10px; width: 200px;">
            <br><br>
            <button type="submit" style="padding: 10px 20px; background: #2563eb; color: white; border: none; cursor: pointer;">Cambiar Contraseña</button>
        </form>
    </div>
    '''

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)