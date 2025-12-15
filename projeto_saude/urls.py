from django.contrib import admin
from django.urls import path
from core.views import mapa_view  # <--- Verifique se importou a view corretamente

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', mapa_view, name='mapa'),
]
