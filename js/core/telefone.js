// Telefone: só números, no padrão brasileiro (DDD + número). Sem tela e sem armazenamento.
window.SPX = window.SPX || {};

SPX.telefone = (function () {
  function somenteDigitos(valor) {
    return String(valor == null ? '' : valor).replace(/\D/g, '');
  }

  // Vale com 10 dígitos (fixo: DDD + 8) ou 11 (celular: DDD + 9 + 8).
  function valido(valor) {
    const tamanho = somenteDigitos(valor).length;
    return tamanho === 10 || tamanho === 11;
  }

  // Vai montando "(71) 98888-7777" conforme a pessoa digita (aceita número incompleto).
  function formatar(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  return { somenteDigitos, valido, formatar };
})();
