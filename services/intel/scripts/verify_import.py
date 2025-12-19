#!/usr/bin/env python3
"""
Diagnostic script to verify Python can import app.main.
Run this from services/intel/ directory.
"""
import os
import sys
from pathlib import Path

print("=" * 60)
print("IMPORT DIAGNOSTICS")
print("=" * 60)

# Current working directory
cwd = os.getcwd()
print(f"\n1. Current working directory: {cwd}")

# sys.path
print(f"\n2. sys.path:")
for i, path in enumerate(sys.path):
    print(f"   [{i}] {path}")

# List directory contents
print(f"\n3. Contents of current directory ('.'):")
try:
    items = os.listdir(".")
    for item in sorted(items):
        item_path = Path(item)
        item_type = "DIR" if item_path.is_dir() else "FILE"
        print(f"   {item_type:4} {item}")
except Exception as e:
    print(f"   ERROR: {e}")

# Check if app directory exists
print(f"\n4. Checking for 'app' directory:")
app_exists = os.path.exists("app")
app_is_dir = os.path.isdir("app")
print(f"   app exists: {app_exists}")
print(f"   app is directory: {app_is_dir}")

if app_exists and app_is_dir:
    print(f"\n5. Contents of 'app' directory:")
    try:
        app_items = os.listdir("app")
        for item in sorted(app_items):
            item_path = Path(f"app/{item}")
            item_type = "DIR" if item_path.is_dir() else "FILE"
            print(f"   {item_type:4} app/{item}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Check for main.py
    main_py_exists = os.path.exists("app/main.py")
    print(f"\n6. app/main.py exists: {main_py_exists}")
    
    if main_py_exists:
        print(f"   Full path: {os.path.abspath('app/main.py')}")
else:
    print(f"\n5. 'app' directory NOT FOUND in current directory!")

# Try to import
print(f"\n7. Attempting imports:")
print("   Trying: import app")
try:
    import app
    print("   ✅ import app: SUCCESS")
    print(f"   app module location: {app.__file__}")
except Exception as e:
    print(f"   ❌ import app: FAILED")
    print(f"   Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("   Trying: import app.main")
try:
    import app.main
    print("   ✅ import app.main: SUCCESS")
    print(f"   app.main module location: {app.main.__file__}")
except Exception as e:
    print(f"   ❌ import app.main: FAILED")
    print(f"   Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("   Trying: from app.main import app")
try:
    from app.main import app
    print("   ✅ from app.main import app: SUCCESS")
    print(f"   app type: {type(app)}")
except Exception as e:
    print(f"   ❌ from app.main import app: FAILED")
    print(f"   Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ IMPORT_OK - All imports successful!")
print("=" * 60)
sys.exit(0)

