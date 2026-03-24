#!/usr/bin/env bash
# Sair imediatamente se um comando falhar
set -o errexit

# Instala as dependências
pip install -r requirements.txt

# Organiza os arquivos estáticos (CSS/JS)
python manage.py collectstatic --no-input

# Aplica as migrações do banco de dados
python manage.py migrate

# IMPORTANTE: Carrega os dados de Itapetinga
# Usamos o --exclude para evitar aquele erro de duplicidade que você viu
python manage.py loaddata dados_itapetinga.json --exclude contenttypes --exclude auth.permission