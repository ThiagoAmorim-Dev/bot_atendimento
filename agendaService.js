const { default: axios } = require("axios");

const apiUrl = 'https://sheetdb.io/api/v1/sapz5eicgzz66';


function checarDisponibilidade(data, horarios, resultado){
    const url = `${apiUrl}/search?sheet=indisponivel&data=${data.toString()}`;

    axios.get(url)
    .then(response => {
        //verifica se eu encontrei alguma linha com a data recebida 
        if (response.data.length > 0){

            //se a coluna 'diaTodo' estiver marcada, significa que o dia todo está indisponível
            if(response.data[0].diaTodo == "x") {

                resultado = {
                    valor: false,
                    messagem: "*A barbearia estará fechada o dia todo nessa data. Poderia escolher outra?*"
                };

                return resultado;
            
            //se não estiver, eu vou verificar se foi os horários indisponíveis foram informados
            } else {
                let horariosIndisponiveis = response.data[0].horarios.split(',');

                //removendo espaços de cada item caso haja
                horariosIndisponiveis = horariosIndisponiveis.map(item => item.trim());

                //se eu não tiver nenhum horário indisponível, vou considerar que vai ser o dia todo indisponivel
                if (horariosIndisponiveis.length === 0){
                    resultado = {
                        valor: false,
                        messagem: "*A barbearia estará fechada o dia todo nessa data. Poderia escolher outra?*"
                    }; 

                //se eu tiver, vou remover esses horários da lista desse dia 
                } else {
                    horariosIndisponiveis.forEach(item => {
                        if (horarios.includes(item)) {
                            let index = list.indexOf(item);
                            horarios.splice(index, 1);
                        }
                    });

                    return true;
                }
            }
        
        //se não houver nenhum dado, significa que o horári está disponível
        } else {
            return true;
        }
    })
    .catch(error => {
        console.error(error);
    })
}


checarDisponibilidade("27/05/2024");