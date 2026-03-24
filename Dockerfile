FROM python:3.12-slim

# Evita arquivos .pyc e permite log em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    libpq-dev gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala bibliotecas
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# --- AQUI É O SEGREDO ---
# Primeiro: Copiamos TUDO (incluindo o seu JSON de dados)
COPY . /app/

# Segundo: Geramos os arquivos estáticos (CSS/JS)
RUN python manage.py collectstatic --no-input

# Terceiro: Comando de inicialização
# Ele vai rodar as migrações, carregar seus dados e ligar o servidor, TUDO DE UMA VEZ
CMD python manage.py migrate && \
    python manage.py loaddata dados_itapetinga.json --exclude contenttypes --exclude auth.permission && \
    gunicorn projeto_saude.wsgi:application --bind 0.0.0.0:8000