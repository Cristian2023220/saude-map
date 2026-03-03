from django.contrib import admin
from .models import PontoSaude
from .models import PontoSaude, Medico, Vacina, Medicamento, ProdutoGratuito

@admin.register(PontoSaude)
class PontoSaudeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'latitude', 'longitude')

admin.site.register(Medico)
admin.site.register(Vacina)
admin.site.register(Medicamento)
admin.site.register(ProdutoGratuito)