// --- 1. VARIÁVEIS E INICIALIZAÇÃO ---
let markers = [];
let userPos = { lat: null, lng: null };
let userMarker = null;
let filtroTipo = 'todos';
let isScanActive = true; 
let debounceTimer;
let localSelecionado = null;
window.controleRota = null; 

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
    document.getElementById('contador-locais').innerText = locais.length;
}

// --- 5. DETALHES E COLABORADOR ---
function abrirDetalhesLocal(local) {
    localSelecionado = local;
    const aberto = estaAberto(local.horario_abertura);
    let htmlFoto = local.foto_url ? `<img src="${local.foto_url}" class="local-foto-fachada">` : '';
    
    let html = `${htmlFoto}
        <div class="local-header">
            <div class="local-header-info">
                <h2>${local.nome}</h2>
                <span class="status-badge ${aberto ? 'status-aberto' : 'status-fechado'}">${aberto ? 'Aberto Agora' : 'Fechado'}</span>
            </div>
        </div>
        <div class="info-section">
            <h3><i class="bi bi-geo-alt"></i> Localização</h3>
            <div class="info-item" id="endereco-texto">Buscando endereço...</div>
            <button onclick="tracarRota(${local.lat}, ${local.lng})" class="user-btn route-btn">
                <i class="bi bi-sign-turn-right-fill"></i> Traçar Rota
            </button>
        </div>`;

    if (local.medicos?.length > 0) {
        html += `<div class="info-section"><h3>Médicos</h3>`;
        local.medicos.forEach(m => { html += `<div class="medico-card"><strong>${m.nome}</strong><br><small>${m.especialidade || ''}</small></div>`; });
        html += `</div>`;
    }

    if (window.isUserStaff) {
        let label = "Informação"; let tipoItem = "item"; let extraInput = '';
        if (local.tipo_sigla === 'FARM') {
            label = "Medicamento"; tipoItem = "medicamento";
            extraInput = `<select id="novo-item-extra" class="form-control"><option value="Disponível">✅ Disponível</option><option value="Em falta">❌ Em falta</option></select>`;
        } else {
            label = "Médico"; tipoItem = "medico";
            extraInput = `<input type="text" id="novo-item-extra" class="form-control" placeholder="Especialidade">`;
        }
        html += `
        <div class="info-section edit-section">
            <button onclick="document.getElementById('form-edicao').style.display='block'; this.style.display='none'" class="user-btn colab-btn">Painel Colaborador</button>
            <div id="form-edicao" style="display: none; margin-top:15px;">
                <label>${label}</label>
                <input type="text" id="novo-item-nome" class="form-control" placeholder="Nome">
                ${extraInput}
                <button onclick="salvarItem('${tipoItem}')" class="user-btn save-btn">Adicionar</button>
            </div>
        </div>`;
    }
    document.getElementById('detalhes-local').innerHTML = html;
    abrirSidebar('detalhes');
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${local.lat}&lon=${local.lng}`)
        .then(r => r.json()).then(d => { document.getElementById('endereco-texto').innerText = d.display_name; });
}

window.salvarItem = function(tipo) {
    const nome = document.getElementById('novo-item-nome').value;
    const extra = document.getElementById('novo-item-extra').value;
    if (!nome) return alert("Preencha o nome!");
    const dados = { tipo_item: tipo, nome: nome };
    if (tipo === 'medico') dados.especialidade = extra; else dados.status = extra;
    fetch(`/api/pontos/${localSelecionado.id}/adicionar-item/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(dados)
    }).then(r => r.json()).then(data => {
        if (data.status === 'success') { alert("Salvo!"); abrirDetalhesLocal(localSelecionado); }
    });
};

// --- 6. CONTROLES MODAL E UI ---
window.abrirSobre = () => { document.getElementById('modal-sobre').style.display = 'flex'; };
window.fecharSobre = () => { document.getElementById('modal-sobre').style.display = 'none'; };
function abrirSidebar(modo) { sidebar.classList.add('open'); overlay.classList.add('active'); document.getElementById('modo-lista').style.display = modo === 'lista' ? 'block' : 'none'; document.getElementById('modo-detalhes').style.display = modo === 'detalhes' ? 'flex' : 'none'; }
function fecharSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
window.getUserLocation = () => { navigator.geolocation.getCurrentPosition(pos => { userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; carregarPontos(); }); };
window.tracarRota = (lat, lng) => { if (window.controleRota) map.removeControl(window.controleRota); window.controleRota = L.Routing.control({ waypoints: [L.latLng(userPos.lat, userPos.lng), L.latLng(lat, lng)], createMarker: () => null }).addTo(map); fecharSidebar(); };
window.limparRota = () => { if (window.controleRota) { map.removeControl(window.controleRota); window.controleRota = null; } };
window.toggleScan = () => { isScanActive = document.getElementById('check-scan').checked; carregarPontos(); };
window.filtrar = (tipo, btn) => { filtroTipo = tipo; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); carregarPontos(); };
window.filtrarPorNomeMain = () => { const termo = document.getElementById('input-busca-main').value.toLowerCase(); markers.forEach(m => { m.marker.addTo(map); if (!m.nome.includes(termo)) map.removeLayer(m.marker); }); };
map.on('moveend', () => { if (isScanActive) { clearTimeout(debounceTimer); debounceTimer = setTimeout(carregarPontos, 300); } });
carregarPontos();