
from flask_login import  UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from . import app, db, login_manager
from datetime import datetime


class Utilisateur(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), unique=True,nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def __init__(self, fullname=None,email=None, password=None):
        if fullname:
            self.fullname = fullname
        if email:
            self.email = email
        if password:
            self.pwdcrypt(password)

    def pwdcrypt(self, password):
        """Hash le mot de passe et le stocke"""
        self.password_hash = generate_password_hash(password)

    def verifpwd(self, password):
        """Vérifie si le mot de passe correspond au hash"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<Utilisateur {self.fullname}>"

def init_db():
    db.drop_all()
    db.create_all()
    db.session.add(Utilisateur(fullname="mohameth",email="seck@gmail.com", password="passer"))
    db.session.add(Utilisateur(fullname="ibou",email="ibou@gmail.com", password="ndao"))
    db.session.add(Utilisateur(fullname="aliou",email="aliou@gmail.com", password="fall"))
    db.session.add(Utilisateur(fullname="momath",email="momath@gmail.com", password="seck"))
    db.session.add(Utilisateur(fullname="tima",email="tima@gmail.com", password="tima"))
    db.session.commit()

@login_manager.user_loader
def load_user(id):
    return Utilisateur.query.get(int(id))

class Group(UserMixin,db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nomGroup = db.Column(db.String(100), unique=True, nullable=False)


class GroupMembre(UserMixin,db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('utilisateur.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)

    #cette ligne permet depuis l'objet GroupeMembre de pouvoir accéder directement l'utilisateur associé via .user
    #<<backref='groups'>> l'objet Utilisateur aura automatiquement l'attribut .groups qui liste toutes ses appartenances
    user = db.relationship('Utilisateur', backref='groups')
    # De meme pour cette ligne ci-dessous pour ce qui concerne les groupes
    group = db.relationship('Group', backref='membres')


class Message(UserMixin,db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exp_id = db.Column(db.Integer, db.ForeignKey('utilisateur.id'), nullable=False)
    dest_id = db.Column(db.Integer, db.ForeignKey('utilisateur.id'), nullable=True)   # pour les messages privés
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=True)      # pour les messages de groupe
    contenu = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    exp = db.relationship('Utilisateur', foreign_keys=[exp_id])
    dest = db.relationship('Utilisateur', foreign_keys=[dest_id])
    group = db.relationship('Group')

with app.app_context(): db.create_all()