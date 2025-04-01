from backend.main import create_app
from backend.config import DevConfig

app = create_app(DevConfig)

if __name__ == "__main__":
    app.run()