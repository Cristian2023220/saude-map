from django.shortcuts import render
from .models import PontoSaude
from django.db.models import Count
from django.http import JsonResponse
#importações de autenticação
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .forms import PontoSaudeForm


@login_required # Protege essa view, só deixa acessar quem estiver logado
def adicionar_ponto(request):
    if request.method == 'POST':
        form = PontoSaudeForm(request.POST)
        if form.is_valid():
            form.save() # Salva no banco de dados!
            return redirect('mapa') # Volta para a tela inicial
    else:
        form = PontoSaudeForm()

    return render(request, 'adicionar_ponto.html', {'form': form})

# 1. View Principal (Carrega o HTML + Estatísticas dos Cards)
def mapa_view(request):
    # Calcula estatísticas para os cards
    stats_raw = PontoSaude.objects.values('tipo').annotate(total=Count('tipo'))
    stats = {item['tipo']: item['total'] for item in stats_raw}
    
    contexto = {
        'total_hospitais': stats.get('HOSP', 0),
        'total_farmacias': stats.get('FARM', 0),
        'total_postos': stats.get('POST', 0),
        'total_upas': stats.get('UPA', 0),
        'total_clinicas': stats.get('CLIN', 0),
    }
    return render(request, 'index.html', contexto)

def api_pontos(request):
    # Parâmetros do Usuário (GPS)
    user_lat = request.GET.get('lat')
    user_lng = request.GET.get('lng')
    filtro_tipo = request.GET.get('tipo', 'todos')
    
    # Parâmetros da Varredura (Limites da Tela)
    ne_lat = request.GET.get('ne_lat') # Canto Superior Direito
    ne_lng = request.GET.get('ne_lng')
    sw_lat = request.GET.get('sw_lat') # Canto Inferior Esquerdo
    sw_lng = request.GET.get('sw_lng')

    pontos = PontoSaude.objects.all()

    # 1. Filtro por Tipo
    if filtro_tipo != 'todos':
        pontos = pontos.filter(tipo=filtro_tipo)

    # 2. Filtro por Varredura (Bbox - Bounding Box)
    # Só filtra se o frontend mandou as coordenadas da tela
    if ne_lat and ne_lng and sw_lat and sw_lng:
        pontos = pontos.filter(
            latitude__lte=ne_lat,  # Menor que o topo
            latitude__gte=sw_lat,  # Maior que o fundo
            longitude__lte=ne_lng, # Menor que a direita
            longitude__gte=sw_lng  # Maior que a esquerda
        )

    lista_pontos = []
    
    for ponto in pontos:
        dados = ponto.to_dict()
        
        # Calcula distância (apenas se tivermos GPS do usuário)
        distancia = None
        if user_lat and user_lng:
            try:
                distancia = ponto.calcular_distancia(user_lat, user_lng)
            except (ValueError, TypeError):
                distancia = None
        
        dados['distancia_km'] = distancia
        lista_pontos.append(dados)

    # Ordenação por distância
    if user_lat and user_lng:
        lista_pontos.sort(key=lambda x: x['distancia_km'] if x['distancia_km'] is not None else float('inf'))

    return JsonResponse(lista_pontos, safe=False)