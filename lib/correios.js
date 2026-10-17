const URL_PADRAO = 'https://cep.awesomeapi.com.br/json/{CEP}';
const MARCADOR_CEP = '{CEP}';
const TIMEOUT_PADRAO = 5000;
// Uma resposta de CEP tem poucas centenas de bytes; 64 KiB é folga de sobra.
const TAMANHO_MAXIMO_PADRAO = 64 * 1024;
const DIGITOS_CEP = 8;

const MSG_CEP_OBRIGATORIO =
  'Você precisa informar um CEP valido. Ex.: correios.consultaCEP({ cep: \'79002000\' })';

/** Base de todo erro originado nesta biblioteca. */
class ErroCep extends Error {
  constructor(mensagem, opcoes) {
    super(mensagem, opcoes);
    this.name = new.target.name;
  }
}

/** Entrada que sequer chega a virar uma consulta. */
class ErroValidacao extends ErroCep {}

/** A API respondeu, mas com status de erro ou corpo inválido. */
class ErroConsulta extends ErroCep {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
    // Mesmo formato do objeto rejeitado na 1.x.
    this.Erro = status;
    this.MsgErro = mensagem;
  }
}

/** A API respondeu 404: o CEP tem formato válido, mas não existe na base. */
class ErroNaoEncontrado extends ErroConsulta {
  constructor() {
    super(404, 'Cep não encontrado.');
  }
}

/** A consulta passou do tempo limite. */
class ErroTimeout extends ErroCep {}

/** Falha de transporte: DNS, conexão recusada, TLS etc. */
class ErroRede extends ErroCep {}

/**
 * Normaliza um CEP para só dígitos. Aceita string ou número, com ou sem
 * pontuação. Não valida o tamanho — isso fica com `validarCep`.
 */
function normalizarCep(cep) {
  if (typeof cep === 'number') {
    if (!Number.isSafeInteger(cep) || cep < 0) return '';
    // Número perde o zero à esquerda: 1001000 é o CEP 01001-000. Só 7 dígitos
    // são recompostos — o menor CEP existente é 01000-000.
    const digitos = String(cep);
    return digitos.length === DIGITOS_CEP - 1 ? `0${digitos}` : digitos;
  }
  return typeof cep === 'string' ? cep.replace(/\D/g, '') : '';
}

/** `true` quando o CEP, normalizado, tem exatamente 8 dígitos. */
function validarCep(cep) {
  return normalizarCep(cep).length === DIGITOS_CEP;
}

class Correios {
  /**
   * @param {{ url?: string, timeout?: number, tamanhoMaximo?: number }} [opcoes]
   */
  constructor(opcoes = {}) {
    const url = opcoes.url ?? URL_PADRAO;
    const timeout = opcoes.timeout ?? TIMEOUT_PADRAO;
    const tamanhoMaximo = opcoes.tamanhoMaximo ?? TAMANHO_MAXIMO_PADRAO;

    if (typeof url !== 'string') {
      throw new ErroValidacao('A opção url precisa ser uma string.');
    }

    // 0 desliga o timeout; negativo, NaN ou Infinity é erro de configuração.
    if (!Number.isFinite(timeout) || timeout < 0) {
      throw new ErroValidacao('A opção timeout precisa ser um número finito >= 0 (ms).');
    }

    if (!Number.isFinite(tamanhoMaximo) || tamanhoMaximo <= 0) {
      throw new ErroValidacao('A opção tamanhoMaximo precisa ser um número finito > 0 (bytes).');
    }

    if (!url.includes(MARCADOR_CEP)) {
      throw new ErroValidacao(
        `A URL precisa conter o marcador ${MARCADOR_CEP}. Ex.: ${URL_PADRAO}`,
      );
    }

    //para mudar a api de busca substituir a url e deixar no mesmo padrão
    this.cepUrl = url;
    this.timeout = timeout;
    this.tamanhoMaximo = tamanhoMaximo;
  }

  /**
   * Consulta um CEP. Aceita `{ cep }` (formato da 1.x) ou o CEP direto,
   * como string ou número, com ou sem pontuação.
   *
   * `async`: entrada inválida rejeita a Promise em vez de lançar síncrono.
   */
  async consultaCEP(args) {
    const entrada = args !== null && typeof args === 'object' ? args.cep : args;

    if (entrada === undefined || entrada === null || entrada === '') {
      throw new ErroValidacao(MSG_CEP_OBRIGATORIO);
    }

    const cep = normalizarCep(entrada);

    if (cep.length !== DIGITOS_CEP) {
      throw new ErroValidacao(
        `CEP inválido: são esperados ${DIGITOS_CEP} dígitos, foram encontrados ${cep.length}.`,
      );
    }

    return this._requisitar(this.cepUrl.replace(MARCADOR_CEP, cep));
  }

  async _requisitar(url) {
    let resposta;

    try {
      resposta = await fetch(url, {
        headers: { accept: 'application/json' },
        // Redirect não é seguido: a resposta 3xx cai no tratamento de status
        // abaixo, então a consulta nunca sai do host configurado.
        redirect: 'manual',
        signal: this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined,
      });
    } catch (erro) {
      throw this._erroDeTransporte(erro);
    }

    if (resposta.status === 404) {
      await resposta.body?.cancel();
      throw new ErroNaoEncontrado();
    }

    if (!resposta.ok) {
      await resposta.body?.cancel();
      throw new ErroConsulta(resposta.status, `Erro ${resposta.status} ao consultar a API.`);
    }

    let texto;
    try {
      texto = await this._lerCorpo(resposta);
    } catch (erro) {
      throw erro instanceof ErroCep ? erro : this._erroDeTransporte(erro);
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      throw new ErroConsulta(resposta.status, 'Resposta inválida da API: o corpo não é JSON.');
    }

    if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
      throw new ErroConsulta(resposta.status, 'Resposta inválida da API: era esperado um objeto.');
    }

    return dados;
  }

  /** Lê o corpo em texto, abortando se passar de `tamanhoMaximo` bytes. */
  async _lerCorpo(resposta) {
    const limite = this.tamanhoMaximo;
    const excedeu = () =>
      new ErroConsulta(resposta.status, `Resposta da API maior que o limite de ${limite} bytes.`);

    const declarado = Number(resposta.headers.get('content-length'));
    if (declarado > limite) {
      await resposta.body?.cancel();
      throw excedeu();
    }

    if (!resposta.body) {
      return '';
    }

    const leitor = resposta.body.getReader();
    const partes = [];
    let total = 0;

    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;

      total += value.byteLength;
      if (total > limite) {
        await leitor.cancel();
        throw excedeu();
      }
      partes.push(value);
    }

    return Buffer.concat(partes).toString('utf8');
  }

  _erroDeTransporte(erro) {
    if (erro && (erro.name === 'TimeoutError' || erro.name === 'AbortError')) {
      return new ErroTimeout(`A consulta passou do tempo limite de ${this.timeout} ms.`, {
        cause: erro,
      });
    }
    return new ErroRede(`Falha de rede ao consultar a API: ${erro?.cause?.code ?? erro?.message}`, {
      cause: erro,
    });
  }
}

module.exports = {
  Correios,
  ErroCep,
  ErroValidacao,
  ErroConsulta,
  ErroNaoEncontrado,
  ErroTimeout,
  ErroRede,
  normalizarCep,
  validarCep,
};
