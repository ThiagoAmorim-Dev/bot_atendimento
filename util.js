const { default: axios } = require("axios");
const {diaDaSemana} = require('./dataService');


const apiUrl = 'https://sheetdb.io/api/v1/sapz5eicgzz66';


function formatarNumerosMensagem(lista) {
    // let numerosEmoji = ["0️⃣1️⃣", "0️⃣2️⃣", "0️⃣3️⃣", "0️⃣4️⃣", "0️⃣5️⃣", "0️⃣6️⃣", "0️⃣7️⃣", "0️⃣8️⃣", "0️⃣9️⃣", "1️⃣0️⃣", "1️⃣1️⃣", "1️⃣2️⃣", "1️⃣3️⃣"];

    let numerosEmoji = ["1 --->","2 --->","3 --->","4 --->","5 --->","6 --->","7 --->","8 --->","9 --->","10 --->","11 --->","12 --->","13 --->"]

    lista = lista.map((item, index) => {
        return `${numerosEmoji[index]} ${item}h`;
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




