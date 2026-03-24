from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import math


class PontoSaude(models.Model):
    TIPO_CHOICES = [
        ('HOSP', 'Hospital'),
        ('FARM', 'Farmácia'),
        ('POST', 'Posto de Saúde'),
    ]

    # Campos principais
    nome = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=4, choices=TIPO_CHOICES)
    telefone = models.CharField(max_length=20, blank=True)
    horario = models.CharField(max_length=100, blank=True)

    # Descrições detalhadas
    servicos = models.TextField(
        blank=True, help_text="Liste os serviços prestados")
    medicamentos_texto = models.TextField(
        blank=True, verbose_name="Medicamentos (Texto)", help_text="Descrição textual de medicamentos")

    # Foto da fachada
    foto = models.ImageField(upload_to='fachadas/', null=True, blank=True)

    # Coordenadas Geográficas (Essencial para o Mapa)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)]
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)]
    )

    def __str__(self):
        return self.nome

    def to_dict(self):
        """Converte o objeto para um dicionário JSON aceito pelo JavaScript"""
        data = {
            'id': self.id,
            'nome': self.nome,
            'lat': float(self.latitude),
            'lng': float(self.longitude),
            'tipo_sigla': self.tipo,
            'tipo_nome': self.get_tipo_display(),
            'telefone': self.telefone if self.telefone else 'Não informado',
            'foto_url': self.foto.url if self.foto else None,
            'horario_abertura': self.horario if self.horario else 'Não informado',
            'servicos_resumo': self.servicos,
        }

        # Relacionamento: Médicos
        data['medicos'] = [
            {'id': m.id, 'nome': m.nome, 'especialidade': m.especialidade}
            for m in self.lista_medicos.all()
        ]

        # Relacionamento: Medicamentos (Lista dinâmica do Banco)
        data['medicamentos'] = [
            {'id': m.id, 'nome': m.nome, 'disponivel': m.disponivel}
            for m in self.lista_medicamentos.all()
        ]

        # Relacionamento: Vacinas
        data['vacinas'] = [
            {'id': v.id, 'nome': v.nome, 'disponivel': v.disponivel}
            for v in self.lista_vacinas.all()
        ]

        return data

    def calcular_distancia(self, user_lat, user_lng):
        """Calcula a distância em km entre o utilizador e o Ponto de Saúde"""
        try:
            lat1, lon1 = float(self.latitude), float(self.longitude)
            lat2, lon2 = float(user_lat), float(user_lng)
            R = 6371.0  # Raio da Terra

            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)

            a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * \
                math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            return round(R * c, 2)
        except (ValueError, TypeError):
            return None


# --- CLASSES DE RELACIONAMENTO (Essenciais para o admin.py) ---

class Medico(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_medicos', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    especialidade = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.nome} ({self.ponto.nome})"


class Vacina(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_vacinas', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    disponivel = models.BooleanField(default=True)

    def __str__(self):
        return self.nome


class Medicamento(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_medicamentos', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    disponivel = models.BooleanField(default=True)

    def __str__(self):
        return self.nome


class ProdutoGratuito(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_produtos', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    disponivel = models.BooleanField(default=True)

    def __str__(self):
        return self.nome
