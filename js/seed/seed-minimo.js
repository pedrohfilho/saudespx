// Dados de partida mínimos (5 pessoas fictícias). Usados nos testes automáticos.
// A aplicação usa o conjunto maior, em seed-100.js.
window.SPX = window.SPX || {};

SPX.seed = function () {
  return {
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
      { id_contato: 1, id_colaborador: 1, nome: 'Marcos Souza', telefone: '(00) 90000-0001' },
      { id_contato: 2, id_colaborador: 1, nome: 'Lúcia Souza', telefone: '(00) 90000-0002' },
      { id_contato: 3, id_colaborador: 2, nome: 'Clara Reis', telefone: '(00) 90000-0003' },
      { id_contato: 4, id_colaborador: 3, nome: 'Paulo Costa', telefone: '(00) 90000-0004' },
      { id_contato: 5, id_colaborador: 4, nome: 'Sônia Dias', telefone: '(00) 90000-0005' },
      { id_contato: 6, id_colaborador: 5, nome: 'Rui Rocha', telefone: '(00) 90000-0006' }
    ],
    atendimentos: [],
    consultas: []
  };
};
