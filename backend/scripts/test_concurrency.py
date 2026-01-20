
import threading
import time
import os
import sys

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.transcriptions.services import transcribe_audio

def test_transcribe(name, filepath, model_name):
    print(f"[{name}] Starting transcription...")
    try:
        start_time = time.time()
        result = transcribe_audio(filepath, model_name)
        end_time = time.time()
        if result.get('success'):
            print(f"[{name}] Success in {end_time - start_time:.2f}s")
        else:
            print(f"[{name}] Failed: {result.get('error')}")
    except Exception as e:
        print(f"[{name}] Error: {e}")

if __name__ == "__main__":
    # Use an existing file from the uploads folder
    uploads_dir = r"C:\Users\guilh\dev\transcriber\instance\uploads"
    files = [f for f in os.listdir(uploads_dir) if f.endswith('.wav')]
    
    if not files:
        print("No .wav files found in instance/uploads to test with.")
        sys.exit(1)
        
    test_file = os.path.join(uploads_dir, files[0])
    print(f"Testing with: {test_file}")
    
    # Start two transcriptions in parallel threads
    t1 = threading.Thread(target=test_transcribe, args=("Task 1", test_file, "base"))
    t2 = threading.Thread(target=test_transcribe, args=("Task 2", test_file, "base"))
    
    t1.start()
    t2.start()
    
    t1.join()
    t2.join()
    print("Test complete.")
