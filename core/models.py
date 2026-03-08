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
            'lat': self.latitude,
            'lng': self.longitude,
            'tipo_sigla': self.tipo,
            'tipo_nome': self.get_tipo_display(),
            'telefone': getattr(self, 'telefone', 'Não informado'),

            # --- LISTAS DE SERVIÇOS ---
            'medicos': [{'id': m.id, 'nome': m.nome, 'especialidade': m.especialidade} for m in self.lista_medicos.all()],
            'vacinas': [{'id': v.id, 'nome': v.nome, 'disponivel': v.disponivel} for v in self.lista_vacinas.all()],
            'medicamentos': [{'id': m.id, 'nome': m.nome, 'disponivel': m.disponivel} for m in self.lista_medicamentos.all()],
            'produtos': [{'id': p.id, 'nome': p.nome, 'disponivel': p.disponivel} for p in self.lista_produtos.all()],
        }

   # --- NOVAS TABELAS DE RELACIONAMENTO ---


class Medico(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_medicos', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    especialidade = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nome} - {self.ponto.nome}"


class Vacina(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_vacinas', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    disponivel = models.BooleanField(default=True)


class Medicamento(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_medicamentos', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    disponivel = models.BooleanField(default=True)


class ProdutoGratuito(models.Model):
    ponto = models.ForeignKey(
        PontoSaude, related_name='lista_produtos', on_delete=models.CASCADE)
    nome = models.CharField(max_length=100)
    disponivel = models.BooleanField(default=True)
