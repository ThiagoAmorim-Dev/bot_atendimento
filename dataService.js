const sheetsDbUrl = 'https://sheetdb.io/api/v1/sapz5eicgzz66';

function validarData(data) {
    const partes = data.toString().split('/');

    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1; 
    const ano = parseInt(partes[2]);

    const dataValida = new Date(ano, mes, dia);
    return dataValida.getDate() === dia && dataValida.getMonth() === mes && dataValida.getFullYear() === ano;
}

//formato dd/mm/aaaa
function diaDaSemana(data){
    const dataSeparada = data.toString().split('/');
    const dia = parseInt(dataSeparada[0])
    const mes = parseInt(dataSeparada[1] - 1)
    const ano = parseInt(dataSeparada[2])

    const objetoData = new Date(ano, mes, dia);
    const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    return diasDaSemana[objetoData.getDay()];
}

console.log(diaDaSemana("31/05/2024"));

module.exports = {validarData};
module.exports = {diaDaSemana};


