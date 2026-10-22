// Funções de apoio sem relação com tela ou armazenamento.
window.SPX = window.SPX || {};

SPX.util = (function () {
  // Todo texto digitado por alguém passa por aqui antes de entrar no HTML.
  function esc(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatarDataHora(iso) {
    const data = new Date(iso);
    if (isNaN(data.getTime())) return '';
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  // "(71) 90000-0001" -> "71900000001", para usar em link tel:
  function telefoneParaLink(telefone) {
    return String(telefone || '').replace(/[^\d+]/g, '');
  }

  // Espera o usuário parar de digitar antes de chamar a função.
  function atrasar(funcao, milissegundos) {
    let espera = null;
    return function (...args) {
      clearTimeout(espera);
      espera = setTimeout(() => funcao.apply(this, args), milissegundos);
    };
  }

  return { esc, formatarDataHora, telefoneParaLink, atrasar };
})();
