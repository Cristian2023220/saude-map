# 🏥 SaúdeMap - Localizador de Serviços de Saúde

O **SaúdeMap** é uma aplicação web desenvolvida para auxiliar usuários a encontrarem rapidamente serviços de saúde próximos à sua localização. O sistema exibe um mapa interativo contendo hospitais, farmácias, postos de saúde, UPAs e clínicas, permitindo filtrar os resultados e visualizar detalhes essenciais como horário de funcionamento, serviços prestados e medicamentos disponíveis.

---

## 🚀 Funcionalidades

* **Mapa Interativo:** Navegação fluida utilizando OpenStreetMap e Leaflet.
* **Geolocalização:** Identificação automática da posição do usuário (GPS/Browser).
* **Filtros Dinâmicos:** Permite visualizar apenas categorias específicas (ex: só Farmácias).
* **Detalhamento:** Pop-ups informativos com status (Aberto/Fechado), telefone e listas de serviços/medicamentos.
* **Dashboard de Estatísticas:** Visualização rápida da quantidade de estabelecimentos cadastrados por categoria.
* **Painel Administrativo:** Gerenciamento completo (CRUD) dos locais via Django Admin.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando uma arquitetura **Monolítica** (MVT - Model View Template) com as seguintes tecnologias:

**Model** (M): Só cuida dos dados e do banco. (Arquivo models.py)
**View (V)**: No Django, isso é o Template (HTML). Só cuida de mostrar a tela. (Arquivo index.html)
**Controller** (C): No Django, isso é a View + URL. É o "maestro" que pega o dado do Model e manda para a Tela. (Arquivo views.py)

### Backend
* **Linguagem:** Python 3.10+
* **Framework:** Django 5.x
* **ORM:** Django ORM (Abstração do banco de dados)

### Frontend
* **Linguagens:** HTML5, CSS3, JavaScript (ES6)
* **Bibliotecas de Mapa:** [Leaflet.js](https://leafletjs.com/) (Renderização) + OpenStreetMap (Tiles)
* **Ícones:** FontAwesome
* **Estilização:** CSS nativo (Flexbox e Grid Layout)

### Banco de Dados
* **Desenvolvimento:** SQLite (Padrão do Django, leve e baseado em arquivo).
* **Produção (Suportado):** O projeto está preparado para migrar facilmente para **MySQL** ou **PostgreSQL** alterando apenas as configurações no `settings.py`.

---

## 📂 Estrutura do Projeto

```text
projeto_saude/
│
├── core/                   # Aplicação principal
│   ├── migrations/         # Histórico do banco de dados
│   ├── templates/          # Arquivos HTML
│   │   └── index.html      # Interface principal do mapa
│   ├── admin.py            # Configuração do painel admin
│   ├── models.py           # Estrutura do Banco de Dados
│   ├── views.py            # Lógica do Backend e API JSON
│   └── ...
│
├── projeto_saude/          # Configurações do projeto Django
│   ├── settings.py         # Configurações globais
│   ├── urls.py             # Rotas e URLs
│   └── ...
│
├── static/                 # Arquivos estáticos (CSS, JS, Imagens)
├── db.sqlite3              # Banco de dados (ambiente dev)
├── manage.py               # Script de gerenciamento Django
└── requirements.txt        # Dependências do projeto



----------------------------------------------------------------------------------------------------------------------------------

## 📂 MÉTODS HTTPS (4 métodos GET)

📋 Detalhamento das Requisições
1. A Requisição Principal (Síncrona)
Esta é a única requisição que bate no seu computador/servidor.

Método: GET

URL: http://127.0.0.1:8000/

O que acontece: O navegador pede a página. O Django vai no MySQL, pega a lista de hospitais, converte para texto (JSON), embute no HTML e manda tudo de volta.


----------------------------------------------------------------------------------------------------------------------------------


2. O Desenho do Mapa (Tiles)
O mapa não é uma imagem única, é um mosaico de centenas de quadradinhos.

Método: GET (Múltiplos)

URL: https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png

Quem faz: A biblioteca Leaflet.js.

Gatilho: Sempre que o usuário arrasta o mapa ou dá zoom.


----------------------------------------------------------------------------------------------------------------------------------

3. A Busca de Endereço (Assíncrona / Fetch)
Essa é a função que adicionamos com o fetch() no JavaScript.

Método: GET

URL: https://nominatim.openstreetmap.org/search?format=json&q=Av+Paulista

Quem faz: Sua função buscarEndereco().

Resposta: Um JSON contendo a latitude e longitude do endereço digitado.

----------------------------------------------------------------------------------------------------------------------------------

4. O Cálculo de Rotas (Routing Machine)
Quando você clica em "Como Chegar", o navegador pede o caminho para um servidor especializado.

Método: GET

URL: http://router.project-osrm.org/route/v1/driving/{long1},{lat1};{long2},{lat2}...

Quem faz: O plugin Leaflet Routing Machine.

----------------------------------------------------------------------------------------------------------------------------------
Login: Quando você digita senha e aperta Enter -> POST (Envia credenciais de forma segura).

Salvar Novo Ponto: Quando você preenche o formulário e clica em Salvar -> POST (Envia os dados do formulário para o MySQL gravar).

Apagar Ponto: Quando você confirma a exclusão -> POST (Às vezes simulando um DELETE).