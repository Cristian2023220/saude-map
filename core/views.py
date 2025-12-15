from django.shortcuts import render
from .models import PontoSaude
from django.db.models import Count
import json

def mapa_view(request):
    # 1. Pede os dados ao Model
    pontos_queryset = PontoSaude.objects.all()
    
    # 2. Processa os dados (Usa o método do Model, não faz laço manual aqui)
    lista_pontos = [ponto.to_dict() for ponto in pontos_queryset]
    pontos_json = json.dumps(lista_pontos)

    # 3. Calcula estatísticas (Poderia ir para um Service, mas aqui está ok)
    stats_raw = PontoSaude.objects.values('tipo').annotate(total=Count('tipo'))
    stats = {item['tipo']: item['total'] for item in stats_raw}

    contexto = {
        'pontos_json': pontos_json,
        'total_hospitais': stats.get('HOSP', 0),
        'total_farmacias': stats.get('FARM', 0),
        'total_postos': stats.get('POST', 0),
        'total_upas': 0,
        'total_clinicas': 0,
    }

    # 4. Entrega para a View (Template)
    return render(request, 'index.html', contexto)