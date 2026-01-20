import os
import threading
import queue
from typing import Callable, Dict, Any
from app.extensions import db
from app.transcriptions.models import Transcription
from flask import current_app

class TranscriptionTaskQueue:
    """
    Thread-safe task queue manager for background transcription processing.
    Limits concurrent workers to 3 and queues additional tasks.
    """
    
    def __init__(self, app=None, max_workers=3):
        self.max_workers = max_workers
        self.task_queue = queue.Queue()
        self.active_workers = 0
        self.lock = threading.Lock()
        self._shutdown = False
        self.app = app # Store app instance to create contexts
        
        # Start the queue processor thread
        self.processor_thread = threading.Thread(target=self._process_queue, daemon=True)
        self.processor_thread.start()
        print(f"[*] TranscriptionTaskQueue initialized with {max_workers} workers.")
    
    def submit_task(self, transcription_id: int, filepath: str, model_name: str):
        """
        Submit a transcription task to the queue.
        
        Args:
            transcription_id: ID of the transcription record
            filepath: Path to the audio file
            model_name: Whisper model to use
        """
        task = {
            'transcription_id': transcription_id,
            'filepath': filepath,
            'model_name': model_name
        }
        self.task_queue.put(task)
        print(f"Task {transcription_id} added to queue. Queue size: {self.task_queue.qsize()}")
    
    def _process_queue(self):
        """Background thread that processes tasks from the queue."""
        while not self._shutdown:
            try:
                # Wait for a task (blocking with timeout)
                task = self.task_queue.get(timeout=1)
                
                # Wait until we have an available worker slot
                while True:
                    with self.lock:
                        if self.active_workers < self.max_workers:
                            self.active_workers += 1
                            break
                    threading.Event().wait(0.5)  # Wait before checking again
                
                # Start worker thread for this task
                worker = threading.Thread(
                    target=self._execute_task,
                    args=(task,),
                    daemon=True
                )
                worker.start()
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error in queue processor: {e}")
    
    def _execute_task(self, task: Dict[str, Any]):
        """
        Execute a single transcription task.
        """
        transcription_id = task['transcription_id']
        filepath = task['filepath']
        model_name = task['model_name']
        
        try:
            # Import here to avoid circular imports
            from app.transcriptions.services import transcribe_audio
            
            # Use the stored app instance if available, otherwise we'll have to create one (risky)
            if not self.app:
                print("[!] Warning: No app instance available in task worker. This might cause issues.")
                from app import create_app
                self.app = create_app()

            with self.app.app_context():
                # Update status to processing
                transcription = Transcription.query.get(transcription_id)
                if transcription:
                    transcription.status = 'processing'
                    transcription.progress = 10
                    db.session.commit()
                
                print(f"[*] Transcription {transcription_id}: Starting processing with model {model_name}")
                
                # Perform transcription
                result = transcribe_audio(filepath, model_name)
                
                # Update database with results
                transcription = Transcription.query.get(transcription_id)
                if transcription:
                    if result.get('error'):
                        transcription.status = 'failed'
                        transcription.error_message = result['error']
                        transcription.progress = 0
                    else:
                        transcription.status = 'completed'
                        transcription.text = result['transcription']
                        transcription.structured_data = result.get('segments')
                        transcription.progress = 100
                    
                    db.session.commit()
                    print(f"[✓] Transcription {transcription_id} completed. Status: {transcription.status}")
                
        except Exception as e:
            print(f"[!] Error executing task {transcription_id}: {e}")
            import traceback
            traceback.print_exc()
            
            if self.app:
                with self.app.app_context():
                    transcription = Transcription.query.get(transcription_id)
                    if transcription:
                        transcription.status = 'failed'
                        transcription.error_message = str(e)
                        transcription.progress = 0
                        db.session.commit()
        
        finally:
            # Release worker slot
            with self.lock:
                self.active_workers -= 1
            print(f"[*] Worker released. Active workers: {self.active_workers}")
    
    def get_queue_info(self):
        """Get information about the current queue state."""
        with self.lock:
            return {
                'active_workers': self.active_workers,
                'queued_tasks': self.task_queue.qsize(),
                'max_workers': self.max_workers
            }
    
    def shutdown(self):
        """Gracefully shutdown the queue processor."""
        self._shutdown = True
        if self.processor_thread.is_alive():
            self.processor_thread.join(timeout=5)


# Global instance
_task_queue = None

def get_task_queue(app=None) -> TranscriptionTaskQueue:
    """Get or create the global task queue instance."""
    global _task_queue
    if _task_queue is None:
        _task_queue = TranscriptionTaskQueue(app=app, max_workers=3)
    elif app and _task_queue.app is None:
        _task_queue.app = app
    return _task_queue

def recover_ghost_tasks(app):
    """
    Finds transcriptions that were left 'pending' or 'processing' 
    (ghost tasks from a crash/restart) and re-queues them.
    """
    with app.app_context():
        # Avoid circular import
        from app.auth.user_preferences import UserPreferences
        
        ghost_tasks = Transcription.query.filter(Transcription.status.in_(['pending', 'processing'])).all()
        if not ghost_tasks:
            return
            
        print(f"[*] Found {len(ghost_tasks)} ghost tasks. Re-queuing for background processing...")
        queue = get_task_queue(app=app)
        
        for task in ghost_tasks:
            # Try to get the user's preferred model
            prefs = UserPreferences.query.filter_by(user_id=task.user_id).first()
            model_name = prefs.whisper_model if prefs else 'base'
            
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], task.filename)
            
            # Reset status to pending to ensure clean start
            task.status = 'pending'
            task.progress = 0
            task.error_message = None
            
            # Check if file exists before queuing
            if os.path.exists(filepath):
                queue.submit_task(task.id, filepath, model_name)
            else:
                print(f"[!] Warning: File for task {task.id} not found at {filepath}. Marking as failed.")
                task.status = 'failed'
                task.error_message = "Arquivo original não encontrado no servidor para processamento."
        
        db.session.commit()
