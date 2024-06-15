const { default: axios } = require("axios");
const {diaDaSemana} = require('./dataService');


const apiUrl = 'https://sheetdb.io/api/v1/sapz5eicgzz66';


function formatarNumerosMensagem(lista) {
    let numerosEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    lista = lista.map((item, index) => {
        return `${numerosEmoji[index]} ${item}`;
    });

    return lista;

}

async function pegarHorarios(data) {
    const url = `${apiUrl}?sheet=horarios`;
    const diaSemana = await diaDaSemana(data);

    try {
        const response = await axios.get(url);
        const horariosTerca = response.data.map(item => item[`${diaSemana}`]).filter(Boolean);
        console.log(horariosTerca);

    } catch (error) {
        console.log("Fudeu, deu erro.");
    }
}

pegarHorarios("01/06/2024");













module.exports = {
    formatarNumerosMensagem
}




