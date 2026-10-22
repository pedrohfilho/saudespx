// Camada de dados LOCAL (fase de testes, sem Supabase).
// Guarda tudo no localStorage do navegador, com dados FICTÍCIOS (ver js/seed/).
// Toda função devolve uma Promise, igual vai ser com o Supabase,
// assim as telas não mudam quando trocarmos o lado dos dados.
window.SPX = window.SPX || {};

(function () {
  const CHAVE = 'spx_local_v2';

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function carregar() {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) return JSON.parse(salvo);
    } catch (e) { /* sem acesso ao armazenamento: usa os dados de partida */ }
    return SPX.seed();
  }

  function salvar(db) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(db));
    } catch (e) { /* sem acesso ao armazenamento: não guarda */ }
  }

  // "José" e "jose" viram a mesma coisa na busca.
  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function proximoId(lista, campo) {
    return lista.reduce((maior, item) => Math.max(maior, item[campo]), 0) + 1;
  }

  function usuarioAtual() {
    return (SPX.usuario && SPX.usuario.email) || 'local@teste';
  }

  function acharLider(db, idLider) {
    return db.lideres.find(l => l.id_lider === idLider) || null;
  }

  // Confere um colaborador contra os filtros já normalizados (todos precisam bater).
  function passaFiltros(c, f) {
    if (f.turno && c.turno !== f.turno) return false;
    if (f.id_lider === 'sem' && c.id_lider != null) return false;
    if (f.id_lider && f.id_lider !== 'sem' && String(c.id_lider) !== f.id_lider) return false;
    if (f.tipo_sanguineo && c.tipo_sanguineo !== f.tipo_sanguineo) return false;
    if (f.alergia === 'sim' && !c.alergia_remedio) return false;
    if (f.alergia === 'nao' && c.alergia_remedio) return false;
    if (f.comorbidade === 'sim' && !c.comorbidades) return false;
    if (f.comorbidade === 'nao' && c.comorbidades) return false;
    return true;
  }

  // Troca os contatos de um colaborador pelos novos.
  function gravarContatos(db, idColaborador, contatos) {
    db.contatos = db.contatos.filter(c => c.id_colaborador !== idColaborador);
    contatos.forEach(c => {
      db.contatos.push({
        id_contato: proximoId(db.contatos, 'id_contato'),
        id_colaborador: idColaborador,
        nome: c.nome,
        telefone: c.telefone
      });
    });
  }

  const dataLocal = {
    // Lista da busca: só nome, turno e líder (sem dado de saúde).
    // Precisa de pelo menos 2 letras no nome OU de algum filtro.
    buscar(termo, filtros) {
      const db = carregar();
      const busca = normalizar(termo);
      const f = SPX.regras.normalizarFiltros(filtros);
      const temFiltro = Object.keys(f).length > 0;
      if (busca.length < 2 && !temFiltro) return Promise.resolve([]);

      const achados = db.colaboradores
        .filter(c => (busca.length < 2 || normalizar(c.nome).includes(busca)) && passaFiltros(c, f))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(c => {
          const lider = acharLider(db, c.id_lider);
          return {
            id_colaborador: c.id_colaborador,
            nome: c.nome,
            turno: c.turno,
            lider: lider ? lider.nome : null
          };
        });
      return Promise.resolve(achados);
    },

    // Abre a ficha completa e grava quem consultou.
    obterFicha(idColaborador) {
      const db = carregar();
      const colaborador = db.colaboradores.find(c => c.id_colaborador === idColaborador);
      if (!colaborador) return Promise.reject(new Error('Colaborador não encontrado.'));

      db.consultas.push({
        id_consulta: proximoId(db.consultas, 'id_consulta'),
        id_colaborador: idColaborador,
        email_usuario: usuarioAtual(),
        data_hora: new Date().toISOString()
      });
      salvar(db);

      return Promise.resolve({
        colaborador: clonar(colaborador),
        lider: clonar(acharLider(db, colaborador.id_lider)),
        contatos: clonar(db.contatos.filter(c => c.id_colaborador === idColaborador))
      });
    },

    listarLideres() {
      const db = carregar();
      const lista = clonar(db.lideres).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return Promise.resolve(lista);
    },

    cadastrarLider(entrada) {
      const r = SPX.regras.validarLider(entrada);
      if (r.erro) return Promise.reject(new Error(r.erro));
      const db = carregar();
      const lider = { id_lider: proximoId(db.lideres, 'id_lider'), ...r.dados };
      db.lideres.push(lider);
      salvar(db);
      return Promise.resolve(clonar(lider));
    },

    cadastrarColaborador(entrada) {
      const r = SPX.regras.validarColaborador(entrada);
      if (r.erro) return Promise.reject(new Error(r.erro));
      const { contatos, ...campos } = r.dados;
      const db = carregar();
      const colaborador = { id_colaborador: proximoId(db.colaboradores, 'id_colaborador'), ...campos };
      db.colaboradores.push(colaborador);
      gravarContatos(db, colaborador.id_colaborador, contatos);
      salvar(db);
      return Promise.resolve(clonar(colaborador));
    },

    atualizarColaborador(idColaborador, entrada) {
      const r = SPX.regras.validarColaborador(entrada);
      if (r.erro) return Promise.reject(new Error(r.erro));
      const { contatos, ...campos } = r.dados;
      const db = carregar();
      const indice = db.colaboradores.findIndex(c => c.id_colaborador === idColaborador);
      if (indice < 0) return Promise.reject(new Error('Colaborador não encontrado.'));
      db.colaboradores[indice] = { id_colaborador: idColaborador, ...campos };
      gravarContatos(db, idColaborador, contatos);
      salvar(db);
      return Promise.resolve(clonar(db.colaboradores[indice]));
    },

    registrarAtendimento(entrada) {
      const r = SPX.regras.validarAtendimento(entrada);
      if (r.erro) return Promise.reject(new Error(r.erro));
      const db = carregar();
      if (!db.colaboradores.some(c => c.id_colaborador === r.dados.id_colaborador)) {
        return Promise.reject(new Error('Colaborador não encontrado.'));
      }
      const atendimento = {
        id_atendimento: proximoId(db.atendimentos, 'id_atendimento'),
        ...r.dados,
        data_hora: new Date().toISOString()
      };
      db.atendimentos.push(atendimento);
      salvar(db);
      return Promise.resolve(clonar(atendimento));
    },

    // Histórico de um colaborador, do mais novo para o mais antigo.
    listarAtendimentos(idColaborador) {
      const db = carregar();
      const lista = db.atendimentos
        .filter(a => a.id_colaborador === idColaborador)
        .sort((a, b) => b.data_hora.localeCompare(a.data_hora) || b.id_atendimento - a.id_atendimento);
      return Promise.resolve(clonar(lista));
    },

    // Volta aos dados de partida (usado nos testes e no botão "Restaurar dados de teste").
    resetar() {
      try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
      return Promise.resolve();
    }
  };

  SPX.dataLocal = dataLocal;
  SPX.data = dataLocal; // as telas sempre usam SPX.data
})();
