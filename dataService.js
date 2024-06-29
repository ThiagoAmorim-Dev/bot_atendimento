const axios = require('axios');

const sheetsDbUrl = 'https://api.sheety.co/be2a6b443056f481f94cc19d22b20b70/barbearia/';


//verifica se a data é válida para ser marcada para atendimento
function validarData(data) {
    
    //separa a data por dia mês e ano para verificar se cada um é válido
    const partes = data.toString().split('/');

    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1; 
    const ano = parseInt(partes[2]);

    //forma um objeto Date com a string da data fornecida 
    const dataFornecida = new Date(ano, mes, dia);

    //pegando a data atual e resetando o horário para que a data não seja considerada maior por causa disso
    const dataAtual = new Date();
    dataAtual.setHours(0,0,0,0);

    //Se a data for menor do que hoje, retorna falso
    if (dataFornecida < dataAtual) {
        return false;
    } 

    //Se a data for de hoje ou maior, ele faz a verificação de cada parte da data e se estiver ok, retorna true
    return dataFornecida.getDate() === dia && dataFornecida.getMonth() === mes && dataFornecida.getFullYear() === ano;   
}


//pega o dia da semana de acordo com a data 
function diaDaSemana(data){
    const dataSeparada = data.toString().split('/');
    const dia = parseInt(dataSeparada[0])
    const mes = parseInt(dataSeparada[1] - 1)
    const ano = parseInt(dataSeparada[2])
    
    const dataFornecida = new Date(ano, mes, dia);
    const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    
    return diasDaSemana[dataFornecida.getDay()];
}

 async function disponivel(data) {
    data = data.replace("(", "");
    data = data.replace(")", "");

    const url = `${sheetsDbUrl}indisponivel?filter[data]=${data.toString()}`;

    try {
        const response = await axios.get(url);

        if (response.data.indisponivel.length > 0) {
            if (response.data.indisponivel[0].diaTodo == "x" || response.data.indisponivel[0].horarios.trim() == ""){
                return false;

            } else {
                return true;
            }

        } else {
            return true;
        }

    } catch (error) {
        console.log(error);
    }    
}

// function atualizarDisponibilidade(horarios, data){
//     const filtrarDataEHorario = (agendamentos) => {
//         return agendamentos.map(agendamento => ({
//           Data: agendamento.data,
//           Horario: agendamento.horario
//         }));
//       };

//     axios.get(`${sheetsDbUrl}/agendamento`)
//         .then((response) => {

//         })
//         .catch((error) => {
//             error.log('erro ao consultar data');
//         })




async function obterHorariosPeloDia(dia) {
    try {
        const response = await axios.get(`${sheetsDbUrl}horarios`);
        let lista;
        switch(dia) {
            case 'segunda':
                lista = response.data.horarios.map(horario => horario.segunda).filter(horario => horario != undefined);
                break;
            case 'terça':
                lista = response.data.horarios.map(horario => horario.terça).filter(horario => horario != undefined);
                break;
            case 'quarta':
                lista = response.data.horarios.map(horario => horario.quarta).filter(horario => horario != undefined);
                break;
            case 'quinta':
                lista = response.data.horarios.map(horario => horario.quinta).filter(horario => horario != undefined);
                break;
            case 'sexta':
                lista = response.data.horarios.map(horario => horario.sexta).filter(horario => horario != undefined);
                break;
            case 'sábado':
                lista = response.data.horarios.map(horario => horario.sábado).filter(horario => horario != undefined);
                break;
            default:
                console.error('Dia da semana inválido');
                return [];
        }
        return lista;
    } catch (error) {
        console.error("Erro ao obter horários:", error);
        return [];
    }
}


async function obterHorarioDisponivel(data){
    //filtragem dos horários marcados
    var diaSemana = diaDaSemana(data)
    var horarios_disponiveis = await obterHorariosPeloDia(diaSemana);
    var response = await axios.get(`${sheetsDbUrl}agendamento?filter[data]=${data}`);

    var horarios_marcados = response.data.agendamento;
    horarios_marcados = horarios_marcados.map(horario => horario.horario);

    var horarios_disponiveis = horarios_disponiveis.filter(horario => !horarios_marcados.includes(horario));

    //filtragem dos horários que já passaram
    var hoje = new Date();
    var dia = String(hoje.getDate()).padStart(2, '0');
    var mes = String(hoje.getMonth() + 1).padStart(2, '0'); // Mês começa do 0
    var ano = hoje.getFullYear();
    var dataAtual = `${dia}/${mes}/${ano}`; // Formato 'dd/mm/aaaa'
    var horaAtual = hoje.toTimeString().split(' ')[0].substring(0,5);

    if (data == dataAtual){
        horarios_disponiveis = horarios_disponiveis.filter(horario => horario > horaAtual);
    }

    return horarios_disponiveis;
}


module.exports = {
    validarData,
    diaDaSemana,
    disponivel,
    obterHorarioDisponivel
}
