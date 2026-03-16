let markers = [];
let userPos = { lat: null, lng: null };
let userMarker = null;
let filtroTipo = 'todos';
let isScanActive = true; 
let debounceTimer;
let localSelecionado = null;
window.controleRota = null; 

// --- 1. INICIALIZAÇÃO DO MAPA ---
const map = L.map('map').setView([-15.2493, -40.2476], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { 
    attribution: '© OpenStreetMap' 
}).addTo(map);

// Ícones Customizados
function gerarIconeMarcador(tipo) {
    let iconClass = 'map-icon-posto'; 
    let iconBi = 'bi-buildings';
    
    if (tipo === 'HOSP') { 
        iconClass = 'map-icon-hospital'; 
        iconBi = 'bi-hospital'; 
    } else if (tipo === 'FARM') { 
        iconClass = 'map-icon-posto blue'; // Mantém a classe base E adiciona a cor
        iconBi = 'bi-capsule'; 
    } else if (tipo === 'UPA') { 
        iconClass = 'map-icon-upa'; 
        iconBi = 'bi-building'; 
    }
    
    return L.divIcon({
        className: '', 
        iconSize: [50, 50], 
        iconAnchor: [25, 25], 
        popupAnchor: [0, -25],
        html: `<div class="${iconClass}" style="position: relative;"><i class="bi ${iconBi}"></i></div>`
    });
}

// --- 2. API: CARREGAR E RENDERIZAR ---
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
    } catch (e) { 
        console.error("Erro ao carregar pontos:", e); 
    } finally { 
        if (loader) loader.style.display = 'none'; 
    }
}

function renderizarNoMapaELista(locais) {
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];
    
    const listaContainer = document.getElementById('lista-locais');
    listaContainer.innerHTML = '';
    
    const contador = document.getElementById('contador-locais');
    if (contador) contador.innerText = locais.length;

    locais.forEach(local => {
        const marker = L.marker([local.lat, local.lng], { 
            icon: gerarIconeMarcador(local.tipo_sigla) 
        }).addTo(map);
        
        marker.on('click', () => abrirDetalhesLocal(local));
        
        // AGORA GUARDAMOS O NOME PARA A BUSCA FILTRAR O MAPA DEPOIS:
        markers.push({ 
            id: local.id, 
            marker: marker, 
            nome: local.nome.toLowerCase() 
        });

        const distTxt = local.distancia_km ? `${local.distancia_km} km` : '';
        const li = document.createElement('li');
        li.className = 'local-item';
        li.innerHTML = `
            <div class="local-info">
                <strong>${local.nome}</strong>
                <p>
                    <span><i class="bi bi-tag"></i> ${local.tipo_nome}</span>
                    <span class="distancia-badge"><i class="bi bi-geo-alt"></i> ${distTxt}</span>
                </p>
            </div>
            <i class="bi bi-chevron-right"></i>
        `;
        li.onclick = () => { 
            map.setView([local.lat, local.lng], 16); 
            abrirDetalhesLocal(local); 
        };
        listaContainer.appendChild(li);
    });
}

// --- 3. CONTROLES E EVENTOS DO MAPA ---
map.on('moveend', () => { 
    if (isScanActive) { 
        clearTimeout(debounceTimer); 
        debounceTimer = setTimeout(carregarPontos, 300); 
    } 
});

window.toggleScan = function() { 
    isScanActive = document.getElementById('check-scan').checked; 
    carregarPontos(); 
};

window.filtrar = function(tipo, btn) {
    filtroTipo = tipo;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    carregarPontos();
};

window.getUserLocation = function() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            userPos.lat = pos.coords.latitude; 
            userPos.lng = pos.coords.longitude;
            
            if(userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([userPos.lat, userPos.lng]).addTo(map).bindPopup("Você está aqui").openPopup();
            map.flyTo([userPos.lat, userPos.lng], 15);
            
            // Recarrega pontos para calcular distância
            carregarPontos();
        });
    }
};

// --- 4. SIDEBAR E DETALHES ---
const sidebar = document.getElementById('sidebar-locais');
const overlay = document.getElementById('overlay');

window.abrirSidebar = function(modo = 'lista') {
    sidebar.classList.add('open'); 
    overlay.classList.add('active');
    
    const modoLista = document.getElementById('modo-lista');
    const modoDetalhes = document.getElementById('modo-detalhes');
    const titulo = document.getElementById('sidebar-titulo');

    if(modo === 'lista') {
        if(modoLista) modoLista.style.display = 'block';
        if(modoDetalhes) modoDetalhes.style.display = 'none';
        if(titulo) titulo.textContent = 'Resultados da Tela';
    } else {
        if(modoLista) modoLista.style.display = 'none';
        if(modoDetalhes) modoDetalhes.style.display = 'flex';
    }
};

window.fecharSidebar = function() { 
    sidebar.classList.remove('open'); 
    overlay.classList.remove('active'); 
};

function abrirDetalhesLocal(local) {
    localSelecionado = local;
    let cor = 'blue'; let icone = 'bi-buildings';
    
    if(local.tipo_sigla === 'HOSP') { cor = 'red'; icone = 'bi-hospital'; }
    else if(local.tipo_sigla === 'UPA') { cor = 'orange'; icone = 'bi-building'; }
    else if(local.tipo_sigla === 'FARM') { cor = 'blue'; icone = 'bi-capsule'; }

    let htmlFoto = local.foto_url ? `<img src="${local.foto_url}" alt="Fachada" class="local-foto-fachada">` : '';

    let html = `
        ${htmlFoto}
        <div class="local-header">
            <div class="icon-box ${cor}"><i class="bi ${icone}"></i></div>
            <div class="local-header-info"><h2>${local.nome}</h2><p>${local.tipo_nome}</p></div>
        </div>
        <div class="info-section">
            <h3><i class="bi bi-geo-alt"></i> Endereço</h3>
            <div class="info-item" id="endereco-texto"><i class="bi bi-hourglass-split"></i> Buscando...</div>
            <button onclick="tracarRota(${local.lat}, ${local.lng})" class="user-btn btn-rota">
                <i class="bi bi-sign-turn-right-fill"></i> Traçar Rota até aqui
            </button>
        </div>
        <div class="info-section">
            <h3><i class="bi bi-telephone"></i> Telefone</h3>
            <div class="info-item">${local.telefone || "Não informado"}</div>
        </div>
    `;

    // Itens Dinâmicos (Medicamentos ou Médicos)
    if(local.tipo_sigla === 'FARM') {
        html += `<div class="info-section"><h3><i class="bi bi-capsule-pill"></i> Medicamentos</h3><div id="lista-meds">`;
        (local.medicamentos || []).forEach(m => {
            let badge = m.disponivel ? `<span class="vacina-badge">Disp.</span>` : `<span class="vacina-badge off">Falta</span>`;
            html += `<div class="vacina-item"><span>${m.nome}</span> ${badge}</div>`;
        });
        html += `</div></div>`;
    } else {
        html += `<div class="info-section"><h3><i class="bi bi-person-badge"></i> Médicos</h3><div id="lista-medicos">`;
        (local.medicos || []).forEach(m => {
            html += `<div class="medico-card"><strong>${m.nome}</strong><span>${m.especialidade}</span></div>`;
        });
        html += `</div></div>`;
    }

    // Painel do Colaborador
    if(typeof isUserStaff !== 'undefined' && isUserStaff) {
        html += `
            <div class="info-section edit-section">
                <button onclick="document.getElementById('form-edicao').style.display='block'; this.style.display='none'" class="btn-editar-local">Painel do Colaborador</button>
                <div id="form-edicao" style="display: none; margin-top:10px;">
                    <input type="text" id="novo-item-nome" class="form-control" placeholder="Nome do item">
                    <button onclick="salvarItem('${local.tipo_sigla === 'FARM' ? 'medicamento' : 'medico'}')" class="btn-adicionar-item">Adicionar</button>
                </div>
            </div>`;
    }

    document.getElementById('detalhes-local').innerHTML = html;
    abrirSidebar('detalhes');

    // Busca de Endereço Real
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${local.lat}&lon=${local.lng}`)
        .then(r => r.json())
        .then(data => {
            const addr = data.address;
            const texto = (addr.road || addr.pedestrian || "") + (addr.suburb ? ", " + addr.suburb : "");
            document.getElementById('endereco-texto').innerText = texto || data.display_name;
        })
        .catch(() => {
            document.getElementById('endereco-texto').innerText = `Lat: ${local.lat}, Lng: ${local.lng}`;
        });
}

// --- 5. LÓGICA DE ROTAS E BUSCA ---
window.tracarRota = function(latDestino, lngDestino) {
    if (!userPos.lat) return alert("Ative sua localização primeiro!");
    if (window.controleRota) map.removeControl(window.controleRota);

    fecharSidebar();

    try {
        window.controleRota = L.Routing.control({
            waypoints: [L.latLng(userPos.lat, userPos.lng), L.latLng(latDestino, lngDestino)],
            routeWhileDragging: false,
            collapsible: true,
            language: 'pt',
            lineOptions: { styles: [{color: '#0284c7', opacity: 0.8, weight: 6}] },
            createMarker: () => null
        }).addTo(map);
        document.getElementById('btn-limpar-rota').style.display = 'inline-flex';
    } catch (e) { console.error(e); }
};

window.limparRota = function() {
    if (window.controleRota) { map.removeControl(window.controleRota); window.controleRota = null; }
    document.getElementById('btn-limpar-rota').style.display = 'none';
};

window.filtrarPorNome = function() {
    // Normaliza o termo de busca (tira acentos e deixa minúsculo)
    const termo = document.getElementById('input-busca').value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); 
    
    // 1. Filtra os marcadores no mapa
    markers.forEach(m => {
        const nomeNormalizado = m.nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (nomeNormalizado.includes(termo)) {
            if (!map.hasLayer(m.marker)) m.marker.addTo(map);
        } else {
            if (map.hasLayer(m.marker)) map.removeLayer(m.marker);
        }
    });

    // 2. Filtra a lista lateral
    const itens = document.querySelectorAll('#lista-locais li');
    itens.forEach(item => {
        const nomeElemento = item.querySelector('strong');
        if (nomeElemento) {
            const nomeNormalizado = nomeElemento.innerText
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            item.style.display = nomeNormalizado.includes(termo) ? "flex" : "none";
        }
    });
};

// Inicia a aplicação
carregarPontos();