# Consulta de CEP
[![CI](https://github.com/jos3duardo/node-cep-correios/actions/workflows/ci.yml/badge.svg)](https://github.com/jos3duardo/node-cep-correios/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/l/node-cep-correios.svg)](https://www.npmjs.com/package/node-cep-correios)
[![npm downloads](https://img.shields.io/npm/dm/node-cep-correios.svg)](https://www.npmjs.com/package/node-cep-correios)<br />

O desenvolvimento deste módulo foi devido a dificuldade de encontrar uma api que possibilitasse fazer requisições em massa sem que
tivesse alguma restrição no fornecimento do serviço. E isto é o que esta biblioteca realiza, uma forma simples e fácil de fazer uma grande consulta
de ceps sem ter o serviço bloqueado. Use e abuse deste módulo, qualquer sugestão é bem vinda.

Módulo de [Node.js](http://nodejs.org) que utiliza a API https://cep.awesomeapi.com.br/json/{CEP} **para buscar endereço pelo CEP**.

Sem dependências: a partir da 2.0.0 usa o `fetch` nativo do Node. Requer **Node 20 ou superior**.

## Como instalar

```
npm install node-cep-correios --save
```

## Como utilizar para fazer busca de um CEP
Você pode informar um cep da seguinte maneira:

- [x] 79.002-000
- [x] 79002-000
- [x] 79002000
- [x] 79002000 (número)

O sistema remove todos os caracteres que não são dígitos e confere se sobram exatamente 8 antes de consultar a API.
CEP com zero à esquerda deve ir como string (`'01001-000'`); como número, `1001000` também é aceito.

```javascript
const Correios = require('node-cep-correios');
const correios = new Correios();

correios.consultaCEP({ cep: '79002-000' })
  .then(result => {
    console.log(result);
  })
  .catch(error => {
    console.log(error.message);
  });

// também aceita o CEP direto
correios.consultaCEP('79002-000');
```

##### Resposta

```javascript
{
  cep: '79002000',
  address_type: 'Avenida',
  address_name: 'Calógeras',
  address: 'Avenida Calógeras',
  state: 'MS',
  district: 'Centro',
  lat: '-20.4679385',
  lng: '-54.6184065',
  city: 'Campo Grande',
  city_ibge: '5002704',
  ddd: '67'
}
```

## Opções

```javascript
const correios = new Correios({
  timeout: 5000,          // ms, número finito >= 0; padrão 5000. 0 desliga
  tamanhoMaximo: 65536,   // bytes aceitos no corpo, número finito > 0; padrão 64 KiB
  url: 'https://cep.awesomeapi.com.br/json/{CEP}', // precisa do marcador {CEP}
});
```

Opção inválida (`timeout` negativo ou `NaN`, `tamanhoMaximo` zero, `url` que não
é string ou sem `{CEP}`) lança `ErroValidacao` no construtor.

Redirecionamentos da API não são seguidos: uma resposta 3xx vira `ErroConsulta`.

## Erros

Toda falha rejeita a Promise com uma subclasse de `ErroCep` (que estende `Error`):

```
Error
└── ErroCep
    ├── ErroValidacao       CEP ausente ou sem 8 dígitos — não chega a consultar
    ├── ErroConsulta        status HTTP de erro ou corpo inválido (.status)
    │   └── ErroNaoEncontrado  404: CEP com formato válido, mas inexistente
    ├── ErroTimeout         passou do timeout
    └── ErroRede            DNS, conexão recusada, TLS (erro original em .cause)
```

```javascript
const { ErroNaoEncontrado, ErroTimeout } = require('node-cep-correios');

try {
  const endereco = await correios.consultaCEP('79002-000');
} catch (erro) {
  if (erro instanceof ErroNaoEncontrado) { /* CEP não existe */ }
  else if (erro instanceof ErroTimeout) { /* tentar de novo */ }
  else throw erro;
}
```

`ErroConsulta` mantém `.Erro` (status) e `.MsgErro` (mensagem), o formato rejeitado na 1.x.

## Utilitários

```javascript
const { normalizarCep, validarCep } = require('node-cep-correios');

normalizarCep('79.002-000'); // '79002000'
validarCep('79002-000');     // true
```

## Testes

```
npm test                      # unitários, com servidor HTTP local, sem internet
npm run test:live             # consulta real do CEP 79002-000
npm run test:live -- 01001000 # outro CEP
```

## Publicação

A publicação no npm sai pelo GitHub Actions (`.github/workflows/release.yml`), por
trusted publishing com provenance — sem token do npm no repositório. Empurrar uma
tag `v<versão>` igual à do `package.json` roda a suíte do CI e, se passar,
publica. A tag é o gatilho: criar a tag equivale a publicar. Versão com hífen
(`v2.1.0-beta.1`) vai para o dist-tag `next`.

```
git tag v2.0.0 && git push origin v2.0.0
```

## Mudanças

Veja o [CHANGELOG](CHANGELOG.md) — a 2.0.0 tem mudanças incompatíveis com a 1.x.
