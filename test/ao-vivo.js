// Teste manual contra a API real. Não roda no `npm test`: depende de rede.
// Uso: npm run test:live [-- <cep>]
const Correios = require('../index');

const cep = process.argv[2] || '79002-000';

new Correios()
  .consultaCEP({ cep })
  .then((endereco) => console.log(endereco))
  .catch((erro) => {
    console.error(`${erro.name}: ${erro.message}`);
    process.exitCode = 1;
  });
