from django import forms
from .models import PontoSaude

class PontoSaudeForm(forms.ModelForm):
    class Meta:
        model = PontoSaude
        fields = ['nome', 'tipo', 'latitude', 'longitude', 'telefone', 'horario', 'servicos', 'medicamentos']
        # Adicionando classes CSS para ficar bonito na tela
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: UPA 24h'}),
            'tipo': forms.Select(attrs={'class': 'form-control'}),
            'latitude': forms.NumberInput(attrs={'class': 'form-control'}),
            'longitude': forms.NumberInput(attrs={'class': 'form-control'}),
            'telefone': forms.TextInput(attrs={'class': 'form-control'}),
            'horario': forms.TextInput(attrs={'class': 'form-control'}),
            'servicos': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'medicamentos': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }