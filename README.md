# Consulta de CEP
[![Build Status](https://travis-ci.com/jos3duardo/node-cep-correios.svg?branch=master)](https://travis-ci.com/jos3duardo/node-cep-correios)
[![npm](https://img.shields.io/npm/l/express.svg)](https://travis-ci.com/jos3duardo/node-cep-correios)
[![npm downloads](https://img.shields.io/npm/dm/node-cep-correios.svg)](https://www.npmjs.com/package/node-cep-correios)<br />

O desenvolvimento deste módulo foi devido a dificuldade de encontrar uma api que posibilitase fazer requisições em massa sem que 
tivese alguma restrição no fornecimento do serviço. E isto é o que esta biblioteca realiza, uma forma simples e facil de fazer uma grande consulta 
de ceps sem ter o serviço bloqueado. Use e abuse deste modulo, qualquer sugestão é bem vinda.

Módulo de [Node.js](http://nodejs.org) que utiliza a API https://cep.awesomeapi.com.br/json/{CEP}  **para a buscar endereço pelo CEP**.
[API consulta CEP Correios](https://cep.awesomeapi.com.br/json/{CEP})

## Como instalar

```
npm install node-cep-correios --save
```

## Como utilizar para fazer busca de um CEP
Você pode informar um cep da seguinte maneura:

- [x] 70.100-00  
- [x] 70100000  
- [x] 70.10000  

O sistema remove os caracteres especiais

```javascript
let Correios = require('node-cep-correios');
let correios = new Correios();

correios.consultaCEP({ cep: '00000000' })
.then(result => {
  console.log(result);
})
.catch(error => {
  console.log(error);
});
```

##### Resposta

```javascript
{
    cep: '00000000',
    address_type: 'Rua',
    address_name: 'São Pualo',
    address: 'Rua São Pualo',
    district: 'Centro',
    city: 'São Pualo',
    state: 'SP',
    lat: '-50.0000000',
    lng: '-50.0000000',
    city_ibge: '0000000',
    ddd: '11'
}
```
