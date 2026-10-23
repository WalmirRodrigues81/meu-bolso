// Meu Bolso: assistente que lança e consulta gastos a partir de uma frase ou da foto do cupom.
// A chave do Gemini vem só da variável CHAVE_GEMINI da Netlify; nenhuma chave secreta fica aqui.
// O banco é acessado com o login da própria pessoa, para a proteção por linha valer.

// Copiados de app/configuracao.js (URL e chave PÚBLICA).
const SUPABASE_URL = "https://xhdwhgahotwkvrdsxcfz.supabase.co";
const SUPABASE_CHAVE_PUBLICA = "sb_publishable_3-PH9QS3EPdeBTKZKpQB1g_O96kfTZt";
const CATEGORIAS_PADRAO = [
  "Refeições", "Supermercado", "Abastecimento", "Açougue",
  "Viagens", "Pet Shop", "Trabalho", "Outros"
];

const MODELO = "gemini-3.5-flash-lite";
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const config = { path: "/api/assistente" };

// ---------- Utilidades ----------

function responder(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

const erro = (status, frase) => responder(status, { erro: frase });

// Hoje em São Paulo, no formato AAAA-MM-DD.
function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const ehData = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || ""));

function dataCurta(aaaammdd) {
  const [, m, d] = aaaammdd.split("-");
  return `${d}/${m}`;
}

function cabecalhosBanco(token) {
  return {
    apikey: SUPABASE_CHAVE_PUBLICA,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

// Transforma a resposta de erro do Supabase numa frase em português.
async function erroDoBanco(resp) {
  const texto = await resp.text().catch(() => "");
  if (resp.status === 401 || /jwt/i.test(texto)) {
    return erro(401, "Sua sessão expirou. Toque em Sair e entre de novo.");
  }
  if (resp.status === 404 || /PGRST205|42P01|does not exist|could not find the table/i.test(texto)) {
    return erro(500, "A tabela gastos não existe no Supabase. Crie a tabela e tente de novo.");
  }
  if (/row-level security|permission/i.test(texto)) {
    return erro(403, "O banco não permitiu esta ação. Toque em Sair, entre de novo e tente outra vez.");
  }
  if (/check constraint/i.test(texto)) {
    return erro(400, "O banco recusou o gasto por uma regra da tabela. Confira a coluna origem e tente de novo.");
  }
  return erro(502, "Não consegui falar com o banco agora. Tente de novo em instantes.");
}

// ---------- Gemini ----------

function ferramentas(categorias) {
  return [{
    function_declarations: [
      {
        name: "registrar_gasto",
        description: "Lança um gasto da pessoa.",
        parameters: {
          type: "object",
          properties: {
            data: { type: "string", description: "Data do gasto, AAAA-MM-DD." },
            descricao: { type: "string", description: "Onde ou com o quê (no cupom, o nome da loja)." },
            valor: { type: "number", description: "Valor em reais (no cupom, o VALOR TOTAL)." },
            categoria: { type: "string", enum: categorias }
          },
          required: ["data", "descricao", "valor", "categoria"]
        }
      },
      {
        name: "consultar_gastos",
        description: "Consulta quanto a pessoa gastou num período, opcionalmente numa categoria.",
        parameters: {
          type: "object",
          properties: {
            desde: { type: "string", description: "Primeiro dia, AAAA-MM-DD." },
            ate: { type: "string", description: "Último dia, AAAA-MM-DD." },
            categoria: { type: "string", enum: categorias }
          },
          required: ["desde", "ate"]
        }
      }
    ]
  }];
}

function instrucoes(hoje, categorias) {
  return [
    "Você é o assistente do Meu Bolso, um app de gastos pessoais. Responda sempre em português, em uma frase curta.",
    `Hoje é ${hoje} (horário de São Paulo). Use esta data para entender "hoje", "ontem", "este mês" etc.`,
    `As categorias são: ${categorias.join(", ")}. Use só uma delas; se nenhuma servir, use "Outros".`,
    "Se a pessoa contar um gasto, chame registrar_gasto. Se perguntar quanto gastou, chame consultar_gastos.",
    "Se faltar o valor do gasto, não invente: pergunte o valor.",
    "Quando vier a foto de um cupom fiscal, use o VALOR TOTAL do cupom, a data de emissão e o nome da loja como descrição.",
    "Nunca informe totais por conta própria: eles vêm sempre da consulta ao banco."
  ].join("\n");
}

async function chamarGemini(chave, { mensagem, imagem, mime, hoje, categorias }) {
  const partes = [];
  if (mensagem) partes.push({ text: mensagem });
  if (imagem) partes.push({ inline_data: { mime_type: mime || "image/jpeg", data: imagem } });
  if (!mensagem) partes.push({ text: "Lance o gasto deste cupom fiscal." });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: instrucoes(hoje, categorias) }] },
      contents: [{ role: "user", parts: partes }],
      tools: ferramentas(categorias)
    })
  });
}

// ---------- Ações no banco ----------

async function registrarGasto(token, usuario, args, origem, categorias) {
  const valor = Math.round(Number(args.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) {
    return erro(400, "Não entendi o valor do gasto. Escreva de novo com o valor, por exemplo: mercado 50.");
  }
  const categoria = categorias.includes(args.categoria) ? args.categoria : "Outros";
  const data = ehData(args.data) ? args.data : hojeEmSaoPaulo();
  const descricao = String(args.descricao || "").trim().slice(0, 200) || categoria;

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
    method: "POST",
    headers: { ...cabecalhosBanco(token), Prefer: "return=representation" },
    body: JSON.stringify({ dono: usuario.id, data, descricao, valor, categoria, origem })
  });
  if (!resp.ok) return erroDoBanco(resp);

  const [gravado] = await resp.json();
  const v = Number(gravado.valor);
  return responder(200, {
    lancou: true,
    resposta: `Lancei ${moeda.format(v)} em ${gravado.categoria}: ${gravado.descricao}, ${dataCurta(gravado.data)}.`
  });
}

async function consultarGastos(token, args, categorias) {
  const hoje = hojeEmSaoPaulo();
  const desde = ehData(args.desde) ? args.desde : `${hoje.slice(0, 7)}-01`;
  const ate = ehData(args.ate) ? args.ate : hoje;
  const categoria = categorias.includes(args.categoria) ? args.categoria : null;

  const filtro = new URLSearchParams();
  filtro.set("select", "valor");
  filtro.append("data", `gte.${desde}`);
  filtro.append("data", `lte.${ate}`);
  if (categoria) filtro.set("categoria", `eq.${categoria}`);

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/gastos?${filtro}`, {
    headers: cabecalhosBanco(token)
  });
  if (!resp.ok) return erroDoBanco(resp);

  // O total é a soma do banco, em centavos para não errar no arredondamento.
  const linhas = await resp.json();
  const centavos = linhas.reduce((soma, g) => soma + Math.round(Number(g.valor) * 100), 0);
  const total = moeda.format(centavos / 100);
  const onde = categoria ? ` em ${categoria}` : "";
  const quando = desde === ate ? `em ${dataCurta(desde)}` : `de ${dataCurta(desde)} a ${dataCurta(ate)}`;
  const qtd = linhas.length === 1 ? "1 gasto" : `${linhas.length} gastos`;
  return responder(200, {
    lancou: false,
    resposta: `Você gastou ${total}${onde} ${quando} (${qtd}).`
  });
}

// ---------- Função ----------

export default async (req) => {
  if (req.method !== "POST") return erro(405, "Use o app para falar com o assistente.");

  const chave = process.env.CHAVE_GEMINI;
  if (!chave) {
    return erro(500, "Falta configurar a chave do Gemini na Netlify (variável CHAVE_GEMINI).");
  }

  // Confere o login da pessoa.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return erro(401, "Você não está conectado. Entre de novo no app.");
  let usuario;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: cabecalhosBanco(token) });
    if (!resp.ok) return erro(401, "Sua sessão expirou. Toque em Sair e entre de novo.");
    usuario = await resp.json();
  } catch {
    return erro(502, "Não consegui falar com o banco agora. Tente de novo em instantes.");
  }

  let corpo;
  try {
    corpo = await req.json();
  } catch {
    return erro(400, "Não entendi o pedido. Escreva o gasto de novo.");
  }
  const mensagem = String(corpo.mensagem || "").trim().slice(0, 500);
  const imagem = typeof corpo.imagem === "string" ? corpo.imagem : "";
  const mime = /^image\/(jpeg|png|webp)$/.test(corpo.mime || "") ? corpo.mime : "image/jpeg";
  const categorias = Array.isArray(corpo.categorias) && corpo.categorias.length
    ? corpo.categorias.map(String).slice(0, 30)
    : CATEGORIAS_PADRAO;
  if (!categorias.includes("Outros")) categorias.push("Outros");
  if (!mensagem && !imagem) return erro(400, "Escreva um gasto ou mande a foto do cupom.");

  // Pergunta ao Gemini o que fazer.
  let resposta;
  try {
    resposta = await chamarGemini(chave, { mensagem, imagem, mime, hoje: hojeEmSaoPaulo(), categorias });
  } catch {
    return erro(502, "Não consegui falar com o assistente agora. Tente de novo em instantes.");
  }
  if (resposta.status === 429) {
    return erro(429, "O assistente atingiu o limite de uso por agora. Espere alguns minutos ou lance à mão.");
  }
  if (resposta.status === 400 || resposta.status === 403) {
    const texto = await resposta.text().catch(() => "");
    if (/api key|permission|API_KEY/i.test(texto)) {
      return erro(500, "A chave do Gemini não foi aceita. Confira a variável CHAVE_GEMINI na Netlify.");
    }
    return erro(400, "O assistente não entendeu o pedido. Escreva de novo ou tire outra foto do cupom.");
  }
  if (!resposta.ok) {
    return erro(502, "O assistente está fora do ar agora. Tente de novo em instantes ou lance à mão.");
  }

  const dados = await resposta.json();
  const partes = dados?.candidates?.[0]?.content?.parts || [];
  const chamada = partes.find((p) => p.functionCall)?.functionCall;
  const origem = imagem ? "foto" : "texto";

  try {
    if (chamada?.name === "registrar_gasto") {
      return await registrarGasto(token, usuario, chamada.args || {}, origem, categorias);
    }
    if (chamada?.name === "consultar_gastos") {
      return await consultarGastos(token, chamada.args || {}, categorias);
    }
  } catch {
    return erro(502, "Não consegui falar com o banco agora. Tente de novo em instantes.");
  }

  // Sem ferramenta: devolve o texto do modelo (por exemplo, perguntando o valor).
  const texto = partes.map((p) => p.text || "").join(" ").trim();
  return responder(200, {
    lancou: false,
    resposta: texto || "Não entendi. Escreva o gasto com o valor, por exemplo: mercado 50 hoje."
  });
};
