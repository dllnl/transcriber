# Fase 1: Usar uma imagem Python oficial como base
# A tag 'slim' resulta em uma imagem menor, o que é bom para produção
FROM python:3.11-slim

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Instalar dependências do sistema, se necessário (ex: ffmpeg para o whisper)
# O Whisper usa ffmpeg para converter formatos de áudio. É uma boa prática incluí-lo.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Copiar o arquivo de dependências primeiro para aproveitar o cache do Docker
# Se o requirements.txt não mudar, o Docker não reinstalará as dependências
COPY requirements.txt .

# Instalar as dependências do Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o resto do código da aplicação para o diretório de trabalho
COPY app/ ./app/
COPY run.py .

# Expor a porta em que o Gunicorn irá rodar
EXPOSE 5000

# Comando para executar a aplicação usando Gunicorn
# --bind: Define o endereço e a porta (0.0.0.0 para ser acessível de fora do container)
# --workers: Número de processos para lidar com requisições. 3 é um bom começo.
# "app:create_app()": Aponta para a nossa factory function. O Gunicorn irá chamá-la.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers=3", "app:create_app()"]
