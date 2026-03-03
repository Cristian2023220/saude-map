let localSelecionado = null;

// Função nativa do Django para pegar o Token de Segurança (CSRF)
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

function abrirPanel(local){
    localSelecionado = local;
    
    document.getElementById("sidepanel").classList.add("active");
    document.getElementById("overlay").classList.add("active");
    
    document.getElementById('painel-nome').innerText = local.nome;
    document.getElementById('painel-tipo').innerText = local.tipo_nome;
    document.getElementById('painel-telefone').innerText = local.telefone || "Não informado";
    document.getElementById('painel-endereco').innerText = `Lat: ${local.lat}, Lng: ${local.lng}`;

    const containerEdicao = document.getElementById('modo-edicao-container');
    if(containerEdicao) {
        containerEdicao.style.display = 'none';
        containerEdicao.innerHTML = '';
    }

    let htmlServicos = '';
    
    if(local.tipo_sigla === 'FARM') {
        // --- GERA LISTA DE MEDICAMENTOS REAIS ---
        let htmlMeds = '';
        local.medicamentos.forEach(med => {
            const iconClass = med.disponivel ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
            const colorStyle = med.disponivel ? '#16a34a' : '#dc2626';
            const statusText = med.disponivel ? 'Disp.' : 'Em Falta';
            htmlMeds += `
                <div class="card" style="display:flex; justify-content:space-between; margin-bottom: 5px; align-items:center;">
                    <span>${med.nome}</span> 
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="color:${colorStyle}; font-weight:bold;"><i class="bi ${iconClass}"></i> ${statusText}</span>
                        <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>
                    </div>
                </div>`;
        });

        // --- GERA LISTA DE PRODUTOS REAIS ---
        let htmlProds = '';
        local.produtos.forEach(prod => {
            const iconClass = prod.disponivel ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
            const colorStyle = prod.disponivel ? '#16a34a' : '#dc2626';
            const statusText = prod.disponivel ? 'Disp.' : 'Em Falta';
            htmlProds += `
                <div class="card" style="display:flex; justify-content:space-between; margin-bottom: 5px; align-items:center;">
                    <span>${prod.nome}</span> 
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="color:${colorStyle}; font-weight:bold;"><i class="bi ${iconClass}"></i> ${statusText}</span>
                        <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>
                    </div>
                </div>`;
        });

        htmlServicos = `
            <h2><i class="bi bi-capsule-pill"></i> Medicamentos</h2>
            <div id="lista-medicamentos" class="lista-items">${htmlMeds}</div>
            <h2 style="margin-top: 15px;"><i class="bi bi-bag-dash"></i> Produtos Gratuitos</h2>
            <div id="lista-produtos" class="lista-items">${htmlProds}</div>
        `;

    } else if(local.tipo_sigla === 'POST' || local.tipo_sigla === 'HOSP' || local.tipo_sigla === 'UPA') {
        // --- GERA LISTA DE MÉDICOS REAIS ---
        let htmlMedicos = '';
        local.medicos.forEach(medico => {
            htmlMedicos += `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div><strong>${medico.nome}</strong><br><small>${medico.especialidade}</small></div>
                    <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>
                </div>`;
        });

        htmlServicos = `
            <div class="section-title">Médicos Disponíveis</div>
            <div id="lista-medicos-disponiveis">${htmlMedicos}</div>
        `;
    }
    document.getElementById('area-servicos-dinamica').innerHTML = htmlServicos;
}

function fecharPanel(){
    document.getElementById("sidepanel").classList.remove("active");
    document.getElementById("overlay").classList.remove("active");
}

function abrirModoEdicao() {
    const container = document.getElementById('modo-edicao-container');
    container.style.display = 'block';

    let htmlForm = '';
    if (localSelecionado.tipo_sigla === 'FARM') {
        htmlForm = `
            <h4 style="margin-bottom: 10px; color: #1e293b;">Novo Medicamento</h4>
            <div style="display: flex; gap: 5px; margin-bottom: 15px;">
                <input type="text" id="novo-med-nome" placeholder="Nome (Ex: Paracetamol)" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                <select id="novo-med-status" style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="Disp.">Disponível</option>
                    <option value="Em Falta">Em Falta</option>
                </select>
                <button type="button" onclick="salvarNovoMedicamento()" style="padding:8px 12px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;"><i class="bi bi-plus-lg"></i></button>
            </div>
            <h4 style="margin-bottom: 10px; color: #1e293b;">Novo Produto Gratuito</h4>
            <div style="display: flex; gap: 5px; margin-bottom: 15px;">
                <input type="text" id="novo-prod-nome" placeholder="Produto (Ex: Fraldas)" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                <select id="novo-prod-status" style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="Disp.">Disponível</option>
                    <option value="Em Falta">Em Falta</option>
                </select>
                <button type="button" onclick="salvarNovoProduto()" style="padding:8px 12px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;"><i class="bi bi-plus-lg"></i></button>
            </div>
            <button onclick="fecharModoEdicao()" style="width:100%; padding:8px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer;">Fechar Edição</button>
        `;
    } else {
        htmlForm = `
            <h4 style="margin-bottom: 10px; color: #1e293b;">Adicionar Médico</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                <input type="text" id="novo-medico-nome" placeholder="Nome do Médico (Ex: Dr. João)" style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                <input type="text" id="novo-medico-espec" placeholder="Especialidade (Ex: Pediatra)" style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                <button type="button" onclick="salvarNovoMedico()" style="padding:8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Salvar Médico</button>
            </div>
            <button onclick="fecharModoEdicao()" style="width:100%; padding:8px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer;">Fechar Edição</button>
        `;
    }
    container.innerHTML = htmlForm;
}

function fecharModoEdicao() { document.getElementById('modo-edicao-container').style.display = 'none'; }

// --- FUNÇÕES DE REQUISIÇÃO (FETCH) PARA O BANCO DE DADOS ---

async function enviarParaBanco(dadosJson) {
    const url = `/api/pontos/${localSelecionado.id}/adicionar-item/`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') // Segurança do Django
        },
        body: JSON.stringify(dadosJson)
    });
    return response;
}

async function salvarNovoMedico() {
    const nome = document.getElementById('novo-medico-nome').value;
    const espec = document.getElementById('novo-medico-espec').value;
    if(!nome || !espec) { alert("Preencha o nome e a especialidade!"); return; }

    const response = await enviarParaBanco({ tipo_item: 'medico', nome: nome, especialidade: espec });
    
    if(response.ok) {
        // Se o banco salvou, adiciona na tela
        const lista = document.getElementById('lista-medicos-disponiveis');
        lista.innerHTML += `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div><strong>${nome}</strong><br><small>${espec}</small></div>
                <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>
            </div>`;
        document.getElementById('novo-medico-nome').value = '';
        document.getElementById('novo-medico-espec').value = '';
    } else { alert("Erro ao salvar no banco de dados."); }
}

async function salvarNovoMedicamento() {
    const nome = document.getElementById('novo-med-nome').value;
    const status = document.getElementById('novo-med-status').value;
    if(!nome) { alert("Preencha o nome do medicamento!"); return; }

    const response = await enviarParaBanco({ tipo_item: 'medicamento', nome: nome, status: status });

    if(response.ok) {
        const iconClass = status === 'Disp.' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
        const colorStyle = status === 'Disp.' ? '#16a34a' : '#dc2626';
        document.getElementById('lista-medicamentos').innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; margin-bottom: 5px; align-items:center;">
                <span>${nome}</span> 
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="color:${colorStyle}; font-weight:bold;"><i class="bi ${iconClass}"></i> ${status}</span>
                    <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        document.getElementById('novo-med-nome').value = '';
    } else { alert("Erro ao salvar no banco."); }
}

async function salvarNovoProduto() {
    const nome = document.getElementById('novo-prod-nome').value;
    const status = document.getElementById('novo-prod-status').value;
    if(!nome) { alert("Preencha o nome do produto!"); return; }

    const response = await enviarParaBanco({ tipo_item: 'produto', nome: nome, status: status });

    if(response.ok) {
        const iconClass = status === 'Disp.' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
        const colorStyle = status === 'Disp.' ? '#16a34a' : '#dc2626';
        document.getElementById('lista-produtos').innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; margin-bottom: 5px; align-items:center;">
                <span>${nome}</span> 
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="color:${colorStyle}; font-weight:bold;"><i class="bi ${iconClass}"></i> ${status}</span>
                    <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        document.getElementById('novo-prod-nome').value = '';
    } else { alert("Erro ao salvar no banco."); }
}