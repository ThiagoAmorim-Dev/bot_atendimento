const venom = require('venom-bot');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { validarData, diaDaSemana, disponivel, obterHorarioDisponivel } = require('./dataService');
const { formatarNumerosMensagem } = require('./util');

const sheetsDbUrl = 'https://api.sheety.co/be2a6b443056f481f94cc19d22b20b70/barbearia/';

const state = {};

venom.create({
    session: "ThiagoAmorimDeAlmeida",
    multidevice: true,
})
.then(client => start(client))
.catch(err => console.log(err));

const start = (client) => {
    client.onMessage(async (message) => {
        const chatId = message.from;

        if (!state[chatId]) {
            state[chatId] = { step: 0, servicoSelecionado: "" };
        }

        const currentState = state[chatId];

        if (message.body === 'menu') currentState.step = 0;

        switch (currentState.step) {
            case 0:
                await handleMenuPrincipal(client, chatId, currentState, message);
                break;
            case 1:
                await handleServicoSelecionado(client, chatId, currentState, message);
                break;
            case 2:
                await handleDataSelecionada(client, chatId, currentState, message);
                break;
            case 3:
                await handleHorarioSelecionado(client, chatId, currentState, message);
                break;
            case 4:
                await handleServicoConfirmado(client, chatId, currentState, message);
                break;
            case 5:
                await handleNomeConfirmado(client, chatId, currentState, message);
                break;
            default:
                client.sendText(chatId, "*Opção inválida. Digite apenas o número da opção que deseja selecionar.*");
                currentState.step = 0;
                break;
        }
    });
};

const handleMenuPrincipal = async (client, chatId, currentState, message) => {
    client.sendText(chatId, "*Olá! Bem-vindo ao atendimento automático da barbearia West.* \n\n*O que deseja?* \n\n1️⃣ *Marcar um horário*\n2️⃣ *Ver serviços e preços*\n3️⃣ *Desmarcar Agendamento*\n4️⃣ *Tirar dúvida com o Mikael*\n\n *Digite a palavra 'menu' caso queira voltar para o menu a qualquer momento.*");
    currentState.telefone = message.from;
    currentState.step = 1;
};

const handleServicoSelecionado = async (client, chatId, currentState, message) => {
    switch (message.body) {
        case '1':
            currentState.servicoSelecionado = "marcar horario";
            client.sendText(chatId, "*Por favor, digite a data que deseja no formato (dia/mês) 🗓️*\n*Exemplo: 15/04*.");
            currentState.step = 2;
            break;
        case '2':
            currentState.servicoSelecionado = "ver serviços e preços";
            const response = await axios.get(`${sheetsDbUrl}servicos`);
            const servicos = response.data.servicos;
            const mensagemServicos = servicos.map(servico => `\n*Serviço: ${servico.servico}*\n*Valor: ${servico.valor}*\n`).join('');
            client.sendText(chatId, "*Aqui estão nossos serviços e preços:*\n" + mensagemServicos + "\n\n*Deseja Agendar?* \n*1️⃣Sim* \n*2️⃣Não*");
            currentState.step = 2;
            break;
        case '3':
            currentState.servicoSelecionado = "desmarcar horario";
            currentState.step = 2;
            const responseAgendamentos = await axios.get(`${sheetsDbUrl}/agendamento`);
            const agendamentos = responseAgendamentos.data.agendamento.filter(agendamento => agendamento.telefone == message.from);
            if (agendamentos.length > 0) {
                currentState.agendamentos = agendamentos;
                const agendamentosMensagem = "*Encontrei os seguintes horários marcados*\n" +
                    currentState.agendamentos.map((agendamento, index) => `\n\n*${index + 1}. ${agendamento.data} às ${agendamento.horario} para ${agendamento.nome}*`).join('') +
                    "\n*Informe o número do agendamento que deseja desmarcar*";
                client.sendText(chatId, agendamentosMensagem);
                currentState.step = 3;
            } else {
                client.sendText(chatId, "*Você não possui nenhum horário marcado. Você pode mandar qualquer outra mensagem novamente para voltar ao menu.*");
                currentState.step = 0;
            }
            break;
        case '4':
            currentState.servicoSelecionado = "falar com mikael";
            client.sendText(chatId, "*Mikael irá respoder assim que puder. Por favor, aguarde. Caso queira voltar para o menu, basta digitar 'menu'.*");
            currentState.step = 2;
            break;
        default:
            client.sendText(chatId, "*Opção inválida. Digite apenas o número da opção que deseja selecionar.*");
            currentState.step = 1;
            break;
    }
};

const handleDataSelecionada = async (client, chatId, currentState, message) => {
    if (currentState.servicoSelecionado === "marcar horario") {
        if (!validarData(message.body)) {
            client.sendText(chatId, `Essa data não é válida. Por favor, digite novamente.`);
        } else if (diaDaSemana(message.body) === "domingo") {
            client.sendText(chatId, "*Não abrimos dia de domingo. Poderia escolher outra data?* 😅");
        } else {
            const disponibilidade = await disponivel(message.body);
            if (disponibilidade) {
                currentState.data = message.body.toString();
                const horariosDisponiveis = await obterHorarioDisponivel(currentState.data);
                const horariosFiltrados = horariosDisponiveis.filter(horario => horario !== '');
                if (horariosFiltrados.length > 0) {
                    const horariosMensagem = formatarNumerosMensagem(horariosFiltrados).map(horario => `*${horario}*\n`).join('');
                    client.sendText(chatId, "*Me informa o horário que deseja ⏰*\n\n" + horariosMensagem);
                    currentState.step = 3;
                } else {
                    client.sendText(chatId, `*Todos os horários para o dia ${currentState.data} já foram ocupados. Mas você pode digitar outra data ou digitar 'menu' para voltar para o menu.*`);
                }
            } else {
                client.sendText(chatId, `*Na data ${message.body}, a barbearia vai estar fechada o dia todo. Poderia escolher outra data, por favor?*`);
            }
        }
    } else if (currentState.servicoSelecionado === "ver serviços e preços") {
        if (message.body === "1") {
            currentState.servicoSelecionado = "marcar horario";
            client.sendText(chatId, "*Por favor, informe a data (dd/mm/aaaa) que deseja 🗓️*");
            currentState.step = 2;
        } else if (message.body === '2') {
            client.sendText(chatId, "*Sem problemas! Caso queira iniciar o atendimento novamente, basta enviar outra mensagem.*");
            currentState.step = 0;
        } else {
            client.sendText(chatId, "*Resposta inválida. Por favor, digite apenas 1 para marcar ou 2 para finalizar o atendimento.*");
            currentState.step = 2;
        }
    }
};

const handleHorarioSelecionado = async (client, chatId, currentState, message) => {
    if (currentState.servicoSelecionado === "marcar horario") {
        let horarios = await obterHorarioDisponivel(currentState.data);
        horarios = horarios.filter(horario => horario.trim() != '');
        if (horarios[message.body - 1] != null) {
            currentState.horarioEscolhido = horarios[parseInt(message.body) - 1];
            currentState.step = 4;
            const response = await axios.get(`${sheetsDbUrl}servicos`);
            const servicos = response.data.servicos;
            const mensagemServicos = servicos.map((servico, index) => ` *${index + 1}. Serviço: ${servico.servico} | Preço: ${servico.valor}*\n`).join('');
            client.sendText(chatId, mensagemServicos + '\n *Selecione o serviço que deseja. Você pode selecionar mais de um da seguinte forma: 1,2,3*');
        } else {
            const horariosDisponiveis = await obterHorarioDisponivel(currentState.data);
            const horariosFiltrados = horariosDisponiveis.filter(horario => horario !== '');
            const horariosMensagem = horariosFiltrados.map((horario, index) => `*${index + 1}. ${horario}* *horas*\n`).join('');
            client.sendText(chatId, "Escolha um horário válido.");
            client.sendText(chatId, "Me informa o horário que deseja ⏰\n\n" + horariosMensagem);
        }
    } else if (currentState.servicoSelecionado === "desmarcar horario") {
        const agendamentoEscolhidoIndex = parseInt(message.body) - 1;
        if (currentState.agendamentos[agendamentoEscolhidoIndex]) {
            const agendamentoEscolhido = currentState.agendamentos[agendamentoEscolhidoIndex];
            axios.delete(`${sheetsDbUrl}/agendamento/${agendamentoEscolhido.id}`)
            .then(() => {
                client.sendText(chatId, `*Seu agendamento do dia ${agendamentoEscolhido.data} para às ${agendamentoEscolhido.horario} foi desmarcado. Qualquer coisa estou à disposição.*`);
                currentState.step = 0;
            })
            .catch(error => {
                console.error("Erro ao desmarcar agendamento. ", error);
                client.sendText(chatId, "Houve um erro ao desmarcar seu agendamento. Por favor, tente novamente mais tarde.");
                currentState.step = 0;
            });
        }
    }
};

const handleServicoConfirmado = async (client, chatId, currentState, message) => {
    if (await isStringNumeroOuLista(message.body)) {
        const response = await axios.get(`${sheetsDbUrl}servicos`);
        const servicos = response.data.servicos;
        const servicosSelecionados = message.body.split(',').map(item => item.trim());
        const servicosCompletos = servicosSelecionados.map(indexServico => servicos[indexServico - 1].servico).join(',');
        currentState.servico = servicosCompletos;
        client.sendText(chatId, `*Agora digite o seu nome e sobrenome, por favor.*`);
        currentState.step = 5;
    } else {
        currentState.step = 4;
        client.sendText(chatId, '*O serviço selecionado não é válido, digite apenas as opções mostradas no menu*');
        const response = await axios.get(`${sheetsDbUrl}servicos`);
        const servicos = response.data.servicos;
        const mensagemServicos = servicos.map((servico, index) => ` *${index + 1}. Serviço: ${servico.servico} | Preço: R$${servico.valor}*\n`).join('');
        client.sendText(chatId, mensagemServicos + '\n *Selecione o serviço que deseja. Você pode selecionar mais de um da seguinte forma: 1,2,3*');
    }
};

const handleNomeConfirmado = async (client, chatId, currentState, message) => {
    client.sendText(chatId, `*Obrigado, ${message.body}. Seu horário foi marcado.*`);
    currentState.id = uuidv4();
    const agendamento = {
        id: uuidv4(),
        data: currentState.data,
        horario: currentState.horarioEscolhido,
        nome: message.body,
        servico: currentState.servico,
        telefone: currentState.telefone 
    };

    axios.post(`${sheetsDbUrl}agendamento`, { agendamento })
        .then(response => {
            console.log('Dados salvos com sucesso:', response.data);
        })
        .catch(error => {
            console.error('Erro ao enviar dados:', error);
        });
    console.log(agendamento);
    currentState.step = 0;
    currentState.servicoSelecionado = "";
};

async function isStringNumeroOuLista(str) {
    if (typeof str !== 'string' || str.trim() === '') return false;
    const regex = /^\d+$/;
    const items = str.split(',');
    const response = await axios.get(`${sheetsDbUrl}servicos`);
    const servicos = response.data.servicos;

    return items.every(item => {
        const index = parseInt(item.trim(), 10) - 1;
        return regex.test(item.trim()) && index >= 0 && index < servicos.length;
    });
}
