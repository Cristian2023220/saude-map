from django.contrib import admin
from django.urls import path
from core import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.mapa_view, name='mapa'),
    path('api/pontos/', views.api_pontos, name='api_pontos'),
    path('adicionar-ponto/', views.adicionar_ponto, name='adicionar_ponto'),
    
    # --- ROTAS DO AUTH0 ---
    path('login/', views.auth0_login, name='login'),
    path('callback/', views.auth0_callback, name='callback'),
    path('logout/', views.auth0_logout, name='logout'),
]