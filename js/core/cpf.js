// CPF: validação, formatação e máscara. Sem tela e sem armazenamento.
window.SPX = window.SPX || {};

SPX.cpf = (function () {
  function somenteDigitos(valor) {
    return String(valor == null ? '' : valor).replace(/\D/g, '');
  }

  // Dígito verificador: cada dígito da base é multiplicado por pesos decrescentes.
  function digitoVerificador(base) {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += base[i] * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  function valido(valor) {
    const digitos = somenteDigitos(valor);
    if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
    const n = digitos.split('').map(Number);
    return digitoVerificador(n.slice(0, 9)) === n[9] && digitoVerificador(n.slice(0, 10)) === n[10];
  }

  // Vai montando "000.000.000-00" conforme a pessoa digita (aceita CPF incompleto).
  function formatar(valor) {
    return somenteDigitos(valor).slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  // "***.456.789-**": mostra só o meio, para não ficar à vista de quem olha a tela.
  function mascarar(valor) {
    const d = somenteDigitos(valor);
    if (d.length !== 11) return '';
    return '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**';
  }

  return { somenteDigitos, valido, formatar, mascarar };
})();
