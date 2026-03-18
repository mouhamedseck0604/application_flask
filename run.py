from app import app
from app.model import init_db

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True,host='0.0.0.0',port=5005)