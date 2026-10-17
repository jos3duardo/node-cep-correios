// Testes unitários: um servidor HTTP local faz o papel da API, então o
// caminho real do `fetch` é exercitado sem depender de internet.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const Correios = require('../index');
const {
  ErroCep,
  ErroValidacao,
  ErroConsulta,
  ErroNaoEncontrado,
  ErroTimeout,
  ErroRede,
  normalizarCep,
  validarCep,
} = Correios;

const RESPOSTA = {
  cep: '79002000',
  address_type: 'Avenida',
  address_name: 'Calógeras',
  address: 'Avenida Calógeras',
  state: 'MS',
  district: 'Centro',
  city: 'Campo Grande',
  city_ibge: '5002704',
  ddd: '67',
};

let servidor;
let base;
let rota; // (req, res) => void — trocada por teste
let caminhos;

before(async () => {
  servidor = http.createServer((req, res) => {
    caminhos.push(req.url);
    rota(req, res);
  });
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.closeAllConnections();
  servidor.close();
});

beforeEach(() => {
  caminhos = [];
  rota = (_req, res) => json(res, 200, RESPOSTA);
});

function json(res, status, corpo) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(corpo));
}

const cliente = (opcoes = {}) => new Correios({ url: `${base}/json/{CEP}`, ...opcoes });

describe('Construtor', () => {
  test('usa URL, timeout e limite padrão', () => {
    const c = new Correios();
    assert.equal(c.cepUrl, 'https://cep.awesomeapi.com.br/json/{CEP}');
    assert.equal(c.timeout, 5000);
    assert.equal(c.tamanhoMaximo, 65536);
  });

  test('timeout 0 é respeitado', () => {
    assert.equal(new Correios({ timeout: 0 }).timeout, 0);
  });

  test('url sem o marcador {CEP} falha na construção', () => {
    assert.throws(() => new Correios({ url: 'https://exemplo.test/cep' }), ErroValidacao);
  });
});

describe('consultaCEP - normalização', () => {
  for (const [rotulo, entrada] of [
    ['{ cep } só dígitos', { cep: '79002000' }],
    ['{ cep } com hífen', { cep: '79002-000' }],
    ['{ cep } com ponto e hífen', { cep: '79.002-000' }],
    ['{ cep } com espaços', { cep: ' 79002 000 ' }],
    ['{ cep } número', { cep: 79002000 }],
    ['string direta', '79.002-000'],
    ['número direto', 79002000],
  ]) {
    test(`aceita ${rotulo}`, async () => {
      assert.deepEqual(await cliente().consultaCEP(entrada), RESPOSTA);
      assert.deepEqual(caminhos, ['/json/79002000']);
    });
  }

  test('número de 7 dígitos recupera o zero à esquerda', async () => {
    await cliente().consultaCEP(1001000);
    assert.deepEqual(caminhos, ['/json/01001000']);
  });

  test('remove todos os separadores, não só o primeiro (bug da 1.x)', () => {
    assert.equal(normalizarCep('7.9.0-0-2-000'), '79002000');
  });
});

describe('consultaCEP - validação', () => {
  for (const [rotulo, entrada] of [
    ['undefined', undefined],
    ['null', null],
    ['string vazia', ''],
    ['{} sem cep', {}],
  ]) {
    test(`rejeita quando o CEP é ${rotulo}`, async () => {
      await assert.rejects(cliente().consultaCEP(entrada), {
        name: 'ErroValidacao',
        message: /Você precisa informar um CEP valido/,
      });
      assert.deepEqual(caminhos, []);
    });
  }

  for (const [rotulo, entrada] of [
    ['dígitos de menos', '7900200'],
    ['dígitos demais', '790020001'],
    ['texto', 'abc'],
    ['número pequeno', 123],
    ['NaN', NaN],
    ['booleano', true],
  ]) {
    test(`rejeita ${rotulo} sem chamar a API`, async () => {
      const erro = await cliente().consultaCEP({ cep: entrada }).catch((e) => e);
      assert.ok(erro instanceof ErroValidacao);
      assert.ok(erro instanceof ErroCep);
      assert.deepEqual(caminhos, []);
    });
  }

  test('entrada hostil vira só dígitos no path', async () => {
    await cliente().consultaCEP('../../790/02?x=000#');
    assert.deepEqual(caminhos, ['/json/79002000']);
  });

  test('validarCep', () => {
    assert.equal(validarCep('79002-000'), true);
    assert.equal(validarCep(79002000), true);
    assert.equal(validarCep('7900-200'), false);
    assert.equal(validarCep(null), false);
  });
});

describe('consultaCEP - respostas da API', () => {
  test('404 vira ErroNaoEncontrado, com o formato da 1.x', async () => {
    rota = (_req, res) => json(res, 404, { code: 'not_found', message: 'nao encontrado' });

    const erro = await cliente().consultaCEP('79002000').catch((e) => e);
    assert.ok(erro instanceof ErroNaoEncontrado);
    assert.ok(erro instanceof ErroConsulta);
    assert.equal(erro.status, 404);
    assert.equal(erro.Erro, 404);
    assert.equal(erro.MsgErro, 'Cep não encontrado.');
    assert.equal(erro.message, 'Cep não encontrado.');
  });

  test('outro status preserva o status real', async () => {
    rota = (_req, res) => json(res, 429, { code: 'rate_limit' });

    await assert.rejects(cliente().consultaCEP('79002000'), (erro) => {
      assert.ok(erro instanceof ErroConsulta);
      assert.ok(!(erro instanceof ErroNaoEncontrado));
      assert.equal(erro.status, 429);
      assert.equal(erro.message, 'Erro 429 ao consultar a API.');
      return true;
    });
  });

  test('redirect não é seguido', async () => {
    rota = (req, res) => {
      if (req.url.startsWith('/json/')) {
        res.writeHead(302, { location: `${base}/outro-host` });
        return res.end();
      }
      json(res, 200, { capturado: true });
    };

    await assert.rejects(cliente().consultaCEP('79002000'), { name: 'ErroConsulta', status: 302 });
    assert.deepEqual(caminhos, ['/json/79002000']);
  });

  test('corpo que não é JSON vira ErroConsulta', async () => {
    rota = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html>manutenção</html>');
    };

    await assert.rejects(cliente().consultaCEP('79002000'), {
      name: 'ErroConsulta',
      message: /não é JSON/,
    });
  });

  test('JSON que não é objeto vira ErroConsulta', async () => {
    rota = (_req, res) => json(res, 200, ['lista']);

    await assert.rejects(cliente().consultaCEP('79002000'), {
      name: 'ErroConsulta',
      message: /era esperado um objeto/,
    });
  });

  test('content-length acima do limite é recusado sem ler o corpo', async () => {
    rota = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': 2000 });
      res.end('x'.repeat(2000));
    };

    await assert.rejects(cliente({ tamanhoMaximo: 1000 }).consultaCEP('79002000'), {
      name: 'ErroConsulta',
      message: /maior que o limite de 1000 bytes/,
    });
  });

  test('corpo em streaming acima do limite é interrompido', async () => {
    rota = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' }); // chunked, sem content-length
      res.write('{"a":"');
      res.write('x'.repeat(5000));
      res.end('"}');
    };

    await assert.rejects(cliente({ tamanhoMaximo: 1000 }).consultaCEP('79002000'), {
      name: 'ErroConsulta',
      message: /maior que o limite/,
    });
  });
});

describe('consultaCEP - transporte', () => {
  test('timeout vira ErroTimeout', async () => {
    rota = () => {}; // nunca responde

    await assert.rejects(cliente({ timeout: 50 }).consultaCEP('79002000'), (erro) => {
      assert.ok(erro instanceof ErroTimeout);
      assert.match(erro.message, /50 ms/);
      return true;
    });
  });

  test('timeout durante a leitura do corpo também vira ErroTimeout', async () => {
    rota = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"cep":'); // e para de mandar
    };

    await assert.rejects(cliente({ timeout: 50 }).consultaCEP('79002000'), ErroTimeout);
  });

  test('conexão recusada vira ErroRede, com o erro original em cause', async () => {
    const fechado = http.createServer();
    await new Promise((resolve) => fechado.listen(0, '127.0.0.1', resolve));
    const porta = fechado.address().port;
    await new Promise((resolve) => fechado.close(resolve));

    const c = new Correios({ url: `http://127.0.0.1:${porta}/{CEP}` });
    await assert.rejects(c.consultaCEP('79002000'), (erro) => {
      assert.ok(erro instanceof ErroRede);
      assert.ok(erro.cause);
      assert.match(erro.message, /ECONNREFUSED/);
      return true;
    });
  });
});

describe('Formas de importar', () => {
  test('o export principal é a classe', () => {
    assert.equal(Correios, Correios.Correios);
    assert.ok(new Correios() instanceof Correios.Correios);
  });

  test('erros e utilitários são exportados', () => {
    for (const nome of [
      'ErroCep',
      'ErroValidacao',
      'ErroConsulta',
      'ErroNaoEncontrado',
      'ErroTimeout',
      'ErroRede',
      'normalizarCep',
      'validarCep',
    ]) {
      assert.ok(Correios[nome], nome);
    }
  });
});
