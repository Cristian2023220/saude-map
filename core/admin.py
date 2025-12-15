from django.contrib import admin
from .models import PontoSaude

@admin.register(PontoSaude)
class PontoSaudeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'latitude', 'longitude')