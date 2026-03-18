from flask import render_template, redirect, request, url_for, flash, session
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, EmailField, PasswordField,SubmitField
from wtforms.validators import DataRequired, length, Email
from . import app,db
from .model import  Utilisateur, Group, Message, GroupMembre
from flask_login import login_user
from flask_socketio import SocketIO, send, emit, join_room, leave_room


#formulaire de connexion
class formulaireLogin(FlaskForm):
    email = EmailField('Email')
    password = PasswordField('password', validators=[DataRequired()])
    submit = SubmitField('Se connecter')


#formulaire d'inscription
class formulaireIncrip(FlaskForm):
    fullname = StringField('fullname', validators=[DataRequired()] )
    email = EmailField('Email')
    password = PasswordField('password', validators=[DataRequired()])
    submit = SubmitField("s'inscrire")

@app.route("/", methods=["POST","GET"])
def login():
    form = formulaireLogin()
    if form.validate_on_submit():
        User = Utilisateur.query.filter_by(email=form.email.data).first()
        if User and User.verifpwd(form.password.data):
            login_user(User)
            session['user_id'] = User.id
            return redirect(url_for("chat"))
    return render_template('index.html', form=form)

@app.route("/register", methods=["POST","GET"])
def register():
    inscrip = formulaireIncrip()
    if inscrip.validate_on_submit():
        fullname = inscrip.fullname.data
        email = inscrip.email.data
        mdp = inscrip.password.data
        user = Utilisateur.query.filter_by(email=email).first()
        if user:
            flash("Ce nom d'utilisateur existe déjà", "danger")
            return redirect(url_for("register"))
        else: 
            db.session.add(Utilisateur(fullname=fullname,email=email,password=mdp))
            db.session.commit()
            flash("Inscription reuissi", "success")
            return redirect(url_for('login'))
    return render_template('register.html',inscrip=inscrip)

@app.route('/acceuil')
def accueil():
    return render_template('acceuil.html')

@app.route("/chat")
def chat():
    return render_template("chat.html")
    
socketio= SocketIO(app)

@socketio.on('message')
def envMessage(msg):
    print("message reçu: "+ msg)
    user= Utilisateur()
    emit('message',msg, broadcast=True, include_self=False)

@socketio.on('typing')
def get_mes_typing():
    # Diffuser à tous sauf l'expéditeur
    emit('typing', broadcast=True, include_self=False)

@socketio.on('stopTyping')
def get_mes_stop_typing():
    emit('stopTyping', broadcast=True, include_self=False)

#liste des Utilisateurs

online_users = set()

@socketio.on('join')
def on_join(data):
    user_id = data['user_id']
    online_users.add(user_id)
    join_room(f"user_{user_id}")  #  chaque utilisateur a sa room privée
    broadcast_members()

@socketio.on('disconnect')
def on_disconnect():
    user_id = getattr(session, 'user_id', None)
    if user_id in online_users:
        online_users.remove(user_id)
    broadcast_members()

def broadcast_members():
    users = Utilisateur.query.all()
    for u in users:
        # Récupérer les groupes dont l’utilisateur est membre
        groupes_membre = GroupMembre.query.filter_by(user_id=u.id).all()

        payload = {
            "users": [
                {"id": usr.id, "fullname": usr.fullname, "online": usr.id in online_users}
                for usr in users
            ],
            "groups": [
                {"id": gm.group.id, "nomGroup": gm.group.nomGroup}
                for gm in groupes_membre
            ],
            "countOnline": len(online_users)   # ajout du compteur
        }

        # Envoyer uniquement à l’utilisateur concerné
        emit("update_members", payload, room=f"user_{u.id}")

@socketio.on('load_private')
def load_private(data):
    from_id = data['from']
    to_id = data['to']

    # récupérer les messages entre from_id et to_id
    messages = Message.query.filter(
        ((Message.exp_id == from_id) & (Message.dest_id == to_id)) |
        ((Message.exp_id == to_id) & (Message.dest_id == from_id))
    ).order_by(Message.timestamp.asc()).all()

    payload = [{"exp": m.exp_id, "text": m.contenu, "time": m.timestamp.strftime("%H:%M")} for m in messages]

    emit('private_history', payload)

@socketio.on('message_prive')
def message_prive(data):
    from_id = data['exp']
    to_id = data['dest']
    text = data['mes']

    # Sauvegarde en base si tu as un modèle Message
    msg = Message(exp_id=from_id, dest_id=to_id, contenu=text)
    db.session.add(msg)
    db.session.commit()

    # Envoyer uniquement au destinataire
    emit('private_message', {
        "exp": from_id,
        "mes": text,
        "time": msg.timestamp.strftime("%H:%M")
    }, room=f"user_{to_id}")

# ======= creation de groupe ========
# recuperation des utilisateur pour les afficher lors de la creation de groupe
@socketio.on('get_users')
def get_users():
    users = Utilisateur.query.all()
    chargement = [{"id":u.id, "fullname": u.fullname} for u in users]
    emit('users_list', chargement)

@socketio.on("create_group")
def create_group(data):
    name = data["name"]
    members = data["members"]

    group = Group(nomGroup=name)
    db.session.add(group)
    db.session.commit()

    for user_id in members:
        gm = GroupMembre(group_id=group.id, user_id=user_id)
        db.session.add(gm)

    db.session.commit()
    broadcast_members()

@socketio.on("load_group")
def load_group(data):
    group_id = data["group_id"]

    messages = Message.query.filter_by(group_id=group_id).order_by(Message.timestamp.asc()).all()
    payload = [
        {"exp": m.exp_id, "text": m.contenu,"sender": m.exp.fullname,   # ajout du nom
            "time": m.timestamp.strftime("%H:%M")}
        for m in messages
    ]
    emit("group_history", payload)

@socketio.on("join_group")
def join_group(data):
    group_id = data["group_id"]
    user_id = data["user_id"]

    # Ajouter l’utilisateur dans la room du groupe
    join_room(f"group_{group_id}")

    emit("system_message", {
        "mes": f"Utilisateur {user_id} a rejoint le groupe {group_id}"
    }, room=f"group_{group_id}")

@socketio.on("message_group")
def message_group(data):
    from_id = data["exp"]
    group_id = data["dest"]
    text = data["mes"]

    # Sauvegarde en base
    msg = Message(exp_id=from_id, group_id=group_id, contenu=text)
    db.session.add(msg)
    db.session.commit()

    sender = Utilisateur.query.get(from_id)

    # Diffuser à tous les membres connectés à la room du groupe
    emit("group_message", {
        "exp": from_id,
        "sender": sender.fullname,
        "mes": text,
        "time": msg.timestamp.strftime("%H:%M"),
        "group": group_id
    }, room=f"group_{group_id}")
