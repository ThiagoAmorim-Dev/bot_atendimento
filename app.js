const venom = require('venom-bot');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const {validarData} = require('./dataService');

venom.create({
    session: "Barbearia-BOT",
    multidevice: true
})
.then((client) => start(client))
.catch((err) => console.log(err));

// URL da API SheetsDB
const sheetsDbUrl = 'https://sheetdb.io/api/v1/sapz5eicgzz66';

// horários disponíveis 
var horarios = ["9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

// estados de conversação
var state = {};

// função de início do atendimento
const start = (client) => {

    client.onMessage((message) => {
        const chatId = message.from;

        // inicializa o estado do chat se não existir
        if (!state[chatId]) {
            state[chatId] = { step: 0, servicoSelecionado: "" };
        }

        const currentState = state[chatId];

        // início do atendimento
        if (currentState.step === 0) {
            client.sendText(chatId, "*Olá! Bem-vindo ao atendimento automático da barbearia West.* \n\n*O que deseja?* \n\n1️⃣ *Marcar um horário*\n2️⃣ *Ver serviços e preços*\n3️⃣ *Desmarcar Agendamento*");
            currentState.telefone = message.from;

            // inicia a etapa 1 
            currentState.step = 1;

        // escolha de ação
        } else if (currentState.step === 1) {
            if (message.body === '1') {
                currentState.servicoSelecionado = "marcar horario";

                client.sendText(chatId, "*Por favor, digite a data (dd/mm/aaaa) que deseja 🗓️*");
                currentState.step = 2;

            } else if (message.body === '2') {
                currentState.servicoSelecionado = "ver serviços e preços";

                // Mensagem de gancho para a etapa 2 
                client.sendText(chatId, "*Aqui estão nossos serviços e preços:* \n*Corte de cabelo: R$30 💇🏻‍♂️* \n*Barba: R$20 🧔🏻‍♂️*\n*Combo (Corte + Barba): R$45 🧔🏻‍♂️💇🏻‍♂️* \n*Deseja Agendar?* \n1️⃣Sim \n2️⃣Não ");
                currentState.step = 2; 

            } else if (message.body === '3') {
                // verifica se na planilha existe algum horário marcado associado ao número 
                currentState.servicoSelecionado = "desmarcar horario";
                currentState.step = 2;

                axios.get(`${sheetsDbUrl}/search?Telefone=${currentState.telefone}`)
                .then(response => {
                    if (response.data.length > 0) {
                        currentState.agendamentos = response.data;

                        // mensagem gancho para a etapa 3
                        let agendamentosMensagem = "*Encontrei os seguintes horários marcados*";

                        currentState.agendamentos.forEach((agendamento, index) => {
                            agendamentosMensagem += `\n*${index + 1}. ${agendamento.Data} às ${agendamento.Horario} para ${agendamento.Nome}*`
                        });
                        agendamentosMensagem += "\n*Informe o número do agendamento que deseja desmarcar*";

                        client.sendText(chatId, agendamentosMensagem);
                        currentState.step = 3;
                    } else {
                        client.sendText(chatId, "Você não possui nenhum horário marcado.");
                        currentState.step = 0;
                    }
                })
                .catch(error => {
                    client.sendText(chatId, "*Houve um erro ao consultar sua agenda. Por favor, tente novamente mais tarde.*");

                    // volta para o menu principal
                    currentState.step = 0;
                })

            } else {
                client.sendText(chatId, "Perdão, não entendi a mensagem.");
                currentState.step = 1; 
            }

        // SEGUNDA ETAPA
        } else if (currentState.step === 2) {

            // MARCAR HORÁRIO
            if (currentState.servicoSelecionado === "marcar horario") {
                currentState.data = message.body.toString();

                // formando os horários do dia especificado 
                var horariosMensagem = "";
                var ordem = 1;
                horarios.forEach(horario => {
                    horariosMensagem += `*${ordem}. ${horario}* *horas*\n`;
                    ordem++;
                });

                // mensagem gancho para a etapa 3
                client.sendText(chatId, "*Me informa o horário que deseja ⏰*\n\n"+horariosMensagem);
                currentState.step = 3;
        
            // VER SERVIÇOS E PREÇOS
            } else if (currentState.servicoSelecionado === "ver serviços e preços") {
                if (message.body === "1") {
                    // vai para a primeira etapa do serviço "marcar horário"
                    currentState.servicoSelecionado = "marcar horario"
                    client.sendText(chatId, "*Por favor, informe a data (dd/mm/aaaa) que deseja 🗓️*");
                    currentState.step = 2; 
                } else {
                    // volta para o menu principal
                    client.sendText(chatId, "*Obrigado por utilizar nosso serviço. Volte sempre!*");
                    currentState.step = 0;
                }
            }

        } else if (currentState.step === 3) {
            if (currentState.servicoSelecionado === "marcar horario") {
                if (horarios[message.body - 1] != null) {
                    currentState.horarioEscolhido = horarios[parseInt(message.body) - 1];
                    client.sendText(chatId, "*Agora me informe seu nome e sobrenome, por favor.*");
                    currentState.step = 4; 
                    
                } else {
                    var horariosMensagem = "";
                    var ordem = 1;
                    horarios.forEach(horario => {
                        horariosMensagem += `*${ordem}. ${horario}* *horas*\n`;
                        ordem++;
                    });

                    client.sendText(chatId, "*Escolha um horário válido.*");
                    client.sendText(chatId, "*Me informa o horário que deseja ⏰*\n\n"+horariosMensagem);
                }

            } else if (currentState.servicoSelecionado === "desmarcar horario") {
                const agendamentoEscolhidoIndex = parseInt(message.body) - 1;

                if (currentState.agendamentos[agendamentoEscolhidoIndex]) {
                    let agendamentoEscolhido = currentState.agendamentos[agendamentoEscolhidoIndex];
                    axios.delete(`${sheetsDbUrl}/Id/${agendamentoEscolhido.Id}`)
                    .then(() => {
                        client.sendText(chatId, `*Seu agendamento do dia ${agendamentoEscolhido.Data} para às ${agendamentoEscolhido.Horario} foi desmarcado. Qualquer coisa estou à disposição.*`);
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

                currentState.nomeCliente = message.body;
                currentState.id = uuidv4();

                client.sendText(chatId, `*Obrigado, ${currentState.nomeCliente}! Seu agendamento foi concluído ✅*`);

                // Armazenamento do agendamento
                const agendamento = {
                    Id: currentState.id,
                    Data: currentState.data,
                    Horario: currentState.horarioEscolhido,
                    Nome: currentState.nomeCliente,
                    Servico: "",
                    Telefone: currentState.telefone
                };

                axios.post(sheetsDbUrl, agendamento)
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
        }
    });
    
};
