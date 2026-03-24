# Usa Python 3.12 que é compatível com Django 6.0
FROM python:3.12-slim

# Configurações para logs em tempo real e performance
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DOCKER_BUILD 1

WORKDIR /app

# Instala as ferramentas de sistema para o banco de dados
RUN apt-get update && apt-get install -y \
    libpq-dev gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala as bibliotecas do requirements.txt
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o seu projeto para dentro do Docker (incluindo o seu JSON de dados)
COPY . /app/

# Coleta os arquivos estáticos (CSS/JS) durante a montagem da imagem
RUN python manage.py collectstatic --no-input

# --- O PULO DO GATO ---
# O comando abaixo roda as migrações, carrega seus dados e liga o servidor
# Tudo em uma única linha de comando no final
CMD python manage.py migrate && \
    python popular_banco.py && \
    gunicorn projeto_saude.wsgi:application --bind 0.0.0.0:8000