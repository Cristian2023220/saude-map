from django import forms
from .models import PontoSaude


class PontoSaudeForm(forms.ModelForm):
    class Meta:
        model = PontoSaude
        fields = [
            'nome', 'tipo', 'telefone', 'horario',
            'servicos', 'medicamentos_texto', 'foto',
            'latitude', 'longitude'
        ]
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'tipo': forms.Select(attrs={'class': 'form-control'}),
            'telefone': forms.TextInput(attrs={'class': 'form-control'}),
            'horario': forms.TextInput(attrs={'class': 'form-control'}),
            'servicos': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'medicamentos_texto': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'latitude': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.000001'}),
            'longitude': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.000001'}),
        }
