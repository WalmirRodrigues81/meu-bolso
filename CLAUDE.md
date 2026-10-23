# Meu Bolso — memória do projeto

## 1. O que é este projeto

O **Meu Bolso** é um app de gastos pessoais, feito durante a Formação Claude Pro.

- **Quem usa:** só eu, no celular e no computador.
- **O que faz:** registra gastos e mostra o total do mês separado por categoria.
- **Na sexta:** ganha um assistente que lança o gasto a partir de uma frase (por exemplo, "almoço 35 reais") ou da foto do cupom fiscal.
- **Telas e categorias:** ainda não estão definidas. Elas vão sair de uma entrevista que o Claude vai conduzir comigo.

## 2. Regras técnicas que não se discutem

- **Onde ficam os arquivos do app:** tudo dentro da pasta `app/`, com estes arquivos:
  - `index.html` (a página)
  - `estilo.css` (a aparência)
  - `app.js` (o funcionamento)
  - `configuracao.js` (os dados de conexão)
  - `manifest.webmanifest` (para instalar no celular como app)
  - `icone.svg` (o ícone)
- **Sem complicação:** nada de Node, nada de etapa de "build", nada de framework. São arquivos simples que o navegador abre direto.
- **Banco de dados (Supabase):** o cliente entra pela internet (CDN), com esta linha:
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>`
- **Entrada no app:** por e-mail e senha, **sem** confirmação de e-mail.
- **Tabelas:** `gastos` e `resumos`, ambas com proteção por linha (cada pessoa só enxerga o que é seu).
- **Chaves:**
  - A URL do projeto e a chave **pública** do Supabase ficam em `app/configuracao.js`, dentro de `window.MEU_BOLSO`.
  - A chave **secreta** do Supabase e a chave do **Gemini** **nunca** entram em arquivo nenhum.
- **Arquivos na raiz da pasta:**
  - `netlify.toml` publica a pasta `app`.
  - `.gitignore` deixa de fora `.env`, `.netlify` e `node_modules`.
- **Celular primeiro:** a tela é pensada primeiro para um celular de 390 px de largura; o computador vem depois.
- **Erros:** todo erro aparece como uma frase em português dizendo o que fazer.

## 3. O que este app nunca faz

- Nunca pede, guarda ou mostra senha de banco, número de conta ou de cartão.
- Nunca guarda a foto do cupom.
- Nunca envia e-mail ou mensagem.
- Nunca usa dado de outra pessoa.

## 4. Como trabalhar comigo

- **Antes de alterar arquivos:** diga o plano em até dez linhas e espere a minha aprovação.
- **Uma mudança por vez**, mostrando a diferença (o que era e o que ficou).
- **Toda entrega vai para um arquivo.** Na conversa, vêm só os caminhos dos arquivos.
- **Fale em português**, para quem não programa.
