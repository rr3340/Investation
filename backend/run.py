from backend.main import create_app
from backend.config import DevConfig

if __name__ == '__main__':
    app = create_app(DevConfig)
    app.run(debug=True, threaded=True)