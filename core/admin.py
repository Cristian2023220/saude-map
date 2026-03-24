from django.contrib import admin
from .models import PontoSaude, Medico, Vacina, Medicamento, ProdutoGratuito

# Configuração para aparecerem os itens dentro da página do Ponto de Saúde


class MedicoInline(admin.TabularInline):
    model = Medico
    extra = 1


class MedicamentoInline(admin.TabularInline):
    model = Medicamento
    extra = 1


@admin.register(PontoSaude)
class PontoSaudeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'telefone')
    search_fields = ('nome',)
    inlines = [MedicoInline, MedicamentoInline]


admin.site.register(Medico)
admin.site.register(Vacina)
admin.site.register(Medicamento)
admin.site.register(ProdutoGratuito)
