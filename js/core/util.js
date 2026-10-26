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

  // Número no formato do WhatsApp (só dígitos, com o 55 do Brasil), ou null se não der para usar.
  //   "(71) 98888-7777" -> "5571988887777"
  function telefoneParaWhatsApp(telefone) {
    const digitos = String(telefone || '').replace(/\D/g, '');
    if (digitos.length === 10 || digitos.length === 11) return '55' + digitos;
    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) return digitos;
    return null;
  }

  // Cópia para navegadores sem a API moderna (ela só funciona em endereço seguro, https).
  function copiarComSelecao(texto) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let copiou = false;
    try { copiou = document.execCommand('copy'); } catch (e) { /* sem permissão */ }
    area.remove();
    return copiou;
  }

  // Copia o texto para a área de transferência. Devolve uma Promise com true ou false.
  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(() => true, () => copiarComSelecao(texto));
    }
    return Promise.resolve(copiarComSelecao(texto));
  }

  // Tira acento e maiúscula, para comparar nomes ("José" e "jose" ficam iguais).
  function normalizar(texto) {
    return String(texto == null ? '' : texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  // Espera o usuário parar de digitar antes de chamar a função.
  function atrasar(funcao, milissegundos) {
    let espera = null;
    return function (...args) {
      clearTimeout(espera);
      espera = setTimeout(() => funcao.apply(this, args), milissegundos);
    };
  }

  return { esc, formatarDataHora, telefoneParaLink, telefoneParaWhatsApp, copiarTexto, normalizar, atrasar };
})();
