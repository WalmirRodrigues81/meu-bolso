# Revisão de celular (390 px) do Meu Bolso

| Item | O que está errado | Onde | Gravidade | Correção em uma frase |
|---|---|---|---|---|
| 1. Alvo de toque: botão Apagar | O botão tem cerca de 29 px de altura e fica bem ao lado do valor, então é fácil tocar nele sem querer. | `estilo.css`, regra `.lista .apagar` (padding 6px 8px, `font-size: 0.8rem`) | ALTA | Dar ao botão pelo menos 44 px de altura e de largura (`min-height: 44px; min-width: 44px`) e um espaço maior em volta. |
| 1. Alvo de toque: botão Sair | O botão é só texto sublinhado, sem área de toque, com cerca de 20 px de altura. | `estilo.css`, `.botao-link`; `index.html`, `#botao-sair` | MÉDIA | Colocar `min-height: 44px` e um `padding` horizontal no `.botao-link`. |
| 1. Alvo de toque: categorias | As opções de categoria têm cerca de 37 px de altura (padding 9px + texto de 0,9rem). | `estilo.css`, `.categorias span` | MÉDIA | Aumentar para `min-height: 44px` com o texto centralizado (`display: inline-flex; align-items: center`). |
| 1. Alvo de toque: botões e campos | Botões `.botao` e campos `input` têm cerca de 45 px. | `estilo.css`, `.botao` e `input` | nada a corrigir | Nada a corrigir. |
| 2. Tamanho do texto | O detalhe de cada gasto (data e categoria) tem 12,8 px e o texto do botão Apagar também. As linhas das barras por categoria têm 13,6 px. | `estilo.css`, `.lista .detalhe` (0.8rem), `.lista .apagar` (0.8rem), `.barras li` (0.85rem) | MÉDIA | Subir esses textos para pelo menos 0.9rem (14,4 px). |
| 3. Rolagem para o lado | Não há largura fixa nem `min-width` que estoure 390 px. A descrição longa é cortada com "…", o valor não quebra, as categorias quebram de linha e o bloco de entrada usa `calc(100% - 32px)`. | `estilo.css`, `.lista .info`, `.categorias`, `.entrada` | nada a corrigir | Nada a corrigir. |
| 4. Lista vazia | Aparece a frase "Nenhum gasto lançado neste mês.". Se o carregamento falhar, a frase de erro ocupa o mesmo lugar. | `index.html`, `#lista-vazia`; `app.js`, `desenharLista` e `carregarGastos` | nada a corrigir | Nada a corrigir. |
| 5. Erros: tela travada em "Carregando…" | Se `banco.auth.getSession()` falhar (sem internet na abertura) ou se o script do Supabase não carregar pela internet, ninguém esconde o "Carregando…". A pessoa fica sem tela e sem frase de aviso. | `app.js`, bloco "Início" (`getSession().then` sem `.catch`); `index.html`, `#carregando` | ALTA | Colocar um `.catch` que chame `abrirEntrada()` e mostre "Sem conexão com a internet. Verifique a conexão e abra o app de novo.". |
| 5. Erros: total e barras sem aviso | Quando `carregarGastos` falha, a frase de erro aparece só na área da lista, lá embaixo, e o total no topo continua mostrando "R$ 0,00", como se não houvesse gasto. | `app.js`, `carregarGastos` (ramo `if (error)`) | MÉDIA | Mostrar também um aviso junto do total, como "Não consegui carregar os gastos. Puxe a tela para baixo e tente de novo.". |
| 5. Erros: resposta do assistente | Se o servidor responder com sucesso mas sem o campo `resposta`, a mensagem fica em branco. | `app.js`, `falarComAssistente` (`mostrar(msg, corpo.resposta, "ok")`) | BAIXA | Usar uma frase padrão, como "Pronto. Confira a lista de gastos.", quando `corpo.resposta` vier vazio. |
| 5. Erros: demais caminhos | Entrada, lançamento à mão, apagar e foto sempre mostram uma frase em português com o que fazer. | `app.js`, `fraseDeErro` e demais funções | nada a corrigir | Nada a corrigir. |
| 6. Teclado numérico | O campo de valor usa `inputmode="decimal"`. | `index.html`, `#valor` | nada a corrigir | Nada a corrigir. |
| 7. Contraste: botões desativados | Com `opacity: 0.6`, o botão azul com texto branco fica com contraste próximo de 4:1, um pouco abaixo do ideal. | `estilo.css`, `.botao:disabled` | BAIXA | Usar `opacity: 0.75`, ou uma cor de fundo própria para o estado desativado. |
| 7. Contraste: demais textos | Textos suaves, mensagens de erro, rótulos azul-claro sobre azul-escuro e o branco do topo ficam legíveis. | `estilo.css`, variáveis de cor | nada a corrigir | Nada a corrigir. |
| 8. Foco visível: campos e categorias | O contorno de foco é azul-claro (#8da9c4) sobre fundo branco, com contraste de cerca de 2,5:1. Aparece, mas é fraco. | `estilo.css`, `input:focus` e `.categorias input:focus-visible + span` | MÉDIA | Trocar a cor do contorno para o azul-escuro (`var(--azul)`) e usar 3 px de espessura. |
| 8. Foco visível: botões | Não há `outline: none`, então vale o contorno padrão do navegador. | `estilo.css`, `.botao`, `.botao-link` | nada a corrigir | Nada a corrigir. |

## Os três itens que mais atrapalham

1. O botão **Apagar** da lista é pequeno (cerca de 29 px, texto de 12,8 px) e fica colado ao valor, o que pode causar toques errados ao apagar gastos.
2. A tela pode ficar **travada em "Carregando…"** sem nenhuma frase, se a conexão falhar na abertura ou se o script do Supabase não carregar.
3. As **categorias** (cerca de 37 px), o botão **Sair** (cerca de 20 px) e os textos de 12,8 a 13,6 px (detalhe do gasto e barras por categoria) ficam abaixo de 44 px de toque e de 14 px de letra.
