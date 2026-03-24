import json
from urllib.parse import urlencode
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.db.models import Count
from authlib.integrations.django_client import OAuth
from .forms import PontoSaudeForm
from .models import Medicamento, Medico, PontoSaude, ProdutoGratuito

# --- CONFIGURAÇÃO DO AUTH0 ---
oauth = OAuth()
oauth.register(
    "auth0",
    client_id=settings.AUTH0_CLIENT_ID,
    client_secret=settings.AUTH0_CLIENT_SECRET,
    client_kwargs={"scope": "openid profile email"},
    server_metadata_url=f"https://{settings.AUTH0_DOMAIN}/.well-known/openid-configuration",
)


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
    ne_lat = request.GET.get('ne_lat')
    ne_lng = request.GET.get('ne_lng')
    sw_lat = request.GET.get('sw_lat')
    sw_lng = request.GET.get('sw_lng')

    pontos = PontoSaude.objects.all()

    # 1. Filtro por Tipo
    if filtro_tipo != 'todos':
        pontos = pontos.filter(tipo=filtro_tipo)

    # 2. Filtro por Varredura (Bbox - Bounding Box)
    if ne_lat and ne_lng and sw_lat and sw_lng:
        pontos = pontos.filter(
            latitude__lte=ne_lat,
            latitude__gte=sw_lat,
            longitude__lte=ne_lng,
            longitude__gte=sw_lng
        )

    lista_pontos = []
    for ponto in pontos:
        dados = ponto.to_dict()
        distancia = None
        if user_lat and user_lng:
            try:
                distancia = ponto.calcular_distancia(user_lat, user_lng)
            except (ValueError, TypeError):
                distancia = None

        dados['distancia_km'] = distancia
        lista_pontos.append(dados)

    if user_lat and user_lng:
        lista_pontos.sort(
            key=lambda x: x['distancia_km'] if x['distancia_km'] is not None else float('inf'))

    return JsonResponse(lista_pontos, safe=False)


# --- ÁREA DO COLABORADOR ---


@user_passes_test(lambda u: u.is_staff)
def adicionar_ponto(request):
    if request.method == 'POST':
        form = PontoSaudeForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('mapa')
    else:
        form = PontoSaudeForm()

    return render(request, 'adicionar_ponto.html', {'form': form})
    if request.method == 'POST':
        form = PontoSaudeForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('mapa')
    else:
        form = PontoSaudeForm()

    return render(request, 'adicionar_ponto.html', {'form': form})


@user_passes_test(lambda u: u.is_staff)
def adicionar_item_painel(request, ponto_id):
    if request.method == 'POST':
        try:
            dados = json.loads(request.body)
            ponto = PontoSaude.objects.get(id=ponto_id)
            tipo_item = dados.get('tipo_item')
            nome = dados.get('nome')

            if tipo_item == 'medico':
                # Problema 2: Garante que a especialidade seja salva (ou usa um padrão)
                especialidade = dados.get('especialidade') or 'Clínico Geral'
                Medico.objects.create(
                    ponto=ponto,
                    nome=nome,
                    especialidade=especialidade
                )

            elif tipo_item == 'medicamento':
                # Problema 1: Agora aceita o True/False direto do JavaScript
                # Se não vier nada, ele assume True (Disponível) por padrão
                is_disponivel = dados.get('disponivel', True)
                Medicamento.objects.create(
                    ponto=ponto,
                    nome=nome,
                    disponivel=is_disponivel
                )

            elif tipo_item == 'produto':
                is_disponivel = dados.get('disponivel', True)
                ProdutoGratuito.objects.create(
                    ponto=ponto,
                    nome=nome,
                    disponivel=is_disponivel
                )

            return JsonResponse({'status': 'sucesso'})

        except PontoSaude.DoesNotExist:
            return JsonResponse({'status': 'erro', 'mensagem': 'Local não encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'erro', 'mensagem': str(e)}, status=400)

    return JsonResponse({'status': 'invalido'}, status=405)


@user_passes_test(lambda u: u.is_staff)
def excluir_item_painel(request, tipo_item, item_id):
    if request.method == 'POST':
        try:
            modelos = {
                'medico': Medico,
                'medicamento': Medicamento,
                'produto': ProdutoGratuito
            }
            model = modelos.get(tipo_item)
            if model:
                item = model.objects.get(id=item_id)
                item.delete()
                return JsonResponse({'status': 'sucesso'})
            return JsonResponse({'status': 'erro', 'mensagem': 'Tipo inválido'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'erro', 'mensagem': str(e)}, status=400)


@user_passes_test(lambda u: u.is_staff)
def alternar_disponibilidade_item(request, tipo_item, item_id):
    if request.method == 'POST':
        try:
            # Apenas Medicamento e Produto têm o campo 'disponivel'
            modelos = {'medicamento': Medicamento, 'produto': ProdutoGratuito}
            model = modelos.get(tipo_item)
            if model:
                item = model.objects.get(id=item_id)
                # Inverte o valor (True vira False e vice-versa)
                item.disponivel = not item.disponivel
                item.save()
                return JsonResponse({'status': 'sucesso', 'novo_estado': item.disponivel})
            return JsonResponse({'status': 'erro'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'erro', 'mensagem': str(e)}, status=400)

# --- VIEWS DE LOGIN EXTERNO (AUTH0) ---


def auth0_login(request):
    redirect_uri = request.build_absolute_uri('/callback/')
    return oauth.auth0.authorize_redirect(request, redirect_uri)


def auth0_callback(request):
    # Se o usuário clicou em "Recusar" ou houve algum erro no Auth0
    if request.GET.get('error'):
        # Redireciona de forma silenciosa de volta para a tela inicial
        return redirect('mapa')

    # 2. FLUXO NORMAL DE LOGIN
    try:
        token = oauth.auth0.authorize_access_token(request)
        user_info = token.get('userinfo')

        username = user_info.get('nickname') or user_info.get('name')
        email = user_info.get('email')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email}
        )

        django_login(request, user)
        return redirect('mapa')

    except Exception as e:
        return redirect('mapa')

    django_login(request, user)
    return redirect('mapa')


def logout(request):

    django_logout(request)

    auth0_domain = 'dev-cristian220.us.auth0.com'
    client_id = 'J9ShfRboQZtRLaWencCSTqshcxT8bWSZ'
    return_to = 'https://saude-map.onrender.com/'

    logout_url = f"https://{auth0_domain}/v2/logout?" + urlencode(
        {
            "returnTo": return_to,
            "client_id": client_id,
        },
        quote_via=urlencode
    )

    return redirect(logout_url)
