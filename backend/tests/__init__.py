import sys
import os
from pathlib import Path

# Add the backend directory to Python path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Verify modules can be imported
try:
    from utils.helpers import sanitize_filename
    print(f"✅ Backend modules available: {BACKEND_DIR}")
except ImportError as e:
    print(f"❌ Failed to import backend modules: {e}")
    print(f"   Current sys.path: {sys.path}")
    raise