
import os
import insightface
from insightface.app import FaceAnalysis

def download_models():
    print("=== Manual Model Downloader ===")
    
    # 1. Try AntelopeV2
    print("\n[1/2] Attempting to download 'antelopev2'...")
    try:
        app = FaceAnalysis(name='antelopev2', providers=['CPUExecutionProvider'])
        # Prepare triggers download
        app.prepare(ctx_id=0)
        print("✅ 'antelopev2' downloaded successfully!")
    except Exception as e:
        print(f"❌ 'antelopev2' failed: {e}")
        print("   (This is expected if you don't have access to deepinsight private models)")

    # 2. Try Buffalo_L (Default)
    print("\n[2/2] Attempting to download 'buffalo_l' (Standard)...")
    try:
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0)
        print("✅ 'buffalo_l' downloaded successfully!")
    except Exception as e:
        print(f"❌ 'buffalo_l' failed: {e}")
        print("   Check your internet connection.")

    print("\nDone. If at least one succeeded, the service should work.")

if __name__ == "__main__":
    download_models()
