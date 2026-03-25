// --- 1. VARIÁVEIS E INICIALIZAÇÃO ---
let markers = [];
let userMarker = null;
let filtroTipo = 'todos';
let isScanActive = true; 
let debounceTimer;
let localSelecionado = null;
window.controleRota = null; 
let userPos = { lat: null, lng: null };

const sidebar = document.getElementById('sidebar-locais');
const overlay = document.getElementById('overlay');

// Inicialização com correção
const map = L.map('map', { zoomControl: false }).setView([-15.2493, -40.2476], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { 
    attribution: '© OpenStreetMap' 
}).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// FORÇAR RESOLUÇÃO CORRETA (Corrige mapa iniciando pequeno)
setTimeout(() => { map.invalidateSize(); }, 500);

// --- 2. AUXILIARES ---

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function estaAberto(horarioStr) {
    if (!horarioStr || horarioStr === "Não informado") return false;
    const texto = horarioStr.toLowerCase();
    if (texto.includes("24 horas")) return true;
    const horas = texto.match(/(\d+)/g);
    if (!horas || horas.length < 2) return false;
    const agora = new Date();
    const horaAtual = agora.getHours();
    const inicio = parseInt(horas[0]);
    const fim = horas.length >= 4 ? parseInt(horas[2]) : parseInt(horas[1]);
    return horaAtual >= inicio && horaAtual < fim;
}

// --- 3. GERADOR DE ÍCONES (50PX E SOMBRA) ---
function gerarIconeMarcador(tipo, aberto = true) {
    let iconClass = 'map-icon-posto'; 
    let iconBi = 'bi-buildings';
    if (tipo === 'HOSP') { iconClass = 'map-icon-hospital'; iconBi = 'bi-hospital'; }
    else if (tipo === 'FARM') { iconClass = 'map-icon-posto blue'; iconBi = 'bi-capsule'; }
    else if (tipo === 'UPA' || tipo === 'POST') { iconClass = 'map-icon-upa'; iconBi = 'bi-building'; }
    
    const statusClass = aberto ? '' : 'map-icon-closed';
    return L.divIcon({
        className: '', iconSize: [50, 50], iconAnchor: [25, 25], popupAnchor: [0, -25],
        html: `<div class="${iconClass} ${statusClass}"><i class="bi ${iconBi}"></i></div>`
    });
}

// --- 4. API E RENDERIZAÇÃO ---
async function carregarPontos() {
    const loader = document.getElementById('map-loader');
    if (loader) loader.style.display = 'block';
    try {
        let url = `/api/pontos/?tipo=${filtroTipo}`;
        if (isScanActive) {
            const bounds = map.getBounds();
            url += `&ne_lat=${bounds.getNorthEast().lat}&ne_lng=${bounds.getNorthEast().lng}&sw_lat=${bounds.getSouthWest().lat}&sw_lng=${bounds.getSouthWest().lng}`;
        }
        if (userPos.lat) url += `&lat=${userPos.lat}&lng=${userPos.lng}`;
        const response = await fetch(url);
        const locais = await response.json();
        renderizarNoMapaELista(locais);
    } catch (e) { console.error("Erro API:", e); }
    finally { if (loader) loader.style.display = 'none'; }
}

function renderizarNoMapaELista(locais) {
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];
    const listaContainer = document.getElementById('lista-locais');
    if (listaContainer) listaContainer.innerHTML = '';
    
    locais.forEach(local => {
        const aberto = estaAberto(local.horario_abertura);
        const marker = L.marker([local.lat, local.lng], { icon: gerarIconeMarcador(local.tipo_sigla, aberto) }).addTo(map);
        marker.on('click', () => abrirDetalhesLocal(local));
        markers.push({ id: local.id, marker: marker, nome: local.nome.toLowerCase() });

        const li = document.createElement('li');
        li.className = 'local-item';
        const statusClass = aberto ? 'status-aberto' : 'status-fechado';
        li.innerHTML = `
            <div class="local-info">
                <strong>${local.nome}</strong>
                <p><span><i class="bi bi-tag"></i> ${local.tipo_nome}</span></p>
                <span class="status-badge ${statusClass}">${aberto ? 'Aberto' : 'Fechado'}</span>
            </div><i class="bi bi-chevron-right"></i>`;
        li.onclick = () => { map.setView([local.lat, local.lng], 16); abrirDetalhesLocal(local); };
        if (listaContainer) listaContainer.appendChild(li);
    });

    const elContador = document.getElementById('contador-locais');
    if (elContador) {
        elContador.innerText = locais.length;
    }

    document.getElementById('contador-locais').innerText = locais.length;
}

// --- 5. DETALHES E COLABORADOR ---
function abrirDetalhesLocal(local) {
    localSelecionado = local;
    
    let cor = 'blue'; let icone = 'bi-buildings';
    if(local.tipo_sigla === 'HOSP') { cor = 'red'; icone = 'bi-hospital'; }
    else if(local.tipo_sigla === 'UPA') { cor = 'orange'; icone = 'bi-building'; }
    else if(local.tipo_sigla === 'FARM') { cor = 'blue'; icone = 'bi-capsule'; }

    const aberto = estaAberto(local.horario_abertura);
    let htmlFoto = local.foto_url ? `<img src="${local.foto_url}" class="local-foto-fachada">` : '';

    let html = `
        ${htmlFoto}
        <div class="local-header">
            <div class="icon-box ${cor}"><i class="bi ${icone}"></i></div>
            <div class="local-header-info">
                <h2>${local.nome}</h2>
                <p>${local.tipo_nome}</p>
                <span class="status-badge ${aberto ? 'status-aberto' : 'status-fechado'}">${aberto ? 'Aberto Agora' : 'Fechado'}</span>
            </div>
        </div>
        <div class="info-section">
            <h3><i class="bi bi-geo-alt"></i> Endereço</h3>
            <div class="info-item" id="endereco-texto">Buscando...</div>
            <button onclick="tracarRota(${local.lat}, ${local.lng})" class="user-btn route-btn-azul">
                <i class="bi bi-sign-turn-right-fill"></i> Traçar Rota
            </button>
        </div>
    `;

    if (local.medicos && local.medicos.length > 0) {
    html += `<div class="info-section"><h3><i class="bi bi-person-badge"></i> Médicos</h3>`;
    local.medicos.forEach(m => {
        html += `
            <div class="medico-card" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${m.nome}</strong>
                    <small>${m.especialidade || 'Clínico Geral'}</small>
                </div>
                ${window.isUserStaff ? `<button onclick="confirmarExclusao('medico', ${m.id})" class="btn-delete"><i class="bi bi-trash"></i></button>` : ''}
            </div>`;
    });
    html += `</div>`;
}

    if (local.medicamentos && local.medicamentos.length > 0) {
    html += `<div class="info-section"><h3><i class="bi bi-capsule"></i> Medicamentos</h3>`;
    local.medicamentos.forEach(m => {
        const badgeClass = m.disponivel ? "status-aberto" : "status-fechado";
        html += `
            <div class="vacina-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="flex-grow: 1;">${m.nome}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="status-badge ${badgeClass}" 
                          ${window.isUserStaff ? `onclick="alternarStatus('medicamento', ${m.id})" style="cursor:pointer;" title="Clique para mudar"` : ''}>
                        ${m.disponivel ? 'Disponível' : 'Em falta'}
                    </span>
                    ${window.isUserStaff ? `<button onclick="confirmarExclusao('medicamento', ${m.id})" class="btn-delete"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </div>`;
    });
    html += `</div>`;
}

    if (window.isUserStaff) {
        html += `
        <div class="info-section edit-section">
            <h3>PAINEL DO COLABORADOR</h3>
            
            <div class="colab-actions-container" style="display: flex; gap: 8px; margin-top: 10px;">
                <button onclick="mostrarCargaItem('medico')" class="user-btn colab-action-btn medico">
                    <i class="bi bi-plus-lg"></i> Médico
                </button>
                <button onclick="mostrarCargaItem('medicamento')" class="user-btn colab-action-btn medicamento">
                    <i class="bi bi-plus-lg"></i> Medicamento
                </button>
            </div>

            <div id="form-edicao-unificado" style="display: none; margin-top:15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <label id="form-unificado-label" style="font-weight:bold; font-size:12px; color:#64748b; text-transform:uppercase;"></label>
                <input type="text" id="novo-item-nome-unificado" class="form-control" placeholder="Nome" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px; margin: 8px 0;">
                <button onclick="salvarItemUnificado()" class="user-btn route-btn-azul" style="width:100%;">
                    <i class="bi bi-check-lg"></i> Salvar no Banco
                </button>
            </div>
        </div>`;
    }

    document.getElementById('detalhes-local').innerHTML = html;
    abrirSidebar('detalhes');

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${local.lat}&lon=${local.lng}`)
        .then(r => r.json()).then(data => {
            const addr = data.address;
            document.getElementById('endereco-texto').innerText = (addr.road || "") + ", " + (addr.suburb || "");
        });
}

window.confirmarExclusao = function(tipo, id) {
    if (confirm(`Tem certeza que deseja excluir este ${tipo}?`)) {
        fetch(`/api/itens/${tipo}/${id}/excluir/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'sucesso') location.reload();
        });
    }
}

window.alternarStatus = function(tipo, id) {
    fetch(`/api/itens/${tipo}/${id}/alternar/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'sucesso') location.reload();
    });
}

// Funções auxiliares para o Painel do Colaborador Restaurado
let tipoItemAtual = 'medico'; // Variável global para saber o que estamos salvando

window.mostrarCargaItem = function(tipo) {
    tipoItemAtual = tipo;
    document.querySelector('.colab-actions-container').style.display = 'none';
    
    const label = document.getElementById('form-unificado-label');
    const input = document.getElementById('novo-item-nome-unificado');
    const form = document.getElementById('form-edicao-unificado');
    
    // Mostra/Esconde campos específicos
    const divEspecialidade = document.getElementById('div-especialidade') || criarDivEspecialidade();
    const divDisponibilidade = document.getElementById('div-disponibilidade') || criarDivDisponibilidade();

    label.innerText = `CADASTRAR ${tipo.toUpperCase()}`;
    input.placeholder = tipo === 'medico' ? "Nome do Médico" : "Nome do Medicamento";
    
    // Lógica visual: Médico precisa de especialidade, Medicamento precisa de disponibilidade
    divEspecialidade.style.display = tipo === 'medico' ? 'block' : 'none';
    divDisponibilidade.style.display = tipo === 'medicamento' ? 'block' : 'none';
    
    form.style.display = 'block';
}

window.salvarItemUnificado = function() {
    // tipoItemAtual é a variável global que definimos no passo anterior
    if (typeof tipoItemAtual !== 'undefined') {
        salvarItem(tipoItemAtual);
        // Opcional: fechar o formulário após salvar
        // fecharFormUnificado(); 
    } else {
        console.error("Tipo de item não definido!");
    }
}

function fecharFormUnificado() {
    document.getElementById('form-edicao-unificado').style.display = 'none';
    document.querySelector('.colab-actions-container').style.display = 'flex';
}

window.salvarItem = function(tipo) {
    const nome = document.getElementById('novo-item-nome-unificado').value;
    const especialidade = document.getElementById('input-especialidade')?.value || "Clínico Geral";
    const estaDisponivel = document.getElementById('check-disponivel')?.checked;

    if (!nome) return alert("Preencha o nome!");

    fetch(`/api/pontos/${localSelecionado.id}/adicionar-item/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            tipo_item: tipo,
            nome: nome,
            especialidade: especialidade, // Agora envia a especialidade para o médico
            disponivel: estaDisponivel     // Agora envia True ou False para o remédio
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'sucesso') {
            alert("Cadastrado com sucesso!");
            location.reload(); // Recarrega para atualizar a lista
        }
    });
}

function criarDivEspecialidade() {
    const html = `<div id="div-especialidade" style="margin-bottom:10px;">
        <input type="text" id="input-especialidade" class="form-control" placeholder="Especialidade (ex: Pediatra)" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px;">
    </div>`;
    document.getElementById('novo-item-nome-unificado').insertAdjacentHTML('afterend', html);
    return document.getElementById('div-especialidade');
}

function criarDivDisponibilidade() {
    const html = `<div id="div-disponibilidade" style="margin: 10px 0; display:flex; align-items:center; gap:10px;">
        <input type="checkbox" id="check-disponivel" checked style="width:18px; height:18px;">
        <label for="check-disponivel" style="font-size:13px; color:#1e293b; font-weight:600;">Item disponível em estoque?</label>
    </div>`;
    document.getElementById('novo-item-nome-unificado').insertAdjacentHTML('afterend', html);
    return document.getElementById('div-disponibilidade');
}

// --- 6. CONTROLES MODAL E UI ---
window.abrirSobre = () => { document.getElementById('modal-sobre').style.display = 'flex'; };
window.fecharSobre = () => { document.getElementById('modal-sobre').style.display = 'none'; };
function abrirSidebar(modo) { 
    const sidebar = document.getElementById('sidebar-locais');
    const overlay = document.getElementById('overlay');

    sidebar.classList.add('open'); 
    overlay.classList.add('active'); 
    
    document.getElementById('modo-lista').style.display = modo === 'lista' ? 'block' : 'none'; 
    document.getElementById('modo-detalhes').style.display = modo === 'detalhes' ? 'flex' : 'none'; 

    // NOVO: Se o modo for lista, manda o sistema buscar os pontos atualizados
    if (modo === 'lista') {
        carregarPontos(); 
    }
}
function fecharSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }


window.localizarUsuario = function() {
    navigator.geolocation.getCurrentPosition((pos) => {
        // ESSENCIAL: Salvar para o traçar rotas usar depois
        userPos.lat = pos.coords.latitude;
        userPos.lng = pos.coords.longitude;
        
        map.setView([userPos.lat, userPos.lng], 15);

            // Marcador do usuário (Ponto Azul)
            if (window.marcadorUsuario) {
                window.marcadorUsuario.setLatLng([userPos.lat, userPos.lng]);
            } else {
                const iconUser = L.divIcon({
                    className: 'user-location-icon',
                    html: '<div style="background:#0284c7; width:15px; height:15px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20]
                });
                window.marcadorUsuario = L.marker([userPos.lat, userPos.lng], { icon: iconUser }).addTo(map);
            }
            
            // Chama a função de carregar pontos próximos
            carregarPontos(); 
        },
        (erro) => {
            alert("Erro ao obter localização. Verifique as permissões do navegador.");
        },
        { enableHighAccuracy: true }
    );
}

window.tracarRota = (lat, lng) => { 
    if (window.controleRota) map.removeControl(window.controleRota); 
    
    window.controleRota = L.Routing.control({ 
        waypoints: [
            L.latLng(userPos.lat, userPos.lng), 
            L.latLng(lat, lng)
        ], 
        show: true,
        addWaypoints: false,
        draggableWaypoints: false,
        language: 'pt-BR',
        createMarker: () => null 
    }).addTo(map); 
    
    // MOSTRA O BOTÃO DE LIMPAR
    document.getElementById('btn-limpar-rota').style.display = 'flex';
    
    fecharSidebar(); 
};
window.limparRota = function() {
    if (window.controleRota) {
        map.removeControl(window.controleRota);
        window.controleRota = null;
    }
    
    // ESCONDE O BOTÃO NOVAMENTE
    document.getElementById('btn-limpar-rota').style.display = 'none';
    
    // Opcional: Centraliza o mapa de volta no usuário
    if (userPos.lat) map.setView([userPos.lat, userPos.lng], 14);
}
window.toggleScan = () => { isScanActive = document.getElementById('check-scan').checked; carregarPontos(); };
window.filtrar = (tipo, btn) => { filtroTipo = tipo; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); carregarPontos(); };
window.filtrarPorNomeMain = () => { const termo = document.getElementById('input-busca-main').value.toLowerCase(); markers.forEach(m => { m.marker.addTo(map); if (!m.nome.includes(termo)) map.removeLayer(m.marker); }); };
map.on('moveend', () => { if (isScanActive) { clearTimeout(debounceTimer); debounceTimer = setTimeout(carregarPontos, 300); } });
carregarPontos();