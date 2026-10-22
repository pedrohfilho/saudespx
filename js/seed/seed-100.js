// Dados de teste: 100 colaboradores FICTÍCIOS, gerados sempre do mesmo jeito.
// Nomes, telefones (DDD 00) e ocorrências são inventados; nada aqui é dado real.
window.SPX = window.SPX || {};

SPX.seed = function () {
  const TURNOS = ['T1', 'T2', 'T3', 'T4'];
  const TIPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  // Frequência aproximada de cada tipo sanguíneo na população brasileira.
  const PESOS_TIPO = [['O+', 36], ['A+', 34], ['O-', 9], ['B+', 8], ['A-', 8], ['AB+', 2.5], ['B-', 2], ['AB-', 0.5]];

  const NOMES = ['Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
    'Karen', 'Lucas', 'Mariana', 'Natan', 'Olívia', 'Paulo', 'Quésia', 'Rafael', 'Sabrina', 'Tiago',
    'Ursula', 'Vítor', 'Wesley', 'Yasmin', 'Zélia', 'Alan', 'Bianca', 'Caio', 'Débora', 'Elias',
    'Fernanda', 'Guilherme', 'Helena', 'Igor', 'Joana', 'Kleber', 'Larissa', 'Marcelo', 'Nayara', 'Otávio',
    'Patrícia', 'Renan', 'Samuel', 'Tatiane', 'Vinícius', 'Walter', 'Aline', 'Breno', 'Cíntia', 'Diego'];
  const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ribeiro', 'Almeida', 'Carvalho',
    'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Rocha', 'Dias', 'Nunes', 'Moreira', 'Cardoso', 'Teixeira',
    'Freitas', 'Ramos', 'Pinto', 'Azevedo', 'Monteiro', 'Campos', 'Batista', 'Machado', 'Fernandes', 'Reis'];

  const LIDERES = [
    { nome: 'Carla Mendes', turno: 'T1' }, { nome: 'Fábio Andrade', turno: 'T1' },
    { nome: 'Roberto Lima', turno: 'T2' }, { nome: 'Simone Duarte', turno: 'T2' },
    { nome: 'Marcos Vieira', turno: 'T3' }, { nome: 'Luciana Prado', turno: 'T3' },
    { nome: 'Eduardo Tavares', turno: 'T4' }, { nome: 'Renata Bastos', turno: 'T4' }
  ];

  const ALERGIAS = ['Dipirona', 'Penicilina', 'Ibuprofeno', 'Aspirina', 'Amoxicilina', 'Diclofenaco', 'Sulfa'];
  const COMORBIDADES = ['Asma', 'Diabetes', 'Hipertensão', 'Rinite alérgica', 'Enxaqueca', 'Epilepsia', 'Gastrite',
    'Hipertensão e diabetes', 'Asma e rinite', 'Hipotireoidismo'];
  const ACOMPANHANTES = ['Bia Nogueira', 'Caio Ferraz', 'Dora Lins', 'Enzo Pacheco'];
  const OBSERVACOES = ['Mal-estar, encaminhado ao ambulatório.', 'Queda leve, sem ferimento.', 'Tontura e pressão alta.',
    'Corte na mão, curativo feito.', 'Dor de cabeça forte.', 'Crise de asma, usou a bombinha.', ''];

  // Gerador de números repetível (mulberry32): a mesma semente dá sempre os mesmos dados.
  let estado = 20261022;
  function sorteio() {
    estado = (estado + 0x6D2B79F5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const inteiro = (n) => Math.floor(sorteio() * n);
  const escolher = (lista) => lista[inteiro(lista.length)];
  const chance = (p) => sorteio() < p;

  function tipoPorPeso() {
    const total = PESOS_TIPO.reduce((soma, p) => soma + p[1], 0);
    let ponto = sorteio() * total;
    for (const [tipo, peso] of PESOS_TIPO) {
      ponto -= peso;
      if (ponto < 0) return tipo;
    }
    return 'O+';
  }

  const lideres = LIDERES.map((l, i) => ({ id_lider: i + 1, nome: l.nome, turno: l.turno }));
  const usados = new Set(LIDERES.map(l => l.nome));
  const colaboradores = [];
  const contatos = [];
  let telefone = 0;

  while (colaboradores.length < 100) {
    const sobrenome = escolher(SOBRENOMES);
    const nome = escolher(NOMES) + ' ' + sobrenome + (chance(0.6) ? ' ' + escolher(SOBRENOMES) : '');
    if (usados.has(nome)) continue;
    usados.add(nome);

    const indice = colaboradores.length;
    const turno = escolher(TURNOS);
    const doTurno = lideres.filter(l => l.turno === turno);
    const alergia = chance(0.18);
    const id = indice + 1;

    colaboradores.push({
      id_colaborador: id,
      nome,
      turno,
      // os 8 primeiros garantem que todos os tipos aparecem ao menos uma vez
      tipo_sanguineo: indice < TIPOS.length ? TIPOS[indice] : tipoPorPeso(),
      alergia_remedio: alergia,
      alergia_qual: alergia ? escolher(ALERGIAS) : '',
      comorbidades: chance(0.25) ? escolher(COMORBIDADES) : '',
      id_lider: chance(0.06) ? null : escolher(doTurno).id_lider
    });

    const quantos = chance(0.4) ? 2 : 1;
    for (let k = 0; k < quantos; k++) {
      telefone++;
      contatos.push({
        id_contato: contatos.length + 1,
        id_colaborador: id,
        nome: escolher(NOMES) + ' ' + sobrenome,
        telefone: '(00) 90000-' + String(telefone).padStart(4, '0')
      });
    }
  }

  // Alguns atendimentos antigos, para a tela de histórico não começar vazia.
  const agora = Date.now();
  const atendimentos = [];
  const sorteados = new Set();
  while (sorteados.size < 12) sorteados.add(1 + inteiro(colaboradores.length));
  sorteados.forEach(id => {
    const vezes = chance(0.3) ? 2 : 1;
    for (let k = 0; k < vezes; k++) {
      const antes = (1 + inteiro(60)) * 86400000 + inteiro(86400000);
      atendimentos.push({
        id_colaborador: id,
        levado_por: escolher(ACOMPANHANTES),
        observacao: escolher(OBSERVACOES),
        data_hora: new Date(agora - antes).toISOString()
      });
    }
  });
  atendimentos.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  atendimentos.forEach((a, i) => { a.id_atendimento = i + 1; });

  return { lideres, colaboradores, contatos, atendimentos, consultas: [] };
};
