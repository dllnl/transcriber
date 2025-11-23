import os
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    # Se o whisper não estiver instalado, as funções falharão, mas a aplicação poderá iniciar.
    WHISPER_AVAILABLE = False

# Dicionário para manter os modelos Whisper carregados em memória (cache)
_whisper_models = {}

def load_whisper_model(model_name='base'):
    """
    Carrega um modelo Whisper específico. Se o modelo já foi carregado,
    retorna a instância em cache.
    """
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
        # Lançar a exceção para que a rota que chamou possa lidar com ela
        raise e

def transcribe_audio(filepath: str, model_name: str) -> dict:
    """
    Transcreve um arquivo de áudio usando o modelo Whisper especificado.

    :param filepath: Caminho para o arquivo de áudio.
    :param model_name: Nome do modelo Whisper a ser usado (ex: 'base', 'small').
    :return: Um dicionário contendo a transcrição e outras informações.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Arquivo de áudio não encontrado em: {filepath}")

    try:
        model = load_whisper_model(model_name)
        
        print(f"Transcrevendo com Whisper (modelo: {model_name})...")
        
        # Executa a transcrição
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
        # Captura qualquer erro durante o carregamento ou transcrição
        return {'error': f'Erro durante a transcrição: {str(e)}'}
