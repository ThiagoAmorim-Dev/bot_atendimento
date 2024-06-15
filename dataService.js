const axios = require('axios');

const apiUrl = 'https://sheetdb.io/api/v1/sapz5eicgzz66';


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
    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    return diasDaSemana[dataFornecida.getDay()];
}

 async function disponivel(data) {
    const url = `${apiUrl}/search?sheet=indisponivel&data=${data.toString()}`;

    try {
        const response = await axios.get(url);

        if (response.data.length > 0) {
            if (response.data[0].diaTodo == "x" || response.data[0].horarios.trim() == ""){
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


module.exports = {
    validarData,
    diaDaSemana,
    disponivel
}
