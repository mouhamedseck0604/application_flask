import os
SECRET_KEY = '#d#JCATTW\nilK\\7m\x0bp#\tj~#S'

# Database initialization
#basedir = os.path.abspath(os.path.dirname(__file__))
#SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'app.db')

SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost/chat_db'