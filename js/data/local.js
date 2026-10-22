// Camada de dados LOCAL (fase de testes, sem Supabase).
// Guarda tudo no localStorage do navegador, com dados FICTÍCIOS.
// Toda função devolve uma Promise, igual vai ser com o Supabase,
// assim as telas não mudam quando trocarmos o lado dos dados.
window.SPX = window.SPX || {};

(function () {
  const CHAVE = 'spx_local_v1';

  // Dados de partida (inventados).
  const SEED = {
    lideres: [
      { id_lider: 1, nome: 'Carla Mendes', turno: 'T1' },
      { id_lider: 2, nome: 'Roberto Lima', turno: 'T2' }
    ],
    colaboradores: [
      { id_colaborador: 1, nome: 'Ana Souza', turno: 'T1', tipo_sanguineo: 'O+', alergia_remedio: true, alergia_qual: 'Dipirona', comorbidades: 'Asma', id_lider: 1 },
      { id_colaborador: 2, nome: 'José Antônio Reis', turno: 'T1', tipo_sanguineo: 'A-', alergia_remedio: false, alergia_qual: '', comorbidades: '', id_lider: 1 },
      { id_colaborador: 3, nome: 'Marina Costa', turno: 'T2', tipo_sanguineo: 'B+', alergia_remedio: true, alergia_qual: 'Penicilina', comorbidades: 'Diabetes', id_lider: 2 },
      { id_colaborador: 4, nome: 'Paulo Henrique Dias', turno: 'T2', tipo_sanguineo: 'AB+', alergia_remedio: false, alergia_qual: '', comorbidades: 'Hipertensão', id_lider: 2 },
      { id_colaborador: 5, nome: 'Anabela Rocha', turno: 'T3', tipo_sanguineo: 'O-', alergia_remedio: false, alergia_qual: '', comorbidades: '', id_lider: null }
    ],
    contatos: [
      { id_contato: 1, id_colaborador: 1, nome: 'Marcos Souza', telefone: '(71) 90000-0001' },
      { id_contato: 2, id_colaborador: 1, nome: 'Lúcia Souza', telefone: '(71) 90000-0002' },
      { id_contato: 3, id_colaborador: 2, nome: 'Clara Reis', telefone: '(71) 90000-0003' },
      { id_contato: 4, id_colaborador: 3, nome: 'Paulo Costa', telefone: '(71) 90000-0004' },
      { id_contato: 5, id_colaborador: 4, nome: 'Sônia Dias', telefone: '(71) 90000-0005' },
      { id_contato: 6, id_colaborador: 5, nome: 'Rui Rocha', telefone: '(71) 90000-0006' }
    ],
    atendimentos: [],
    consultas: []
  };

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function carregar() {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) return JSON.parse(salvo);
    } catch (e) { /* sem acesso ao armazenamento: usa os dados de partida */ }
    return clonar(SEED);
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
    buscar(termo) {
      const db = carregar();
      const busca = normalizar(termo);
      if (busca.length < 2) return Promise.resolve([]);

      const achados = db.colaboradores
        .filter(c => normalizar(c.nome).includes(busca))
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

    // Só para testes: volta aos dados de partida.
    resetar() {
      try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
      return Promise.resolve();
    }
  };

  SPX.dataLocal = dataLocal;
  SPX.data = dataLocal; // as telas sempre usam SPX.data
})();
