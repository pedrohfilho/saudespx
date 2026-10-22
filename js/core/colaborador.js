// Regras de cadastro (sem tela e sem armazenamento).
// Servem para o lado local agora e para o Supabase depois: quem grava sempre passa por aqui.
window.SPX = window.SPX || {};

SPX.regras = (function () {
  const TURNOS = ['T1', 'T2', 'T3', 'T4'];
  const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const LIMITE_OBSERVACAO = 500;

  function texto(valor) {
    return String(valor == null ? '' : valor).trim();
  }

  function soDigitos(valor) {
    return texto(valor).replace(/\D/g, '');
  }

  // Devolve { dados } já limpo, ou { erro } com a mensagem para mostrar na tela.
  function validarColaborador(entrada) {
    const nome = texto(entrada.nome).replace(/\s+/g, ' ');
    if (!nome) return { erro: 'Informe o nome do colaborador.' };

    const turno = texto(entrada.turno);
    if (turno && !TURNOS.includes(turno)) return { erro: 'Turno inválido.' };

    const tipo = texto(entrada.tipo_sanguineo).toUpperCase();
    if (tipo && !TIPOS_SANGUINEOS.includes(tipo)) return { erro: 'Tipo sanguíneo inválido.' };

    const alergia = !!entrada.alergia_remedio;
    const alergiaQual = alergia ? texto(entrada.alergia_qual) : '';
    if (alergia && !alergiaQual) return { erro: 'Informe a qual remédio a pessoa tem alergia.' };

    const contatos = [];
    for (const contato of entrada.contatos || []) {
      const nomeContato = texto(contato.nome);
      const telefone = texto(contato.telefone);
      if (!nomeContato && !telefone) continue; // linha em branco: ignora
      if (!nomeContato || !telefone) return { erro: 'Cada contato precisa de nome e telefone.' };
      if (soDigitos(telefone).length < 8) return { erro: 'Telefone do contato inválido: ' + telefone };
      contatos.push({ nome: nomeContato, telefone });
    }

    return {
      dados: {
        nome,
        turno: turno || null,
        tipo_sanguineo: tipo || null,
        alergia_remedio: alergia,
        alergia_qual: alergiaQual,
        comorbidades: texto(entrada.comorbidades),
        id_lider: entrada.id_lider ? Number(entrada.id_lider) : null,
        contatos
      }
    };
  }

  function validarLider(entrada) {
    const nome = texto(entrada.nome).replace(/\s+/g, ' ');
    if (!nome) return { erro: 'Informe o nome do líder.' };
    const turno = texto(entrada.turno);
    if (turno && !TURNOS.includes(turno)) return { erro: 'Turno inválido.' };
    return { dados: { nome, turno: turno || null } };
  }

  function validarAtendimento(entrada) {
    const levadoPor = texto(entrada.levado_por).replace(/\s+/g, ' ');
    if (!levadoPor) return { erro: 'Informe quem está levando ao atendimento.' };
    const observacao = texto(entrada.observacao);
    if (observacao.length > LIMITE_OBSERVACAO) {
      return { erro: 'A observação pode ter até ' + LIMITE_OBSERVACAO + ' caracteres.' };
    }
    return {
      dados: {
        id_colaborador: entrada.id_colaborador,
        levado_por: levadoPor,
        observacao
      }
    };
  }

  return { TURNOS, TIPOS_SANGUINEOS, LIMITE_OBSERVACAO, validarColaborador, validarLider, validarAtendimento };
})();
