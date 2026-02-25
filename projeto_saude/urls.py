from django.contrib import admin
from django.urls import path
from django.contrib.auth import views as auth_views
from core import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.mapa_view, name='mapa'),
    path('api/pontos/', views.api_pontos, name='api_pontos'),
    
    # --- ROTAS DE AUTENTICAÇÃO ---
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    
    # --- ROTA SENSÍVEL (PROTEGIDA) ---
    path('adicionar-ponto/', views.adicionar_ponto, name='adicionar_ponto'),
]