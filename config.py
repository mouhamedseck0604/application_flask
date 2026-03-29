import os
from urllib.parse import quote_plus
SECRET_KEY = '#d#JCATTW\nilK\\7m\x0bp#\tj~#S'

# Database initialization
#basedir = os.path.abspath(os.path.dirname(__file__))
#SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'app.db')

#SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost/chat_db'

# Database: utilise les variables d'environnement en Docker, sinon configuration locale
db_host = os.environ.get("DB_HOST", "localhost")
db_user = os.environ.get("DB_USER", "root")
db_password = quote_plus(os.environ.get("DB_PASSWORD", "") or "")
db_name = os.environ.get("DB_NAME", "chat_db")

SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}"

