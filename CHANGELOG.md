# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento conforme [SemVer](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-10-17

### Removido

- Dependência `request`, abandonada desde 2020 e com avisos de segurança sem
  correção (SSRF no `request`, `form-data` vulnerável na árvore). O pacote passa
  a não ter dependência nenhuma: usa o `fetch` nativo do Node.

### Mudanças incompatíveis

- **Node 18 ou superior** (`engines.node: >=18.0.0`). O `fetch` e o
  `AbortSignal.timeout` nativos não existem antes disso.
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
- Opção `url` no construtor, validada quanto ao marcador `{CEP}`.
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

- `node_modules/` e `.npmrc` deixaram de ser versionados.
- Travis CI (Node 8–11) substituído por GitHub Actions (Node 18, 20 e 22).
- `package.json` limpo dos campos `_from`, `_id` etc., copiados de uma instalação.

## [1.0.6]

- Última versão com a dependência `request`.
