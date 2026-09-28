import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projeto_saude.settings')
django.setup()

from core.models import PontoSaude, Medico, Medicamento

def popular():
    print("🚀 Iniciando povoamento completo de Itapetinga...")

    unidades = [
        {"nome": "PSF 01 – Américo Nogueira", "tipo": "POST", "lat": -15.253, "lng": -40.235, "serv": "Enfermeira: Juliana Pires. End: Av. Álvaro Nascimento."},
        {"nome": "PSF 02 – Primavera", "tipo": "POST", "lat": -15.242, "lng": -40.262, "serv": "Enfermeira: Beatriz Boaventura. End: Av. Vasco da Gama."},
        {"nome": "PSF 03 – Clodoaldo Costa", "tipo": "POST", "lat": -15.250, "lng": -40.255, "serv": "Enfermeira: Vânia Maria. End: Rua Manoel dos Santos Pitta."},
        {"nome": "PSF 04 – Vila Isabel", "tipo": "POST", "lat": -15.258, "lng": -40.245, "serv": "Enfermeira: Alessa Lisboa. End: Rua Julio Santos."},
        {"nome": "PSF 05 – Vila Riachão", "tipo": "POST", "lat": -15.260, "lng": -40.230, "serv": "Enfermeira: Ailton Gomes. End: Rua Geronimo Dórea."},
        {"nome": "PSF 06 – Vila Rosa", "tipo": "POST", "lat": -15.248, "lng": -40.238, "serv": "Enfermeira: Rebeca Gusmão. End: Rua Erlan Martins."},
        {"nome": "PSF 07 – Bandeira do Colônia", "tipo": "POST", "lat": -15.195, "lng": -40.115, "serv": "Enfermeira: Taciana Aguiar. Praça Duque de Caxias."},
        {"nome": "PSF 08 – Orfisia Andrade", "tipo": "POST", "lat": -15.255, "lng": -40.240, "serv": "Enfermeira: Sueli Silva. Rua Antonio Riachão."},
        {"nome": "PSF 09 – Ecosane", "tipo": "POST", "lat": -15.240, "lng": -40.250, "serv": "Enfermeira: Luciana Azevedo. Rua Ulisses Guimarães."},
        {"nome": "UBS Otávio Camões", "tipo": "POST", "lat": -15.245, "lng": -40.252, "serv": "Enfermeira: Caroline Couto. Rua Francisco da Rocha."},
        {"nome": "Posto de Saúde – Palmares", "tipo": "POST", "lat": -15.364, "lng": -39.998, "serv": "Enfermeira: Emanuelle Brandão. Praça Central."},
    ]

    meds_padrao = [
        "Dipirona 500mg",
        "Paracetamol 500mg",
        "Amoxicilina 500mg",
        "Ibuprofeno 600mg",
        "Losartana Potássica 50mg"
    ]

    # Detecta se a FK no modelo se chama 'ponto' ou 'ponto_saude'
    campo_ponto_medico = 'ponto' if hasattr(Medico, 'ponto') else 'ponto_saude'
    campo_ponto_medicamento = 'ponto' if hasattr(Medicamento, 'ponto') else 'ponto_saude'

    for u in unidades:
        ponto, _ = PontoSaude.objects.get_or_create(
            nome=u["nome"],
            defaults={
                "tipo": u["tipo"],
                "latitude": u["lat"],
                "longitude": u["lng"],
                "horario": "07:00 às 17:00",
                "servicos": u["serv"]
            }
        )

        ponto.horario = "07:00 às 17:00"
        ponto.latitude = u["lat"]
        ponto.longitude = u["lng"]
        ponto.servicos = u["serv"]
        ponto.save()

        # Vincula médico se ainda não houver nenhum para a unidade
        filtro_medico = {campo_ponto_medico: ponto}
        if not Medico.objects.filter(**filtro_medico).exists():
            Medico.objects.create(
                nome="Dr. Plantonista / Clínico",
                especialidade="Clínico Geral",
                **filtro_medico
            )

        # Vincula medicamentos se ainda não houver nenhum para a unidade
        filtro_medicamento = {campo_ponto_medicamento: ponto}
        if not Medicamento.objects.filter(**filtro_medicamento).exists():
            for m_nome in meds_padrao:
                Medicamento.objects.create(
                    nome=m_nome,
                    disponivel=True,
                    **filtro_medicamento
                )

    print("✅ Povoamento concluído para todos os 11 postos!")

if __name__ == "__main__":
    popular()