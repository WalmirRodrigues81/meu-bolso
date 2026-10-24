# Relatório do Guarda de Segurança — Meu Bolso

Verifiquei todos os arquivos do projeto, menos a pasta `.git`. Isso inclui `.claude/`, `netlify/`, `supabase/`, `app/` e os arquivos da raiz. A pasta `revisoes/` não existe. Não há arquivo `.env` na pasta.

| Arquivo | O que encontrou | Gravidade | O que fazer |
|---|---|---|---|
| `app/configuracao.js` | Chave pública do Supabase (`sb_publishable_3-PH…`). | BAIXA | Nada. Esse é o único lugar do app onde ela pode ficar. |
| `netlify/functions/assistente.mjs` | Chave pública do Supabase (`sb_publishable_3-PH…`) na constante do topo do arquivo. | BAIXA | Nada. Esse local é permitido. |
| `netlify/functions/assistente.mjs` | `Bearer ${token}` e `token` são só variáveis lidas da requisição, sem valor escrito no arquivo. | BAIXA | Nada. |
| `app/app.js` e `app/index.html` | Aparecem as palavras "senha", "password" e "Bearer ${...}", mas só como nome de campo, mensagem de erro e variável. Não há valor escrito. | BAIXA | Nada. |
| `CLAUDE.md`, `BRIEFING.md`, `02-CLAUDE-exemplo.md` | Só citam as palavras "senha" e "chave secreta" como regra de texto. Não há valor real. | BAIXA | Nada. |
| `.gitignore` | Tem `.env`, `.netlify` e `node_modules`. | BAIXA | Nada. Está correto. |
| `netlify/httpsmeu-bolso-impacta1.netlify.app.txt` | Só o endereço público do site e anotações sobre Git. Não há senha, e-mail nem dado pessoal. É um arquivo novo, ainda fora do Git. | BAIXA | Pode enviar. Se preferir, tire da pasta `netlify/` para manter a pasta organizada. |
| `supabase/*.sql` | Nenhuma chave secreta, token ou dado pessoal encontrado. | BAIXA | Nada. |

Não achei `sb_secret`, `service_role`, chave `AIza`, token ou senha com valor real, e-mail, CPF, telefone, cartão ou conta escritos nos arquivos. Nenhum item ALTA.

PODE ENVIAR
