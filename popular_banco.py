from core.models import PontoSaude, Medicamento
import os
import django

# Configura o ambiente do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projeto_saude.settings')
django.setup()


def popular():
    print("🚀 Iniciando povoamento de dados de Itapetinga...")

    # 1. Lista de PSFs e Unidades
    unidades = [
        {"nome": "PSF 01 – Américo Nogueira", "tipo": "POST", "lat": -15.253, "lng": -
            40.235, "serv": "Enfermeira: Juliana Pires. End: Av. Álvaro Nascimento."},
        {"nome": "PSF 02 – Primavera", "tipo": "POST", "lat": -15.242, "lng": -
            40.262, "serv": "Enfermeira: Beatriz Boaventura. End: Av. Vasco da Gama."},
        {"nome": "PSF 03 – Clodoaldo Costa", "tipo": "POST", "lat": -15.250, "lng": -
            40.255, "serv": "Enfermeira: Vânia Maria. End: Rua Manoel dos Santos Pitta."},
        {"nome": "PSF 04 – Vila Isabel", "tipo": "POST", "lat": -15.258, "lng": -
            40.245, "serv": "Enfermeira: Alessa Lisboa. End: Rua Julio Santos."},
        {"nome": "PSF 05 – Vila Riachão", "tipo": "POST", "lat": -15.260, "lng": -
            40.230, "serv": "Enfermeira: Ailton Gomes. End: Rua Geronimo Dórea."},
        {"nome": "PSF 06 – Vila Rosa", "tipo": "POST", "lat": -15.248, "lng": -
            40.238, "serv": "Enfermeira: Rebeca Gusmão. End: Rua Erlan Martins."},
        {"nome": "PSF 07 – Bandeira do Colônia", "tipo": "POST", "lat": -15.195,
            "lng": -40.115, "serv": "Enfermeira: Taciana Aguiar. Praça Duque de Caxias."},
        {"nome": "PSF 08 – Orfisia Andrade", "tipo": "POST", "lat": -15.255,
            "lng": -40.240, "serv": "Enfermeira: Sueli Silva. Rua Antonio Riachão."},
        {"nome": "PSF 09 – Ecosane", "tipo": "POST", "lat": -15.240, "lng": -
            40.250, "serv": "Enfermeira: Luciana Azevedo. Rua Ulisses Guimarães."},
        {"nome": "UBS Otávio Camões", "tipo": "POST", "lat": -15.245, "lng": -
            40.252, "serv": "Enfermeira: Caroline Couto. Rua Francisco da Rocha."},
        {"nome": "Posto de Saúde – Palmares", "tipo": "POST", "lat": -15.364,
            "lng": -39.998, "serv": "Enfermeira: Emanuelle Brandão. Praça Central."}
    ]

    for u in unidades:
        ponto, created = PontoSaude.objects.get_or_create(
            nome=u['nome'],
            defaults={
                'tipo': u['tipo'],
                'latitude': u['lat'],
                'longitude': u['lng'],
                'servicos': u['serv']
            }
        )
        if created:
            print(f"✅ Unidade adicionada: {u['nome']}")

    # 2. Lista de Medicamentos
    medicamentos = [
        "Aciclovir 200mg", "Aciclovir 50mg/g creme", "Ácido acetilsalícílico 100mg",
        "Ácido Fólico 5mg", "Ácido Fólico 0,2mg/mL", "Albendazol 400mg",
        "Albendazol 40mg/mL", "Alendronato de sódio 70mg", "Alopurinol 100mg", "Amiodarona 200mg"
    ]

    # Buscamos uma unidade de referência para vincular os remédios
    # Vou usar o Guilherme Dias que acabamos de criar
    try:
        ponto_referencia = PontoSaude.objects.get(
            nome="Centro de Saúde Guilherme Dias")

        for med_nome in medicamentos:
            # Agora passamos o 'ponto' para evitar o erro de IntegrityError
            med, created = Medicamento.objects.get_or_create(
                nome=med_nome,
                ponto=ponto_referencia  # <--- O VÍNCULO OBRIGATÓRIO AQUI
            )
            if created:
                print(f"💊 Medicamento adicionado: {med_nome}")

    except PontoSaude.DoesNotExist:
        print("❌ Erro: Não encontrei a unidade Guilherme Dias para vincular os remédios.")


if __name__ == "__main__":
    popular()
