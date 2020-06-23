let request = require('request');

module.exports = class Correios {
  constructor(width) {
    //para mudar a api de busca substituir a url e deixar no mesmo padrão
    this.cepUrl       = 'https://cep.awesomeapi.com.br/json/{CEP}';
  }

  consultaCEP(args) {
    let arg = Object.assign({}, args);

    if ('cep' in arg === false) {
      throw new Error('Você precisa informar um valido ex CEP: { cep: 00000000 }.');
    }

    return new Promise((resolve, reject) => {
      let cep = arg.cep.replace('-', '');
      cep = arg.cep.replace('.', '');

      let url = this.cepUrl.replace('{CEP}', cep);

      request(url, (error, resp, body) => {
        if (error) {
          return reject(error);
        }

        try {
          return resolve(JSON.parse(body))

        } catch (e) {
          return reject({
            Erro: 404,
            MsgErro: 'Cep não encontrado.'
          });
        }
      });
    });
  }
}
