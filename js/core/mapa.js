// Links do mapa para achar hospital ou UPA perto. Só monta o endereço: nada é enviado daqui.
window.SPX = window.SPX || {};

SPX.mapa = (function () {
  const BASE = 'https://www.google.com/maps/search/';

  // "hospital" perto de um lugar escrito, por exemplo "Pirajá, Salvador - BA".
  function porLugar(procurar, lugar) {
    const busca = String(procurar) + ' perto de ' + String(lugar).trim();
    return BASE + '?api=1&query=' + encodeURIComponent(busca);
  }

  // "hospital" perto de uma posição (latitude e longitude), com o mapa já centralizado nela.
  function porCoordenadas(procurar, latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!isFinite(lat) || !isFinite(lng)) return '';
    return BASE + encodeURIComponent(procurar) + '/@' + lat.toFixed(6) + ',' + lng.toFixed(6) + ',14z';
  }

  return { porLugar, porCoordenadas };
})();
