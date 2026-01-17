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

def transcribe_audio(filepath: str, model_name: str) -> dict:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Arquivo de áudio não encontrado em: {filepath}")

    try:
        model = load_whisper_model(model_name)
        
        print(f"Transcrevendo com Whisper (modelo: {model_name})...")
        
        result = model.transcribe(
            filepath,
            language='pt',
            task='transcribe'
        )
        
        transcription_text = result.get('text', '').strip()
        
        if not transcription_text:
            return {'error': 'Não foi possível transcrever o áudio. O arquivo pode estar vazio ou corrompido.'}

        return {
            'success': True,
            'transcription': transcription_text,
            'model_used': f'whisper-{model_name}'
        }

    except Exception as e:
        return {'error': f'Erro durante a transcrição: {str(e)}'}
