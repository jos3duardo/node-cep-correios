# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento conforme [SemVer](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-10-17

### Removido

- Dependência `request`, abandonada desde 2020 e com avisos de segurança sem
  correção (SSRF no `request`, `form-data` vulnerável na árvore). O pacote passa
  a não ter dependência nenhuma: usa o `fetch` nativo do Node.

### Mudanças incompatíveis

- **Node 20 ou superior** (`engines.node: >=20.0.0`). O `fetch` e o
  `AbortSignal.timeout` nativos exigem pelo menos o 18, mas o Node 18 está fora
  de suporte desde abr/2025; o piso declarado é o que o CI testa (20, 22 e 24).
- **CEP não encontrado rejeita a Promise.** Na 1.x a resposta 404 da API era
  entregue no `.then()` como `{ code: 'not_found', message: ... }`. Agora rejeita
  com `ErroNaoEncontrado` (`.Erro === 404`, `.MsgErro === 'Cep não encontrado.'`).
- **CEP ausente rejeita em vez de lançar síncrono.** `consultaCEP({})` lançava na
  hora; agora devolve Promise rejeitada com `ErroValidacao`, capturável por
  `.catch()`. Com `await` dentro de `try` nada muda.
- **CEP sem 8 dígitos é recusado localmente** com `ErroValidacao`, sem chamar a
  API. Na 1.x ia para a API e o `{ code: 'invalid' }` chegava no `.then()`.
- **Erros são instâncias de `Error`.** Na 1.x eram objeto literal ou o erro cru
  do `request`. Quem fazia comparação profunda com `{ Erro, MsgErro }` precisa
  ajustar; o acesso a `.Erro` e `.MsgErro` continua igual em `ErroConsulta`.
- Status HTTP de erro, corpo que não é JSON e redirecionamento viram
  `ErroConsulta` com o status real.

### Adicionado

- Timeout padrão de 5 s (`new Correios({ timeout })`; `0` desliga). Antes uma
  consulta podia ficar pendurada indefinidamente.
- Limite de 64 KiB no corpo da resposta (`tamanhoMaximo`), conferido no
  `content-length` e durante a leitura.
- Redirecionamentos não são seguidos: a consulta nunca sai do host configurado.
- Hierarquia de erros exportada: `ErroCep`, `ErroValidacao`, `ErroConsulta`,
  `ErroNaoEncontrado`, `ErroTimeout`, `ErroRede`.
- `consultaCEP()` aceita o CEP direto (`consultaCEP('79002-000')`), além de
  `{ cep }`, e aceita número.
- `normalizarCep()` e `validarCep()` exportados.
- Opções do construtor validadas: `url` string com o marcador `{CEP}`,
  `timeout` número finito >= 0, `tamanhoMaximo` número finito > 0. Valor
  inválido lança `ErroValidacao` na construção, em vez de falhar na consulta.
- Tipos TypeScript (`index.d.ts`).
- Testes com `node:test` e servidor HTTP local (`npm test`), mais
  `npm run test:live` para consultar a API real.
- Campo `files` no `package.json`: o pacote publicado leva só o necessário — a
  1.0.6 levava `.idea/` e `.travis.yml`.

### Corrigido

- Só o primeiro `-` e o primeiro `.` eram removidos, e a segunda troca partia de
  novo do valor original, desfazendo a primeira: `'79002-000'` ia para a API com
  o hífen. Agora todo caractere que não é dígito é removido.
- CEP como número (`{ cep: 79002000 }`) lançava `arg.cep.replace is not a function`.

### Alterado

- `node_modules/`, `.npmrc` e `.idea/` deixaram de ser versionados.
- Travis CI (Node 8–11) substituído por GitHub Actions (Node 20, 22 e 24).
- Publicação por tag `v<versão>` no GitHub Actions, com trusted publishing e
  provenance (`release.yml`), em vez de `npm publish` local.
- `package.json` limpo dos campos `_from`, `_id` etc., copiados de uma instalação.

## [1.0.6]

- Última versão com a dependência `request`.
