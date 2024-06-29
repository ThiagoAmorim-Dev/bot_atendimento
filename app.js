const venom = require('venom-bot');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { validarData, diaDaSemana, disponivel, obterHorarioDisponivel } = require('./dataService');
const { formatarNumerosMensagem } = require('./util');

venom.create({
    session: "Barbearia-BOT",
    multidevice: true,
})
.then((client) => start(client))
.catch((err) => console.log(err));

// URL da API SheetsDB
const sheetsDbUrl = 'https://api.sheety.co/be2a6b443056f481f94cc19d22b20b70/barbearia/';
var horarios = [];

// estados de conversação
var state = {};

// função de início do atendimento
const start = (client) => {
    client.onMessage(async (message) => {
        const chatId = message.from;

        // inicializa o estado do chat se não existir
        if (!state[chatId]) {
            state[chatId] = { step: 0, servicoSelecionado: "" };
        }

        const currentState = state[chatId];

        if (message.body === '0'){
            currentState.step = 0;
        }

        // início do atendimento
        if (currentState.step === 0) {
            client.sendText(chatId, "*Olá! Bem-vindo ao atendimento automático da barbearia West.* \n\n*O que deseja?* \n\n1️⃣ *Marcar um horário*\n2️⃣ *Ver serviços e preços*\n3️⃣ *Desmarcar Agendamento*\n\n *Digite 0 caso queira voltar para o menu a qualquer momento*");

            currentState.telefone = message.from;

            // inicia a etapa 1 
            currentState.step = 1;

        // ETAPA 1 - DEFINE O QUE O USUÁRIO QUER FAZER 
        } else if (currentState.step === 1) {
            if (message.body === '1') {
                currentState.servicoSelecionado = "marcar horario";

                client.sendText(chatId, "*Por favor, digite a data (dd/mm/aaaa) que deseja 🗓️*");
                currentState.step = 2;

            } else if (message.body === '2') {
                currentState.servicoSelecionado = "ver serviços e preços";

                let response = await axios.get(`${sheetsDbUrl}servicos`);
                let servicos = response.data.servicos;
                let mensagemServicos = "";

                servicos.forEach(servico => {
                    mensagemServicos += `\n*Serviço: ${servico.servico}*\n*Valor: R$${servico.valor} reais*\n`
                });

                // Mensagem de gancho para a etapa 2 
                client.sendText(chatId, "*Aqui estão nossos serviços e preços:*\n" + mensagemServicos + "\n\n*Deseja Agendar?* \n*1️⃣Sim* \n*2️⃣Não*");
                currentState.step = 2;

            } else if (message.body === '3') {
                // verifica se na planilha existe algum horário marcado associado ao número 
                currentState.servicoSelecionado = "desmarcar horario";
                currentState.step = 2;

                let response = await axios.get(`${sheetsDbUrl}/agendamento`);

                if (response.data.agendamento.length > 0) {
                    currentState.agendamentos = response.data.agendamento;

                    // mensagem gancho para a etapa 3
                    let agendamentosMensagem = "*Encontrei os seguintes horários marcados*";

                    currentState.agendamentos.forEach((agendamento, index) => {
                        agendamentosMensagem += `\n\n*${index + 1}. ${agendamento.data} às ${agendamento.horario} para ${agendamento.nome}*`
                    });
                    agendamentosMensagem += "\n*Informe o número do agendamento que deseja desmarcar*";

                    client.sendText(chatId, agendamentosMensagem);
                    currentState.step = 3;
                } else {
                    client.sendText(chatId, "Você não possui nenhum horário marcado.");
                    currentState.step = 0;
                }

            } else {
                client.sendText(chatId, "Perdão, não entendi a mensagem.");
                currentState.step = 1; 
            }

        // SEGUNDA ETAPA
        } else if (currentState.step === 2) {
            // MARCAR HORÁRIO
            if (currentState.servicoSelecionado === "marcar horario") {
                if (!validarData(message.body)) {
                    client.sendText(chatId, `Essa data não é válida. Por favor, digite novamente.`);
                } else if (diaDaSemana(message.body) === "Domingo") {
                    client.sendText(chatId, "Infelizmente, não abrimos dia de domingo. Poderia escolher outra data? 😅");
                } else {
                    let disponibilidade = await disponivel(message.body);
                    if (disponibilidade){
                        currentState.data = message.body.toString();
                        horarios = await obterHorarioDisponivel(currentState.data);
                        horarios = horarios.filter(horario => horario !== '');
                        if (horarios.length > 0){
                            var horariosMensagem = "";
                            let horariosformatados = formatarNumerosMensagem(horarios);
                            horariosformatados.forEach(horario => {
                                horariosMensagem += `*${horario}*\n`;
                            });
                            // mensagem gancho para a etapa 3
                            client.sendText(chatId, "*Me informa o horário que deseja ⏰*\n\n"+horariosMensagem);
                            currentState.step = 3;
                        } else {
                            client.sendText(chatId, `*Infelizmente todos os horários para o dia ${currentState.data} já foram ocupados. Mas você pode digitar outra data ou digitar 0 para voltar para o menu.*`)
                        }
                    } else {
                        client.sendText(chatId, `*Na data ${message.body}, a barbearia vai estar fechada o dia todo. Poderia escolher outro data, por favor?*`);
                    }
                }
            // VER SERVIÇOS E PREÇOS
            } else if (currentState.servicoSelecionado === "ver serviços e preços") {
                if (message.body === "1") {
                    // vai para a primeira etapa do serviço "marcar horário"
                    currentState.servicoSelecionado = "marcar horario";
                    client.sendText(chatId, "*Por favor, informe a data (dd/mm/aaaa) que deseja 🗓️*");
                    currentState.step = 2;
                } else if (message.body === '2'){
                    // volta para o menu principal
                    client.sendText(chatId, "*Sem problemas! Caso queira iniciar o atendimento novamente, basta enviar outra mensagem.*");
                    currentState.step = 0;
                } else {
                    client.sendText(chatId, "*Resposta inválida. Por favor, digite apenas 1 para marcar ou 2 para finalizar*");
                    currentState.step = 2;
                }
            }

        //PASSO 3 
        } else if (currentState.step === 3) {
            //MARCANDO HORÁRIO
            if (currentState.servicoSelecionado === "marcar horario") {
                if (horarios[message.body - 1] != null) {
                    currentState.horarioEscolhido = horarios[parseInt(message.body) - 1];
                    currentState.step = 4; 

                    let response = await axios.get(`${sheetsDbUrl}servicos`);
                    let contador = 0;
                    var servicos = response.data.servicos;

                    let mensagem_servicos = "";
                    servicos.forEach(servico => {
                        mensagem_servicos += ` *${contador + 1}. Serviço: ${servico.servico} | Preço: R$${servico.valor}*\n`
                        contador++;
                    });

                    let mensagem_final = mensagem_servicos + '\n *Selecione o serviço que deseja. Você pode selecionar mais de um da seguinte forma: 1,2,3*'
                    client.sendText(chatId, mensagem_final);

                } else {
                    var horariosMensagem = "";
                    var ordem = 1;

                    horarios = await obterHorarioDisponivel(currentState.data);
                    
                    horarios.forEach(horario => {
                        horariosMensagem += `*${ordem}. ${horario}* *horas*\n`;
                        ordem++;
                    });

                    client.sendText(chatId, "Escolha um horário válido.");
                    client.sendText(chatId, "Me informa o horário que deseja ⏰\n\n"+horariosMensagem);
                }

            } else if (currentState.servicoSelecionado === "desmarcar horario") {
                const agendamentoEscolhidoIndex = parseInt(message.body) - 1;
                if (currentState.agendamentos[agendamentoEscolhidoIndex]) {
                    let agendamentoEscolhido = currentState.agendamentos[agendamentoEscolhidoIndex];
                    axios.delete(`${sheetsDbUrl}/agendamento/${agendamentoEscolhido.id}`)
                    .then(() => {
                        client.sendText(chatId, `Seu agendamento do dia *${agendamentoEscolhido.data}* para às *${agendamentoEscolhido.horario}* foi desmarcado. Qualquer coisa estou à disposição.`);
                        // volta para o menu principal
                        currentState.step = 0;
                    })
                    .catch(error => {
                        console.error("Erro ao desmarcar agendamento. ", error);
                        client.sendText(chatId, "Houve um erro ao desmarcar seu agendamento. Por favor, tente novamente mais tarde.");
                        // volta para o menu principal
                        currentState.step = 0;
                    })
                }
            }

        // AGENDAMENTO - Finalizando e salvando agendamento na planilha (step === 4)
        } else if (currentState.step === 4) {
            if (currentState.servicoSelecionado === "marcar horario") {
                if (await isStringNumeroOuLista(message.body)){
                    let response = await axios.get(`${sheetsDbUrl}servicos`);
                    var servicos = response.data.servicos;

                    let servicos_selecionados = message.body.split(',').map(item => item.trim());
                    var servicos_completos = '';

                    let contador = 0;
                    servicos_selecionados.forEach(index_servico => {
                        if (contador > 0){
                            servicos_completos += ',';
                            servicos_completos += servicos[index_servico - 1].servico;
                        } else if (contador == 0) {
                            servicos_completos += servicos[index_servico - 1].servico;
                        }
                        contador++;
                    });

                    currentState.servico = servicos_completos;
                    client.sendText(chatId, `*Agora digite o seu nome e sobrenome, por favor.*`);
                    currentState.step = 5;

                } else {
                    currentState.step = 4; // Ajuste aqui para não voltar ao passo 3
                    client.sendText(chatId, '*O serviço selecionado não é válido, digite apenas as opções mostradas no menu*');

                    let response = await axios.get(`${sheetsDbUrl}servicos`);
                    let contador = 0;
                    var servicos = response.data.servicos;

                    let mensagem_servicos = "";
                    servicos.forEach(servico => {
                        mensagem_servicos += ` *${contador + 1}. Serviço: ${servico.servico} | Preço: R$${servico.valor}*\n`
                        contador++;
                    });

                    let mensagem_final = mensagem_servicos + '\n *Selecione o serviço que deseja. Você pode selecionar mais de um da seguinte forma: 1,2,3*'
                    client.sendText(chatId, mensagem_final);
                }
            }
        } else if (currentState.step === 5) {
            client.sendText(chatId, `*Obrigado, ${message.body}. Seu horário foi marcado.*`);

            currentState.id = uuidv4();
            // Armazenamento do agendamento
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

            // Resetar o estado para permitir novas interações
            currentState.step = 0;
            currentState.servicoSelecionado = "";
        }
    });
};

async function isStringNumeroOuLista(str) {
    // Verifica se a string não é nula ou vazia
    if (typeof str !== 'string' || str.trim() === '') {
        return false;
    }

    // Expressão regular para verificar se cada item é um número inteiro
    const regex = /^\d+$/;

    // Divide a string em uma lista usando a vírgula como delimitador
    const items = str.split(',');

    //verifica se esse item existe como um serviço
    let response = await axios.get(`${sheetsDbUrl}servicos`);
    let servicos = response.data.servicos;

    // Verifica se todos os itens na lista são números inteiros
    for (let item of items) {
        let index = parseInt(item.trim(), 10) - 1;
        if (!regex.test(item.trim()) || index < 0 || index >= servicos.length) {
            return false;
        } 
    }

    return true;
}
