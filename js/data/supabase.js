// Camada de dados do SUPABASE: as mesmas funções da camada local (js/data/local.js), mas falando
// com o banco. Tudo passa por funções do banco (supabase/05_dados.sql), que conferem o nível de
// acesso, cifram e decifram. O app valida antes de enviar, e o banco valida de novo.
window.SPX = window.SPX || {};

SPX.dataSupabase = (function () {
  function recusar(mensagem) {
    return Promise.reject(new Error(mensagem));
  }

  return {
    // Lista da busca: só nome, turno e líder. Filtros: turno, id_lider, tipo_sanguineo, alergia, comorbidade.
    buscar: function (termo, filtros) {
      return SPX.rpc('buscar_colaboradores', {
        p_termo: termo || '',
        p_filtros: SPX.regras.normalizarFiltros(filtros)
      });
    },

    // Ficha completa (o banco grava quem consultou).
    obterFicha: function (idColaborador) {
      return SPX.rpc('obter_ficha', { p_id: idColaborador });
    },

    listarLideres: function () {
      return SPX.rpc('listar_lideres');
    },

    cadastrarLider: function (entrada) {
      const r = SPX.regras.validarLider(entrada);
      if (r.erro) return recusar(r.erro);
      return SPX.rpc('cadastrar_lider', { p_nome: r.dados.nome, p_turno: r.dados.turno });
    },

    cadastrarColaborador: function (entrada) {
      const r = SPX.regras.validarColaborador(entrada);
      if (r.erro) return recusar(r.erro);
      return SPX.rpc('cadastrar_colaborador', { p_dados: r.dados });
    },

    atualizarColaborador: function (idColaborador, entrada) {
      const r = SPX.regras.validarColaborador(entrada);
      if (r.erro) return recusar(r.erro);
      return SPX.rpc('atualizar_colaborador', { p_id: idColaborador, p_dados: r.dados });
    },

    // Só o responsável pode. Apaga o colaborador e tudo dele; não tem volta.
    excluirColaborador: function (idColaborador) {
      return SPX.rpc('excluir_colaborador', { p_id: idColaborador });
    },

    registrarAtendimento: function (entrada) {
      const r = SPX.regras.validarAtendimento(entrada);
      if (r.erro) return recusar(r.erro);
      return SPX.rpc('registrar_atendimento', {
        p_id_colaborador: r.dados.id_colaborador,
        p_levado_por: r.dados.levado_por,
        p_observacao: r.dados.observacao
      });
    },

    // Histórico de um colaborador, do mais novo para o mais antigo.
    listarAtendimentos: function (idColaborador) {
      return SPX.rpc('listar_atendimentos', { p_id_colaborador: idColaborador });
    }
  };
})();

// Com o banco disponível, o app usa sempre ele (os dados locais ficam só para os testes).
if (SPX.db) SPX.data = SPX.dataSupabase;
