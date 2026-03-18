// --- VARIÁVEIS GLOBAIS ---
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

function gerarIconeMarcador(tipo) {
    let iconClass = 'map-icon-posto'; 
    let iconBi = 'bi-buildings';
    
    if (tipo === 'HOSP') { 
        iconClass = 'map-icon-hospital'; iconBi = 'bi-hospital'; 
    } else if (tipo === 'FARM') { 
        iconClass = 'map-icon-posto blue'; iconBi = 'bi-capsule'; 
    } else if (tipo === 'UPA' || tipo === 'POST') { 
        iconClass = 'map-icon-upa'; iconBi = 'bi-building'; 
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
    if (listaContainer) listaContainer.innerHTML = '';
    
    const contador = document.getElementById('contador-locais');
    if (contador) contador.innerText = locais.length;

    locais.forEach(local => {
        const marker = L.marker([local.lat, local.lng], { 
            icon: gerarIconeMarcador(local.tipo_sigla) 
        }).addTo(map);
        
        marker.on('click', () => abrirDetalhesLocal(local));
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
        if (listaContainer) listaContainer.appendChild(li);
    });
}

// --- 3. CONTROLES DO MAPA ---
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
            userMarker = L.marker([userPos.lat, userPos.lng]).addTo(map).bindPopup("Você").openPopup();
            map.flyTo([userPos.lat, userPos.lng], 15);
            carregarPontos(); // Recarrega para calcular distâncias
        });
    }
};

// --- 4. SIDEBAR E DETALHES ---
const sidebar = document.getElementById('sidebar-locais');
const overlay = document.getElementById('overlay');

window.abrirSidebar = function(modo = 'lista') {
    sidebar.classList.add('open'); 
    overlay.classList.add('active');
    if(modo === 'lista') {
        document.getElementById('modo-lista').style.display = 'block';
        document.getElementById('modo-detalhes').style.display = 'none';
        document.getElementById('sidebar-titulo').textContent = 'Resultados da Tela';
    } else {
        document.getElementById('modo-lista').style.display = 'none';
        document.getElementById('modo-detalhes').style.display = 'flex';
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

    // 1. Começamos a montar o HTML básico (que todos veem)
    let html = `
        ${htmlFoto}
        <div class="local-header">
            <div class="icon-box ${cor}"><i class="bi ${icone}"></i></div>
            <div class="local-header-info"><h2>${local.nome}</h2><p>${local.tipo_nome}</p></div>
        </div>
        <div class="info-section">
            <h3><i class="bi bi-geo-alt"></i> Endereço</h3>
            <div class="info-item" id="endereco-texto"><i class="bi bi-hourglass-split"></i> Buscando...</div>
            <button onclick="tracarRota(${local.lat}, ${local.lng})" class="user-btn" style="margin-top:10px; background:#0284c7; width:100%; justify-content:center;">
                <i class="bi bi-sign-turn-right-fill"></i> Traçar Rota
            </button>
        </div>
        <div class="info-section">
            <h3><i class="bi bi-telephone"></i> Telefone</h3>
            <div class="info-item">${local.telefone || "Não informado"}</div>
        </div>
    `;
    // Verificamos a variável que criamos lá no index.html
    if (window.isUserStaff) {
        html += `
        <div class="info-section edit-section" style="margin-top: 20px; border-top: 2px solid #f0f2f5; padding-top: 15px;">
            <button onclick="document.getElementById('form-edicao').style.display='block'; this.style.display='none'" class="user-btn" style="background: #198754; width: 100%; justify-content: center; gap: 8px;">
                <i class="bi bi-pencil-square"></i> Painel do Colaborador
            </button>
            
            <div id="form-edicao" style="display: none; margin-top:15px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                <label style="font-weight:bold; display:block; margin-bottom:8px; color: #334155;">Cadastrar Informação</label>
                <input type="text" id="novo-item-nome" class="form-control" placeholder="Nome do médico ou remédio" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:5px; margin-bottom:10px;">
                
                <button onclick="salvarItem('${local.tipo_sigla === 'FARM' ? 'medicamento' : 'medico'}')" class="user-btn" style="width:100%; background:#2c3e50; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">
                    <i class="bi bi-plus-lg"></i> Adicionar ao Banco
                </button>
            </div>
        </div>`;
    }
    document.getElementById('detalhes-local').innerHTML = html;
    const tituloSidebar = document.getElementById('sidebar-titulo');
    if (tituloSidebar) tituloSidebar.textContent = 'Detalhes do Local';

    abrirSidebar('detalhes');

    // 4. Busca o endereço real via API
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${local.lat}&lon=${local.lng}`)
        .then(r => r.json())
        .then(data => {
            const addr = data.address;
            const texto = (addr.road || addr.pedestrian || "") + (addr.suburb ? ", " + addr.suburb : "");
            document.getElementById('endereco-texto').innerText = texto || data.display_name;
        })
        .catch(() => document.getElementById('endereco-texto').innerText = `Lat: ${local.lat}, Lng: ${local.lng}`);
}



// --- 5. LÓGICA DE ROTAS E BUSCA (Blindada) ---
window.tracarRota = function(latDestino, lngDestino) {
    // 1. Verificação de segurança
    if (!userPos.lat || !userPos.lng) {
        alert("Por favor, clique em 'Minha Localização' primeiro!");
        return;
    }

    // 2. LIMPEZA AGRESSIVA (Evita duplicidade)
    // Remove o objeto do mapa se ele existir
    if (window.controleRota) {
        try {
            map.removeControl(window.controleRota);
        } catch (e) { console.log("Controle já removido"); }
        window.controleRota = null;
    }

    // Remove qualquer caixa de texto órfã que tenha sobrado no HTML
    document.querySelectorAll('.leaflet-routing-container').forEach(container => {
        container.remove();
    });

    fecharSidebar();

    // 3. CRIAÇÃO DA NOVA ROTA
    try {
        window.controleRota = L.Routing.control({
            waypoints: [
                L.latLng(parseFloat(userPos.lat), parseFloat(userPos.lng)), 
                L.latLng(parseFloat(latDestino), parseFloat(lngDestino))
            ],
            lineOptions: {
                styles: [{color: '#0284c7', opacity: 0.8, weight: 6}]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            routeWhileDragging: false,
            show: true,
            collapsible: true,
            createMarker: function() { return null; }
        }).addTo(map);

        // Mostra o botão de limpar
        const btnLimpar = document.getElementById('btn-limpar-rota');
        if (btnLimpar) btnLimpar.style.display = 'inline-flex';

    } catch (erro) {
        console.error("Erro ao traçar rota:", erro);
    }
};

window.limparRota = function() {
    if (window.controleRota) { map.removeControl(window.controleRota); window.controleRota = null; }
    document.getElementById('btn-limpar-rota').style.display = 'none';
};

window.filtrarPorNome = function() {
    const termo = document.getElementById('input-busca').value
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    markers.forEach(m => {
        const nomeNormalizado = m.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nomeNormalizado.includes(termo)) {
            if (!map.hasLayer(m.marker)) m.marker.addTo(map);
        } else {
            if (map.hasLayer(m.marker)) map.removeLayer(m.marker);
        }
    });

    const itens = document.querySelectorAll('#lista-locais li');
    itens.forEach(item => {
        const nome = item.querySelector('strong').innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        item.style.display = nome.includes(termo) ? "flex" : "none";
    });
};

// Iniciar
carregarPontos();