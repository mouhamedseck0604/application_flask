from flask import render_template, redirect, request, url_for, flash, session
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, EmailField, PasswordField,SubmitField
from wtforms.validators import DataRequired, length, Email
from . import app,db
from .model import  Utilisateur, Group, Message, GroupMembre, PrivateChat
from sqlalchemy import or_, and_
from flask_login import login_user
from flask_socketio import SocketIO, send, emit, join_room, leave_room
from datetime import datetime

#formulaire de connexion
class formulaireLogin(FlaskForm):
    email = EmailField('Email:')
    password = PasswordField('Mot de passe:', validators=[DataRequired()])
    submit = SubmitField('Se connecter')


#formulaire d'inscription
class formulaireIncrip(FlaskForm):
    fullname = StringField('Nom Complet:', validators=[DataRequired()] )
    email = EmailField('Email:')
    password = PasswordField('Mot de passe:', validators=[DataRequired()])
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
    users = Utilisateur.query.order_by(Utilisateur.fullname).all()
    if not users:
        return

    for viewer in users:
        viewer_id = viewer.id

        def _private_unread_count(partner_id):
            """Messages privés non lus reçus de partner_id par viewer_id."""
            chat_row = PrivateChat.query.filter_by(
                user_id=viewer_id, partner_id=partner_id
            ).first()
            if chat_row and chat_row.last_seen:
                return Message.query.filter(
                    Message.exp_id == partner_id,
                    Message.dest_id == viewer_id,
                    Message.timestamp > chat_row.last_seen,
                ).count()
            return Message.query.filter_by(
                exp_id=partner_id, dest_id=viewer_id
            ).count()

        # Liste contacts : aperçu + horodatage (comme les groupes) + compteur non lu + tri
        contacts_payload = []
        for usr in users:
            if usr.id == viewer_id:
                continue
            last_priv = (
                Message.query.filter(
                    or_(
                        and_(
                            Message.exp_id == viewer_id,
                            Message.dest_id == usr.id,
                        ),
                        and_(
                            Message.exp_id == usr.id,
                            Message.dest_id == viewer_id,
                        ),
                    )
                )
                .order_by(Message.timestamp.desc())
                .first()
            )
            preview = ""
            if last_priv and last_priv.contenu:
                preview = last_priv.contenu.strip()
                if len(preview) > 72:
                    preview = preview[:72] + "…"

            contacts_payload.append(
                {
                    "id": usr.id,
                    "fullname": usr.fullname,
                    "online": usr.id in online_users,
                    "unread": _private_unread_count(usr.id),
                    "last_message": preview,
                    "last_time": last_priv.timestamp.isoformat() if last_priv else None,
                }
            )

        contacts_payload.sort(
            key=lambda u: (u["unread"], u["last_time"] or ""),
            reverse=True,
        )

        groups_payload = []
        for gm in GroupMembre.query.filter_by(user_id=viewer_id).all():
            last_msg = (
                Message.query.filter_by(group_id=gm.group.id)
                .order_by(Message.timestamp.desc())
                .first()
            )
            if gm.last_seen:
                unread_count = Message.query.filter(
                    Message.group_id == gm.group.id,
                    Message.timestamp > gm.last_seen,
                    Message.exp_id != gm.user_id,
                ).count()
            else:
                unread_count = Message.query.filter(
                    Message.group_id == gm.group.id,
                    Message.exp_id != gm.user_id,
                ).count()

            groups_payload.append(
                {
                    "id": gm.group.id,
                    "nomGroup": gm.group.nomGroup,
                    "last_message": last_msg.contenu if last_msg else "",
                    "last_time": last_msg.timestamp.isoformat() if last_msg else None,
                    "unread": unread_count,
                }
            )

        groups_payload.sort(key=lambda g: g["last_time"] or "", reverse=True)

        payload = {
            "users": contacts_payload,
            "groups": groups_payload,
            "countOnline": len(online_users),
        }

        emit("update_members", payload, room=f"user_{viewer_id}")

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

    # Mettre à jour les compteurs "non lus" dans la sidebar
    broadcast_members()
    broadcast_members()

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
    # Mise à jour en temps réel des badges et derniers messages
    broadcast_members()

# messages lu
@socketio.on("messages_lu")
def mark_group_read(data):
    group_id = data["group_id"]
    user_id = data["user_id"]

    gm = GroupMembre.query.filter_by(group_id=group_id, user_id=user_id).first()
    if gm:
        gm.last_seen = datetime.utcnow()
        db.session.commit()
    broadcast_members()

@socketio.on("messages_prive_lu")
def mark_private_read(data):
    """
    Marque la conversation privée (viewer=user_id, partner=partner_id) comme lue
    afin de remettre le compteur 'unread' à zéro côté sidebar.
    """
    partner_id = data["partner_id"]
    viewer_id = data["user_id"]

    chat_row = PrivateChat.query.filter_by(user_id=viewer_id, partner_id=partner_id).first()
    if chat_row:
        chat_row.last_seen = datetime.utcnow()
    else:
        chat_row = PrivateChat(
            user_id=viewer_id,
            partner_id=partner_id,
            last_seen=datetime.utcnow(),
        )
        db.session.add(chat_row)

    db.session.commit()
    broadcast_members()