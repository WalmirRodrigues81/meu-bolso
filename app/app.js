// Meu Bolso: entrada, lançamento à mão, assistente, lista e total do mês.
(function () {
  const config = window.MEU_BOLSO;
  const CATEGORIAS = config.CATEGORIAS;
  const banco = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_CHAVE_PUBLICA);

  const $ = (id) => document.getElementById(id);
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });

  let usuario = null;
  let gastos = [];

  // ---------- Utilidades ----------

  // Data local no formato AAAA-MM-DD (sem o desvio de fuso do toISOString).
  function dataLocal(d) {
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  function limitesDoMes() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: dataLocal(inicio), fim: dataLocal(fim) };
  }

  // Aceita "35", "35,50", "1.234,56" e "35.50".
  function lerValor(texto) {
    let t = String(texto).trim().replace(/[R$\s]/g, "");
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  function dataCurta(aaaammdd) {
    const [, m, d] = aaaammdd.split("-");
    return `${d}/${m}`;
  }

  // Transforma qualquer erro numa frase em português dizendo o que fazer.
  function fraseDeErro(erro) {
    const msg = String((erro && (erro.message || erro.error_description)) || erro || "").toLowerCase();
    if (!navigator.onLine || msg.includes("failed to fetch") || msg.includes("network")) {
      return "Sem conexão com a internet. Verifique a conexão e tente de novo; o que você digitou continua aqui.";
    }
    if ((erro && erro.code === "23502") || msg.includes("null value")) {
      return "Falta preencher um campo obrigatório. Confira o formulário e salve de novo.";
    }
    if (msg.includes("invalid login")) return "E-mail ou senha incorretos. Confira e tente de novo.";
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return "Este e-mail já tem conta. Toque em Entrar.";
    }
    if (msg.includes("password") && msg.includes("6")) return "A senha precisa ter pelo menos 6 caracteres.";
    if (msg.includes("email") && (msg.includes("invalid") || msg.includes("valid"))) {
      return "Este e-mail não parece válido. Confira se digitou certo.";
    }
    if (msg.includes("email not confirmed")) {
      return "Seu e-mail ainda não foi confirmado. Peça para desligar a confirmação de e-mail no Supabase.";
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    }
    if (msg.includes("jwt") || msg.includes("session")) {
      return "Sua sessão expirou. Toque em Sair e entre de novo.";
    }
    if (msg.includes("row-level security") || msg.includes("permission")) {
      return "O banco não permitiu esta ação. Toque em Sair, entre de novo e tente outra vez.";
    }
    return "Algo deu errado. Tente de novo em instantes; se continuar, toque em Sair e entre de novo.";
  }

  function mostrar(elemento, texto, tipo) {
    elemento.textContent = texto || "";
    elemento.classList.toggle("ok", tipo === "ok");
  }

  // ---------- Telas ----------

  function abrirEntrada() {
    usuario = null;
    gastos = [];
    $("carregando").hidden = true;
    $("tela-app").hidden = true;
    $("tela-entrada").hidden = false;
  }

  function abrirApp(user) {
    usuario = user;
    $("carregando").hidden = true;
    $("tela-entrada").hidden = true;
    $("tela-app").hidden = false;
    $("rotulo-mes").textContent = `Gasto em ${nomeMes.format(new Date())}`;
    $("data").value = dataLocal(new Date());
    carregarGastos();
    carregarResumo();
  }

  // ---------- Entrada ----------

  function travarEntrada(travar) {
    $("botao-entrar").disabled = travar;
    $("botao-criar").disabled = travar;
  }

  function lerCredenciais() {
    const email = $("email").value.trim();
    const senha = $("senha").value;
    if (!email || !senha) {
      mostrar($("msg-entrada"), "Preencha o e-mail e a senha.");
      return null;
    }
    if (senha.length < 6) {
      mostrar($("msg-entrada"), "A senha precisa ter pelo menos 6 caracteres.");
      return null;
    }
    return { email, password: senha };
  }

  $("form-entrada").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cred = lerCredenciais();
    if (!cred) return;
    travarEntrada(true);
    mostrar($("msg-entrada"), "");
    const { data, error } = await banco.auth.signInWithPassword(cred);
    travarEntrada(false);
    if (error) return mostrar($("msg-entrada"), fraseDeErro(error));
    $("senha").value = "";
    abrirApp(data.user);
  });

  $("botao-criar").addEventListener("click", async () => {
    const cred = lerCredenciais();
    if (!cred) return;
    travarEntrada(true);
    mostrar($("msg-entrada"), "");
    const { data, error } = await banco.auth.signUp(cred);
    travarEntrada(false);
    if (error) return mostrar($("msg-entrada"), fraseDeErro(error));
    // Com a confirmação de e-mail desligada, o Supabase já devolve a sessão.
    if (data.session) {
      $("senha").value = "";
      abrirApp(data.user);
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      mostrar($("msg-entrada"), "Este e-mail já tem conta. Toque em Entrar.");
    } else {
      mostrar($("msg-entrada"), "Conta criada. Agora toque em Entrar.", "ok");
    }
  });

  $("botao-sair").addEventListener("click", async () => {
    await banco.auth.signOut();
    abrirEntrada();
  });

  // ---------- Gastos do mês ----------

  async function carregarGastos() {
    const { inicio, fim } = limitesDoMes();
    const { data, error } = await banco
      .from("gastos")
      .select("id, data, descricao, valor, categoria, origem, criado_em")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });
    if (error) {
      $("lista-vazia").hidden = false;
      $("lista-vazia").textContent = fraseDeErro(error);
      return;
    }
    gastos = data || [];
    desenharTotal();
    desenharLista();
  }

  function desenharTotal() {
    const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]));
    let total = 0;
    for (const g of gastos) {
      const valor = Number(g.valor) || 0;
      total += valor;
      const cat = porCategoria.hasOwnProperty(g.categoria) ? g.categoria : "Outros";
      porCategoria[cat] += valor;
    }
    $("valor-total").textContent = moeda.format(total);
    // Média por dia: total do mês dividido pelo dia de hoje.
    $("media-dia").textContent = `Média de ${moeda.format(total / new Date().getDate())} por dia`;

    const maior = Math.max(...Object.values(porCategoria), 0);
    const lista = $("barras");
    lista.replaceChildren();
    for (const cat of CATEGORIAS) {
      const valor = porCategoria[cat];
      const li = document.createElement("li");
      const linha = document.createElement("div");
      linha.className = "linha";
      const nome = document.createElement("span");
      nome.textContent = cat;
      const quanto = document.createElement("span");
      quanto.textContent = moeda.format(valor);
      linha.append(nome, quanto);
      const trilho = document.createElement("div");
      trilho.className = "trilho";
      const barra = document.createElement("div");
      barra.className = "barra";
      barra.style.width = maior > 0 ? `${(valor / maior) * 100}%` : "0";
      trilho.append(barra);
      li.append(linha, trilho);
      lista.append(li);
    }
  }

  function desenharLista() {
    const lista = $("lista");
    lista.replaceChildren();
    $("lista-vazia").textContent = "Nenhum gasto lançado neste mês.";
    $("lista-vazia").hidden = gastos.length > 0;

    for (const g of gastos) {
      const li = document.createElement("li");

      const info = document.createElement("div");
      info.className = "info";
      const desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = g.descricao || g.categoria;
      const detalhe = document.createElement("p");
      detalhe.className = "detalhe";
      detalhe.textContent = `${dataCurta(g.data)} · ${g.categoria}`;
      info.append(desc, detalhe);

      const valor = document.createElement("span");
      valor.className = "valor";
      valor.textContent = moeda.format(Number(g.valor) || 0);

      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "apagar";
      apagar.textContent = "Apagar";
      apagar.setAttribute("aria-label", `Apagar ${desc.textContent}, ${valor.textContent}`);
      apagar.addEventListener("click", () => apagarGasto(g, apagar));

      li.append(info, valor, apagar);
      lista.append(li);
    }
  }

  async function apagarGasto(g, botao) {
    const texto = `Apagar "${g.descricao || g.categoria}" de ${moeda.format(Number(g.valor) || 0)}?`;
    if (!window.confirm(texto)) return;
    botao.disabled = true;
    const { error } = await banco.from("gastos").delete().eq("id", g.id);
    if (error) {
      botao.disabled = false;
      window.alert(fraseDeErro(error));
      return;
    }
    gastos = gastos.filter((x) => x.id !== g.id);
    desenharTotal();
    desenharLista();
  }

  // ---------- Lançar à mão ----------

  function desenharCategorias() {
    const caixa = $("categorias");
    for (const cat of CATEGORIAS) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "categoria";
      input.value = cat;
      const span = document.createElement("span");
      span.textContent = cat;
      label.append(input, span);
      caixa.append(label);
    }
  }

  $("form-gasto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("msg-gasto");
    const valor = lerValor($("valor").value);
    const escolhida = document.querySelector('input[name="categoria"]:checked');
    const data = $("data").value;

    if (!Number.isFinite(valor) || valor <= 0) {
      return mostrar(msg, "Digite um valor maior que zero, por exemplo 35,50.");
    }
    if (!escolhida) return mostrar(msg, "Toque numa categoria antes de salvar.");
    if (!data) return mostrar(msg, "Escolha a data do gasto.");

    const botao = $("botao-salvar");
    botao.disabled = true;
    mostrar(msg, "Salvando…", "ok");

    const novo = {
      dono: usuario.id,
      data,
      // A tabela exige descrição; sem texto, usa o nome da categoria.
      descricao: $("descricao").value.trim() || escolhida.value,
      valor,
      categoria: escolhida.value,
      origem: "manual"
    };
    const { data: gravado, error } = await banco.from("gastos").insert(novo).select().single();
    botao.disabled = false;

    // Se der erro, nada do que foi digitado é apagado.
    if (error) return mostrar(msg, fraseDeErro(error));

    mostrar(msg, `Salvo: ${moeda.format(valor)} em ${escolhida.value}.`, "ok");
    $("valor").value = "";
    $("descricao").value = "";
    escolhida.checked = false;
    $("valor").focus();

    const { inicio, fim } = limitesDoMes();
    if (gravado.data >= inicio && gravado.data <= fim) {
      gastos.unshift(gravado);
      gastos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      desenharTotal();
      desenharLista();
    }
  });

  // ---------- Resumo da semana ----------

  async function carregarResumo() {
    const { data, error } = await banco
      .from("resumos")
      .select("texto, criado_em")
      .order("criado_em", { ascending: false })
      .limit(1);
    const texto = !error && data && data[0] && data[0].texto;
    $("cartao-resumo").hidden = !texto;
    $("texto-resumo").textContent = texto || "";
  }

  // ---------- Assistente ----------

  const LADO_MAXIMO = 1600;

  // Seletor de foto escondido: no celular, abre a câmera ou a galeria.
  const seletorFoto = document.createElement("input");
  seletorFoto.type = "file";
  seletorFoto.accept = "image/*";
  seletorFoto.hidden = true;
  document.body.append(seletorFoto);

  function travarAssistente(travar) {
    for (const b of $("form-assistente").querySelectorAll("button")) b.disabled = travar;
  }

  // Reduz a foto no próprio aparelho (no máximo 1600 px, em JPEG) e devolve só o base64.
  async function reduzirFoto(arquivo) {
    const endereco = URL.createObjectURL(arquivo);
    try {
      const img = new Image();
      img.src = endereco;
      await img.decode();
      const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
      const tela = document.createElement("canvas");
      tela.width = Math.round(img.naturalWidth * escala);
      tela.height = Math.round(img.naturalHeight * escala);
      tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
      return tela.toDataURL("image/jpeg", 0.85).split(",")[1];
    } finally {
      URL.revokeObjectURL(endereco);
    }
  }

  async function falarComAssistente(pedido) {
    const msg = $("msg-assistente");
    travarAssistente(true);
    mostrar(msg, pedido.imagem ? "Lendo o cupom…" : "Pensando…", "ok");
    try {
      const { data } = await banco.auth.getSession();
      if (!data.session) return mostrar(msg, "Sua sessão expirou. Toque em Sair e entre de novo.");
      const resp = await fetch("/api/assistente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({ ...pedido, categorias: CATEGORIAS })
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return mostrar(msg, corpo.erro || "O assistente não respondeu. Tente de novo em instantes ou lance à mão.");
      }
      mostrar(msg, corpo.resposta, "ok");
      if (corpo.lancou) {
        $("frase").value = "";
        carregarGastos();
      }
    } catch (erro) {
      mostrar(msg, fraseDeErro(erro));
    } finally {
      travarAssistente(false);
    }
  }

  $("form-assistente").addEventListener("submit", (e) => {
    e.preventDefault();
    const mensagem = $("frase").value.trim();
    if (!mensagem) return mostrar($("msg-assistente"), "Escreva um gasto, por exemplo: mercado 50 hoje.");
    falarComAssistente({ mensagem });
  });

  $("botao-foto").addEventListener("click", () => seletorFoto.click());

  seletorFoto.addEventListener("change", async () => {
    const arquivo = seletorFoto.files[0];
    seletorFoto.value = "";
    if (!arquivo) return;
    let imagem;
    try {
      imagem = await reduzirFoto(arquivo);
    } catch {
      return mostrar($("msg-assistente"), "Não consegui abrir esta foto. Tente tirar outra.");
    }
    // A foto só vai para o assistente; não é guardada em lugar nenhum.
    falarComAssistente({ mensagem: $("frase").value.trim(), imagem, mime: "image/jpeg" });
  });

  // ---------- Início ----------

  desenharCategorias();

  banco.auth.getSession().then(({ data }) => {
    if (data.session) abrirApp(data.session.user);
    else abrirEntrada();
  });

  banco.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "SIGNED_OUT" || !sessao) {
      if (usuario) abrirEntrada();
    }
  });
})();
