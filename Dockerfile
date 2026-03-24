# Use uma versão estável do Python
FROM python:3.12-slim

# Evita que o Python gere arquivos .pyc e permite log em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define a pasta de trabalho
WORKDIR /app

# Instala dependências do sistema necessárias para o PostgreSQL e Imagens
RUN apt-get update && apt-get install -y \
    libpq-dev gcc python3-dev musl-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala as bibliotecas do projeto
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . /app/


# Dá permissão de execução para o script
RUN chmod +x build.sh

# Executa o script de build
RUN ./build.sh

# Comando para iniciar o servidor
CMD ["gunicorn", "projeto_saude.wsgi:application", "--bind", "0.0.0.0:8000"]