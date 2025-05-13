// Estado da aplicação
let despesas = [];
const VALOR_TOTAL_DISPONIBILIZADO = 60000.00;
const MASTER_PASSWORD = "CONSEG_MPMT_2024"; // Senha mestra - Alterar para uma senha forte em um cenário real
let isAuthenticated = false;

// Elementos do DOM (Obtidos após o carregamento da página)
let formDespesa, formInputs, adicionarDespesaButton, tabelaDespesasBody, totalGastoEl, saldoDisponivelEl, totalDisponibilizadoEl, customAlertEl, customAlertMessageEl, passwordSectionEl, passwordInputEl, loginButtonEl;

// Função para formatar data (dd/mm/aaaa)
function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    // Verifica se a data tem o formato esperado antes de formatar
    if (ano && mes && dia && ano.length === 4 && mes.length === 2 && dia.length === 2) {
        return `${dia}/${mes}/${ano}`;
    }
    return dataISO; // Retorna o valor original se não for uma data ISO válida
}

// Função para formatar valor monetário (BRL)
function formatarMoeda(valor) {
    const numero = parseFloat(valor);
    if (isNaN(numero)) {
        return '0,00'; // Retorna um valor padrão se não for um número válido
    }
    return numero.toFixed(2).replace('.', ',');
}

// Função para exibir alerta customizado
function showAlert(message, type = 'error', duration = 3000) {
    if (!customAlertEl || !customAlertMessageEl) return; // Verifica se os elementos existem

    customAlertMessageEl.textContent = message;
    customAlertEl.classList.remove('alert-success', 'alert-error');
    if (type === 'success') {
        customAlertEl.classList.add('alert-success');
    } else {
        customAlertEl.classList.add('alert-error');
    }
    customAlertEl.style.display = 'block';
    // Limpa timeout anterior, se houver
    if (customAlertEl.timeoutId) {
        clearTimeout(customAlertEl.timeoutId);
    }
    customAlertEl.timeoutId = setTimeout(() => {
        customAlertEl.style.display = 'none';
    }, duration);
}

// Função para habilitar/desabilitar controles
function setControlsDisabled(disabled) {
    if (!formInputs || !adicionarDespesaButton) return; // Verifica se os elementos existem

    formInputs.forEach(input => input.disabled = disabled);
    adicionarDespesaButton.disabled = disabled;
    // Os botões de exclusão são atualizados em renderizarTabela
}

// Função para verificar senha
function checkPassword() {
    if (!passwordInputEl || !passwordSectionEl) return; // Verifica se os elementos existem

    if (passwordInputEl.value === MASTER_PASSWORD) {
        isAuthenticated = true;
        passwordSectionEl.style.display = 'none'; // Esconde a seção da senha
        setControlsDisabled(false); // Habilita os controles do formulário
        renderizarTabela(); // Re-renderiza a tabela para habilitar botões de exclusão
        showAlert('Acesso desbloqueado com sucesso!', 'success');
    } else {
        isAuthenticated = false;
        showAlert('Senha incorreta. Tente novamente.', 'error');
        passwordInputEl.value = ''; // Limpa o campo da senha
    }
}

// Função para renderizar a tabela de despesas
function renderizarTabela() {
    if (!tabelaDespesasBody) return; // Verifica se o elemento existe

    tabelaDespesasBody.innerHTML = '';

    despesas.forEach((despesa, index) => {
        const newRow = tabelaDespesasBody.insertRow();
        newRow.insertCell().textContent = formatarData(despesa.dataAquisicao);
        newRow.insertCell().textContent = despesa.descricaoItem;
        const valorCell = newRow.insertCell();
        valorCell.textContent = formatarMoeda(despesa.valorPago);
        valorCell.classList.add('currency');
        newRow.insertCell().textContent = despesa.fornecedor;
        newRow.insertCell().textContent = despesa.numDocumento;
        newRow.insertCell().textContent = despesa.observacoes || '-';

        const acaoCell = newRow.insertCell();
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add('delete-btn');
        deleteButton.disabled = !isAuthenticated; // Desabilita se não estiver autenticado
        deleteButton.onclick = () => excluirDespesa(index);
        acaoCell.appendChild(deleteButton);
        acaoCell.classList.add('text-center');
    });
    atualizarResumoFinanceiro();
    // Salva apenas se autenticado para evitar manipulação não autorizada
    // (Embora localStorage por si só não seja um mecanismo seguro)
    if (isAuthenticated) {
         salvarDespesasNoLocalStorage();
    }
}

// Função para atualizar o resumo financeiro
function atualizarResumoFinanceiro() {
     if (!totalGastoEl || !saldoDisponivelEl || !totalDisponibilizadoEl) return; // Verifica se os elementos existem

    const totalDespesas = despesas.reduce((acc, despesa) => {
        const valor = parseFloat(despesa.valorPago);
        return acc + (isNaN(valor) ? 0 : valor); // Soma apenas se for um número válido
    } , 0);

    const saldo = VALOR_TOTAL_DISPONIBILIZADO - totalDespesas;

    totalGastoEl.textContent = formatarMoeda(totalDespesas);
    saldoDisponivelEl.textContent = formatarMoeda(saldo);
    totalDisponibilizadoEl.textContent = formatarMoeda(VALOR_TOTAL_DISPONIBILIZADO);
}

// Função para adicionar despesa
function adicionarDespesa(event) {
    event.preventDefault();

    if (!isAuthenticated) {
        showAlert('Acesso bloqueado. Por favor, insira a senha para adicionar despesas.', 'error');
        return;
    }

    // Garante que os elementos do formulário foram obtidos
    if (!formDespesa) return;
    const dataAquisicaoEl = document.getElementById('dataAquisicao');
    const descricaoItemEl = document.getElementById('descricaoItem');
    const valorPagoEl = document.getElementById('valorPago');
    const fornecedorEl = document.getElementById('fornecedor');
    const numDocumentoEl = document.getElementById('numDocumento');
    const observacoesEl = document.getElementById('observacoes');

    if (!dataAquisicaoEl || !descricaoItemEl || !valorPagoEl || !fornecedorEl || !numDocumentoEl || !observacoesEl) {
         showAlert('Erro interno: Elemento do formulário não encontrado.', 'error');
         return;
    }

    const dataAquisicao = dataAquisicaoEl.value;
    const descricaoItem = descricaoItemEl.value.trim(); // Remove espaços extras
    const valorPago = parseFloat(valorPagoEl.value);
    const fornecedor = fornecedorEl.value.trim();
    const numDocumento = numDocumentoEl.value.trim();
    const observacoes = observacoesEl.value.trim();

    if (!dataAquisicao || !descricaoItem || isNaN(valorPago) || valorPago <= 0 || !fornecedor || !numDocumento) {
        showAlert('Por favor, preencha todos os campos obrigatórios corretamente.', 'error');
        return;
    }

    const totalDespesasAtual = despesas.reduce((acc, despesa) => {
         const valor = parseFloat(despesa.valorPago);
         return acc + (isNaN(valor) ? 0 : valor);
    }, 0);

    if ( (totalDespesasAtual + valorPago) > VALOR_TOTAL_DISPONIBILIZADO) {
         showAlert('O valor da despesa excede o saldo disponível!', 'error');
         return;
    }

    const novaDespesa = {
        dataAquisicao,
        descricaoItem,
        valorPago,
        fornecedor,
        numDocumento,
        observacoes
    };

    despesas.push(novaDespesa);
    // Ordena por data (mais recentes primeiro, se desejar, ou mais antigas primeiro como está)
    despesas.sort((a, b) => new Date(a.dataAquisicao) - new Date(b.dataAquisicao));

    renderizarTabela();
    formDespesa.reset();
    showAlert('Despesa adicionada com sucesso!', 'success', 2000);
}

// Função para excluir despesa
function excluirDespesa(index) {
    if (!isAuthenticated) {
        showAlert('Acesso bloqueado. Por favor, insira a senha para excluir despesas.', 'error');
        return;
    }
    // Usando window.confirm para compatibilidade básica
    if (window.confirm('Tem certeza de que deseja excluir esta despesa?')) {
        despesas.splice(index, 1); // Remove o item no índice especificado
        renderizarTabela();
        showAlert('Despesa excluída com sucesso!', 'success', 2000);
    }
}

// Funções para persistência de dados no LocalStorage
function salvarDespesasNoLocalStorage() {
    // Salva apenas se autenticado para maior segurança, embora LocalStorage não seja seguro por si só.
    if(isAuthenticated){
         try {
             localStorage.setItem('despesasCONSEG', JSON.stringify(despesas));
         } catch (e) {
             console.error("Erro ao salvar no LocalStorage:", e);
             showAlert("Não foi possível salvar os dados localmente. Verifique as permissões do navegador.", "error");
         }
    }
}

function carregarDespesasDoLocalStorage() {
    try {
        const despesasSalvas = localStorage.getItem('despesasCONSEG');
        if (despesasSalvas) {
            despesas = JSON.parse(despesasSalvas);
             // Validação básica dos dados carregados
             if (!Array.isArray(despesas)) {
                 despesas = getDefaultDespesas();
             } else {
                 // Garante que valorPago seja número
                 despesas = despesas.map(d => ({...d, valorPago: parseFloat(d.valorPago) || 0}));
             }
        } else {
            despesas = getDefaultDespesas();
        }
    } catch (e) {
        console.error("Erro ao carregar do LocalStorage:", e);
        despesas = getDefaultDespesas(); // Usa dados padrão em caso de erro
    }
    // Ordena após carregar ou definir padrão
    despesas.sort((a, b) => new Date(a.dataAquisicao) - new Date(b.dataAquisicao));
}

function getDefaultDespesas() {
     // Retorna os dados de exemplo padrão
    return [
        { dataAquisicao: '2024-04-15', descricaoItem: 'Aquisição de uma Starlink (Antena + Roteador)', valorPago: 1799.00, fornecedor: 'Starlink Brasil Serviços de Internet Ltda.', numDocumento: 'NF-e 789012', observacoes: 'Equipamento para acesso à internet' },
        { dataAquisicao: '2024-05-01', descricaoItem: 'Pagamento de uma mensalidade de internet Starlink', valorPago: 576.00, fornecedor: 'Starlink Brasil Serviços de Internet Ltda.', numDocumento: 'Fatura 052024-SL', observacoes: 'Referente ao mês de Maio/2024' }
    ];
}


// Inicialização da aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Obter referências aos elementos do DOM aqui, pois agora eles existem
    formDespesa = document.getElementById('formDespesa');
    formInputs = formDespesa ? formDespesa.querySelectorAll('input, textarea') : [];
    adicionarDespesaButton = document.getElementById('adicionarDespesaButton');
    tabelaDespesasBody = document.getElementById('tabelaDespesas')?.getElementsByTagName('tbody')[0]; // Adicionado '?' para segurança
    totalGastoEl = document.getElementById('totalGasto');
    saldoDisponivelEl = document.getElementById('saldoDisponivel');
    totalDisponibilizadoEl = document.getElementById('totalDisponibilizado');
    customAlertEl = document.getElementById('customAlert');
    customAlertMessageEl = document.getElementById('customAlertMessage');
    passwordSectionEl = document.getElementById('passwordSection');
    passwordInputEl = document.getElementById('passwordInput');
    loginButtonEl = document.getElementById('loginButton');

    // Verificar se todos os elementos essenciais foram encontrados
    if (!formDespesa || !tabelaDespesasBody || !totalGastoEl || !saldoDisponivelEl || !totalDisponibilizadoEl || !customAlertEl || !customAlertMessageEl || !passwordSectionEl || !passwordInputEl || !loginButtonEl) {
        console.error("Erro: Um ou mais elementos essenciais do DOM não foram encontrados.");
        // Poderia exibir uma mensagem para o usuário aqui
        return; // Impede a execução do restante do script se elementos críticos faltarem
    }

    // Adicionar Event Listeners
    formDespesa.addEventListener('submit', adicionarDespesa);
    loginButtonEl.addEventListener('click', checkPassword);
    passwordInputEl.addEventListener('keypress', function(event) {
        // Verifica se a tecla pressionada foi 'Enter'
        if (event.key === 'Enter' || event.keyCode === 13) {
             event.preventDefault(); // Impede o comportamento padrão do Enter (ex: submeter formulário)
            checkPassword();
        }
    });

    // Carregar dados e configurar estado inicial
    carregarDespesasDoLocalStorage();
    setControlsDisabled(true); // Começa com os controles desabilitados
    renderizarTabela(); // Renderiza a tabela (com botões de exclusão desabilitados)

    // Define a data máxima para o input de data como hoje
    const dataAquisicaoInput = document.getElementById('dataAquisicao');
    if (dataAquisicaoInput) {
        try {
             const today = new Date().toISOString().split('T')[0];
             dataAquisicaoInput.setAttribute('max', today);
        } catch(e) {
             console.error("Erro ao definir data máxima:", e);
        }
    }
});