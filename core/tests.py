from django.test import TestCase, Client
from django.contrib.auth.models import User


# //  --- TESTE DE SEGURANÇA: VERIFICA SE USUÁRIOS COMUNS NÃO CONSEGUEM ACESSAR PÁGINAS RESTRITAS --- //

# TESTE DE AUTORIZAÇÃO
class SegurancaTest(TestCase):
    def setUp(self):
        # Cria um usuário que NÃO é staff
        self.usuario_comum = User.objects.create_user(
            username='invasor', password='123')
        self.client = Client()

    def test_acesso_negado_ao_colaborador(self):
        # Tenta acessar a página de adicionar local sem permissão
        self.client.login(username='invasor', password='123')
        response = self.client.get('/adicionar-ponto/')

        # O teste passa se o status for 302 (redirecionar) ou 403 (proibido)
        self.assertIn(response.status_code, [302, 403])
        print("✅ Teste de Segurança: Usuário comum bloqueado com sucesso!")


# //  --- TESTE DE FUNCIONALIDADE: VERIFICA SE A API DE PONTOS DE SAÚDE RETORNA O FORMATO CORRETO --- //

    def test_api_pontos_saude_formato_json(self):
        """Verifica se a API retorna a estrutura correta para o Leaflet"""
        from core.models import PontoSaude
        PontoSaude.objects.create(
            nome="Hospital de Teste",
            latitude=-15.2493,
            longitude=-40.2476,
            tipo="HOSP"
        )

        response = self.client.get('/api/pontos/?tipo=todos')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

        if len(data) > 0:
            primeiro_ponto = data[0]
            campos = ['id', 'nome', 'lat', 'lng', 'tipo_sigla']
            for campo in campos:
                self.assertIn(campo, primeiro_ponto)

        print(f"✅ Teste de API: Formato JSON validado!")


    # TESTE DE FILTRO POR TIPO
    def test_api_filtro_por_tipo(self):
        """Verifica se a API filtra corretamente os pontos por tipo"""
        from core.models import PontoSaude

        # Criamos um Hospital e uma Farmácia
        PontoSaude.objects.create(
            nome="Hosp Teste", latitude=0, longitude=0, tipo="HOSP")
        PontoSaude.objects.create(
            nome="Farm Teste", latitude=1, longitude=1, tipo="FARM")

        # 1. Pedimos apenas Farmácias
        response = self.client.get('/api/pontos/?tipo=FARM')
        data = response.json()

        # Verificamos se veio apenas 1 item e se ele é FARM
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['tipo_sigla'], 'FARM')

        print(f"✅ Teste de Filtro: API retornou apenas os tipos solicitados!")



    # TESTE DE CÁLCULO DE DISTÂNCIA
    def test_api_calculo_distancia(self):
        """Verifica se a API calcula a distância corretamente entre dois pontos"""
        from core.models import PontoSaude

        # 1. Criamos um ponto de saúde em uma coordenada específica
        # (Exemplo: Centro de Itapetinga)
        PontoSaude.objects.create(
            nome="Ponto Proximo",
            latitude=-15.2493,
            longitude=-40.2476,
            tipo="HOSP"
        )

        # 2. Simulamos o usuário pedindo os pontos, enviando a SUA localização
        # Vamos enviar uma localização bem perto do ponto criado
        user_lat = -15.2500
        user_lng = -40.2480
        url = f'/api/pontos/?tipo=todos&lat={user_lat}&lng={user_lng}'

        response = self.client.get(url)
        data = response.json()

        # 3. Validação: O campo 'distancia_km' deve existir e ser um número positivo
        self.assertTrue(len(data) > 0)
        self.assertIn('distancia_km', data[0])
        self.assertGreater(float(data[0]['distancia_km']), 0)

        print(
            f"✅ Teste Geográfico: Cálculo de {data[0]['distancia_km']}km validado com sucesso!")
