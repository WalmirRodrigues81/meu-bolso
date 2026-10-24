# Conferência do Meu Bolso contra o BRIEFING.md

| Teste do briefing | Resultado | Motivo |
|---|---|---|
| 1. Os 5 segundos: no celular (390 px), ver o total do mês e as 8 categorias sem rolar e sem tocar | SÓ DÁ PARA SABER ABRINDO O APP | `app/index.html` e `app/app.js` põem o total e as 8 barras de categoria no primeiro cartão, e `carregarGastos()` as preenche sozinho ao abrir. Só abrindo no celular dá para ver se tudo cabe sem rolar. |
| 2. Os 2 toques: digitar o valor, tocar na categoria, tocar em salvar; o gasto aparece na lista e os totais mudam na hora | CUMPRE | `app/app.js`: as categorias são botões e a data já vem preenchida com hoje. Depois de salvar, o gasto entra na lista e `desenharTotal()` e `desenharLista()` rodam na hora. |
| 3. Nada se perde: sem internet, aparece uma frase em português e o valor digitado continua na tela | CUMPRE | `app/app.js`: se o salvamento falha, o código só mostra a frase "Sem conexão com a internet… o que você digitou continua aqui." e não limpa nenhum campo. Os campos só são limpos depois de salvar com sucesso. |
| 4. Apagar com cuidado: o app pergunta se tenho certeza e só apaga se eu confirmar | CUMPRE | `app/app.js`, função `apagarGasto`: usa `window.confirm` e encerra sem apagar se a resposta for não. |
| 5. Só o que é meu: outro e-mail não vê meus gastos, e nenhuma tela pede dados de banco, conta ou cartão | SÓ DÁ PARA SABER ABRINDO O APP | O código não tem campo de banco, conta ou cartão (`app/index.html` só pede e-mail, senha, valor, descrição, data e frase). Mas o isolamento entre contas depende da proteção por linha no banco, que não está nos arquivos de `app/`. Só entrando com outro e-mail se confirma. |

## Categorias

Batem com o briefing. `window.MEU_BOLSO.CATEGORIAS`, em `app/configuracao.js`, tem 8 itens, com os mesmos nomes, a mesma grafia e a mesma ordem: Refeições, Supermercado, Abastecimento, Açougue, Viagens, Pet Shop, Trabalho, Outros.

Nenhuma categoria sobra, falta ou está escrita diferente. Os textos entre parênteses do briefing (Hospedagem e Locações, Material de escritório e Escolar, Estacionamento e Gastos com clientes) não fazem parte do nome. No app eles não aparecem como dica.

## O que falta

- Nada no código contradiz o briefing; nenhum teste deu NÃO CUMPRE.
- Abrir o app no celular (390 px) e confirmar que o total e as 8 categorias aparecem sem rolar (teste 1).
- Entrar com outro e-mail e senha e confirmar que nenhum gasto da sua conta aparece (teste 5).
