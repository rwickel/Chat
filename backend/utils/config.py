import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploaded_files")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def user_dir(user_id: str):
    path = os.path.join(UPLOADS_DIR, user_id)
    os.makedirs(path, exist_ok=True)
    return path