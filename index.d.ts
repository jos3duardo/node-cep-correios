export = Correios;

declare class Correios {
  /** Template da URL em uso, com o marcador `{CEP}`. */
  cepUrl: string;
  /** Timeout da requisição, em milissegundos. `0` desliga. */
  timeout: number;
  /** Tamanho máximo aceito para o corpo da resposta, em bytes. */
  tamanhoMaximo: number;

  constructor(opcoes?: Correios.OpcoesCorreios);

  /**
   * Consulta um CEP. Aceita `{ cep }` ou o CEP direto, como string ou número,
   * com ou sem pontuação. Rejeita com uma subclasse de `ErroCep`.
   */
  consultaCEP(args: { cep: string | number } | string | number): Promise<Correios.Endereco>;
}

declare namespace Correios {
  export interface OpcoesCorreios {
    /** Template da URL; precisa conter o marcador `{CEP}`. */
    url?: string;
    /** Timeout em milissegundos. Padrão: 5000. `0` desliga. */
    timeout?: number;
    /** Limite do corpo da resposta em bytes, > 0. Padrão: 65536. */
    tamanhoMaximo?: number;
  }

  /** Formato devolvido pela API padrão (cep.awesomeapi.com.br). */
  export interface Endereco {
    cep: string;
    address_type: string;
    address_name: string;
    address: string;
    district: string;
    city: string;
    state: string;
    lat: string;
    lng: string;
    city_ibge: string;
    ddd: string;
    [campo: string]: unknown;
  }

  /** Base de todo erro originado nesta biblioteca. */
  export class ErroCep extends Error {}

  /** Entrada que sequer chega a virar uma consulta. */
  export class ErroValidacao extends ErroCep {}

  /** A API respondeu com status de erro ou corpo inválido. */
  export class ErroConsulta extends ErroCep {
    /** Status HTTP da resposta. */
    status: number;
    /** Igual a `status` — formato da 1.x. */
    Erro: number;
    /** Igual a `message` — formato da 1.x. */
    MsgErro: string;
    constructor(status: number, mensagem: string);
  }

  /** A API respondeu 404. */
  export class ErroNaoEncontrado extends ErroConsulta {
    constructor();
  }

  /** A consulta passou do tempo limite. */
  export class ErroTimeout extends ErroCep {}

  /** Falha de transporte (DNS, conexão, TLS). O erro original fica em `cause`. */
  export class ErroRede extends ErroCep {}

  /** Remove tudo que não é dígito. Não valida o tamanho. */
  export function normalizarCep(cep: string | number): string;

  /** `true` quando o CEP normalizado tem 8 dígitos. */
  export function validarCep(cep: string | number): boolean;

  export const Correios: new (opcoes?: OpcoesCorreios) => import('./index');
}
