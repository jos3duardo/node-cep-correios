const correios = require('./lib/correios');

// A classe é o export principal desde a 1.x — `new (require('node-cep-correios'))()`
// precisa continuar funcionando —, então os demais nomes são anexados a ela.
module.exports = correios.Correios;

Object.assign(module.exports, correios);
