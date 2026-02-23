from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import math

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
    
    # Pega as coodenadas do usuário e calcula a distância em km
    def calcular_distancia(self, lat_usuario, lng_usuario):
        if not lat_usuario or not lng_usuario:
            return None
        
        # Converte graus para radianos
        lat1, lon1 = float(self.latitude), float(self.longitude)
        lat2, lon2 = float(lat_usuario), float(lng_usuario)
        radius = 6371  # Raio da Terra em km


        # Fórmula de Haversine sendo aplicada para calcular a distância
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) * math.sin(dlon / 2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        # Distância em km
        d = radius * c

        return round(d, 2)

    def __str__(self):
        return self.nome