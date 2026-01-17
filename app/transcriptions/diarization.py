
import os
import torch
from pyannote.audio import Pipeline

# Singleton instance to avoid reloading model
_diarization_pipeline = None

from flask import current_app

class DiarizationService:
    @staticmethod
    def get_pipeline():
        global _diarization_pipeline
        if _diarization_pipeline is None:
            # Try to get from app config (if in context), fallback to env
            try:
                hf_token = current_app.config.get("HF_TOKEN")
            except RuntimeError:
                # If queried outside app context
                hf_token = os.environ.get("HF_TOKEN")
            if not hf_token:
                print("WARNING: HF_TOKEN not found. Diarization model download might fail if not cached.")
            
            print("Loading Diarization Pipeline (pyannote/speaker-diarization-3.1)...")
            try:
                _diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    token=hf_token
                )
                
                # Use GPU if available
                if torch.cuda.is_available():
                    _diarization_pipeline.to(torch.device("cuda"))
                    print("Diarization using CUDA")
                else:
                    print("Diarization using CPU")
                    
            except Exception as e:
                print(f"Error loading diarization pipeline: {e}")
                raise e
                
        return _diarization_pipeline

    @staticmethod
    def diarize(audio_path):
        """
        Performs speaker diarization on an audio file.
        Returns a list of segments: [{'start': float, 'end': float, 'speaker': str}]
        """
        pipeline = DiarizationService.get_pipeline()
        
        # Run inference
        diarization = pipeline(audio_path)
        
        segments = []
        # "turn" is the segment, "track" is the speaker ID, "speaker" is the speaker label
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker
            })
            
        return segments
