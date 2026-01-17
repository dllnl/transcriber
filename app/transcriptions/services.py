import os
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

_whisper_models = {}

def load_whisper_model(model_name='base'):
    if not WHISPER_AVAILABLE:
        raise RuntimeError("A biblioteca Whisper não está instalada. Instale com: pip install openai-whisper")

    if model_name in _whisper_models:
        return _whisper_models[model_name]
    
    try:
        print(f"Carregando modelo Whisper '{model_name}' (isso pode demorar na primeira vez)...")
        loaded_model = whisper.load_model(model_name)
        _whisper_models[model_name] = loaded_model
        print(f"Modelo Whisper '{model_name}' carregado com sucesso!")
        return loaded_model
    except Exception as e:
        print(f"Erro ao carregar modelo Whisper '{model_name}': {e}")
        raise e


from app.transcriptions.diarization import DiarizationService

import concurrent.futures

def transcribe_audio(filepath: str, model_name: str) -> dict:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Arquivo de áudio não encontrado em: {filepath}")

    try:
        model = load_whisper_model(model_name)
        
        print(f"Iniciando processamento paralelo (Whisper: {model_name} + Diarization)...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # Helper for Whisper since it requires kwargs
            def run_whisper():
                print(f"Iniciando transcrição com Whisper ({model_name})...")
                return model.transcribe(filepath, language='pt', task='transcribe')
            
            # Helper for Diarization
            def run_diarization():
                print("Iniciando diarização...")
                return DiarizationService.diarize(filepath)

            # Submit tasks
            future_whisper = executor.submit(run_whisper)
            future_diarization = executor.submit(run_diarization)
            
            # Wait for Whisper (Primary)
            try:
                whisper_result = future_whisper.result()
            except Exception as e:
                raise RuntimeError(f"Erro no Whisper: {e}")

            # Wait for Diarization (Secondary - can fail gracefully)
            diarization_segments = []
            try:
                diarization_segments = future_diarization.result()
            except Exception as e:
                print(f"Erro na diarização (ignorando): {e}")
                # We can continue without speaker labels

        transcription_text = whisper_result.get('text', '').strip()
        whisper_segments = whisper_result.get('segments', [])
        
        if not transcription_text:
            return {'error': 'Não foi possível transcrever o áudio. O arquivo pode estar vazio ou corrompido.'}

        # Merge results
        if diarization_segments:
            print("Fundindo segmentos de texto e oradores...")
            structured_data = merge_segments(whisper_segments, diarization_segments)
        else:
            print("Diarização falhou ou vazia, retornando apenas texto.")
            structured_data = [{"start": s["start"], "end": s["end"], "text": s["text"], "speaker": "Unknown"} for s in whisper_segments]

        return {
            'success': True,
            'transcription': transcription_text,
            'segments': structured_data,
            'model_used': f'whisper-{model_name}'
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'error': f'Erro durante a transcrição: {str(e)}'}

def merge_segments(whisper_segments, diarization_segments):
    """
    Merges Whisper text segments with Pyannote speaker segments based on time overlap.
    """
    merged = []
    
    for w_seg in whisper_segments:
        w_start = w_seg['start']
        w_end = w_seg['end']
        w_text = w_seg['text']
        
        # Find the speaker with the most overlap for this segment
        best_speaker = "Unknown"
        max_overlap = 0
        
        for d_seg in diarization_segments:
            # Calculate overlap
            start = max(w_start, d_seg['start'])
            end = min(w_end, d_seg['end'])
            overlap = max(0, end - start)
            
            if overlap > max_overlap:
                max_overlap = overlap
                best_speaker = d_seg['speaker']
        
        merged.append({
            "start": w_start,
            "end": w_end,
            "text": w_text,
            "speaker": best_speaker
        })
        
    return merged

