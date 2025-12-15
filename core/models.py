from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class PontoSaude(models.Model):
    TIPO_CHOICES = [
        ('HOSP', 'Hospital'),
        ('FARM', 'Farmácia'),
        ('POST', 'Posto de Saúde'),
    ]

    nome = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=4, choices=TIPO_CHOICES)
    telefone = models.CharField(max_length=20, blank=True)
    horario = models.CharField(max_length=100, blank=True)
    servicos = models.TextField(blank=True)
    medicamentos = models.TextField(blank=True)
    
    latitude = models.DecimalField(max_digits=9, decimal_places=6,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)])
    longitude = models.DecimalField(max_digits=9, decimal_places=6,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)])

    # --- LÓGICA MVC ---
    # O Model agora sabe se formatar para o Frontend.
    # Isso limpa o Controller.
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'tipo_sigla': self.tipo,
            'tipo_nome': self.get_tipo_display(),
            'lat': float(self.latitude),
            'lng': float(self.longitude),
            'info': {
                'horario': self.horario,
                'fone': self.telefone,
                'servicos': self.servicos,
                'medicamentos': self.medicamentos
            }
        }

    def __str__(self):
        return self.nome