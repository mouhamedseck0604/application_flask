# Application Flask - Chat en temps réel

Application de messagerie instantanée développée avec Flask, Flask-SocketIO et MySQL. Elle permet la connexion, l'inscription, les messages privés et les discussions de groupe en temps réel.

## Fonctionnalités

- **Authentification** : Connexion et inscription des utilisateurs
- **Chat en temps réel** : Messagerie instantanée via WebSocket (Socket.IO)
- **Messages privés** : Conversation en tête-à-tête entre utilisateurs
- **Groupes** : Création de groupes et discussions collectives
- **Statut en ligne** : Affichage des utilisateurs connectés
- **Recherche** : Recherche de message ou de contact

## Prérequis

- **Python** 3.11 ou supérieur
- **MySQL** 8.0 (pour l'exécution locale)
- **Docker** et **Docker Compose** ( Pour l'exécution en conteneurs)

---

## Installation

### Option : Avec Docker (recommandé)

La méthode la plus simple pour lancer l'application avec sa base de données.

1. **Cloner le projet** dans un répertoire de votre choix.
   ```bash
   git clone https://github.com/mouhamedseck0604/application_flask.git
   cd application_flask
   ```

2. **Lancer l'application** :
   ```bash
   docker-compose up --build
   ```

3. **Accéder à l'application** : ouvrir [http://localhost:5005](http://localhost:5005) dans votre navigateur.

Les conteneurs incluent :
- L'application Flask sur le port **5005**
- MySQL 8.0 avec la base `chat_db`

> **Note** : Les variables d'environnement (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) sont définies dans `docker-compose.yml` et correspondent à la configuration de `config.py`.

---

## Structure du projet

```
application_flask/
├── app/
│   ├── __init__.py      # Initialisation Flask, SQLAlchemy, Login
│   ├── model.py         # Modèles (Utilisateur, Group, Message, etc.)
│   ├── view.py          # Routes et gestion Socket.IO
│   ├── static/          # CSS, JS, images
│   └── templates/       # Templates HTML
├── config.py            # Configuration (clé secrète, base de données)
├── run.py               # Point d'entrée de l'application
├── requirements.txt     # Dépendances Python
├── Dockerfile           # Image Docker de l'application
└── docker-compose.yml   # Orchestration Flask + MySQL
```

---

## Variables d'environnement (Docker)

| Variable   | Description          | Valeur par défaut |
|-----------|----------------------|-------------------|
| DB_HOST   | Hôte MySQL           | db_service        |
| DB_USER   | Utilisateur MySQL    | seck              |
| DB_PASSWORD | Mot de passe MySQL | seck123           |
| DB_NAME   | Nom de la base       | chat_db           |

---

## Technologies utilisées

- **Flask** 3.1 – Framework web
- **Flask-SocketIO** – Communication temps réel
- **Flask-SQLAlchemy** – ORM base de données
- **Flask-Login** – Gestion des sessions
- **Flask-WTF** – Formulaires et validation
- **MySQL / PyMySQL** – Base de données
- **Jinja2** – Moteur de templates

---

## Dépannage

**Erreur de connexion à la base de données**
- Vérifier que MySQL est démarré.
- Vérifier les identifiants dans `config.py`.
- Avec Docker : attendre quelques secondes que MySQL soit prêt avant la première requête.

**Port 5005 déjà utilisé**
- Modifier le port dans `run.py` et dans `docker-compose.yml` si vous utilisez Docker.

**WebSocket ne fonctionne pas**
- S'assurer que le serveur et le client utilisent le même protocole (HTTP/HTTPS).
- Vérifier la configuration des pare-feu ou proxys.

---

## Licence

Projet pédagogique - Application de chat distribué
