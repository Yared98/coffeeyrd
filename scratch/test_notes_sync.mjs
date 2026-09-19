async function testNotes() {
  console.log('🧪 Iniciando teste de anotações e combinados...');

  // 1. Criar sessão
  const res = await fetch('http://localhost:8082/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Sessão Notas Teste', max_votes_per_user: 3 }),
  });
  if (!res.ok) throw new Error('Falha ao criar sessão');
  const session = await res.json();
  console.log('✓ Sessão criada:', session.id);

  // 2. Conectar facilitador e participante
  const wsFacil = new WebSocket(`ws://localhost:8082/ws/session/${session.id}?token=${session.facilitator_token}`);
  await new Promise((resolve) => wsFacil.addEventListener('open', resolve));

  const wsPart = new WebSocket(`ws://localhost:8082/ws/session/${session.id}`);
  await new Promise((resolve) => wsPart.addEventListener('open', resolve));
  console.log('✓ Clientes conectados (Facilitador e Participante)');

  // Registrar listener do participante antes
  let topicId = null;
  const topicCreatedPromise = new Promise((resolve) => {
    wsPart.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'SNAPSHOT' && data.payload.topics?.length > 0) {
        topicId = data.payload.topics[0].id;
        resolve();
      }
    });
  });

  // 3. Adicionar tópico
  wsFacil.send(JSON.stringify({ action: 'ADD_TOPIC', payload: { title: 'Tópico Arquitetura', author_name: 'Bob' } }));
  await topicCreatedPromise;
  console.log('✓ Tópico criado, ID:', topicId);

  // 4. Testar UPDATE_TOPIC_NOTES como PARTICIPANTE
  console.log('➡️ Enviando UPDATE_TOPIC_NOTES como Participante...');
  
  let notesReceivedByFacil = null;
  const notesPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(), 1500);
    wsFacil.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'SNAPSHOT') {
        const t = data.payload.topics?.find((x) => x.id === topicId);
        if (t && t.notes && t.notes.length > 0) {
          notesReceivedByFacil = t.notes;
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  wsPart.send(JSON.stringify({ action: 'UPDATE_TOPIC_NOTES', payload: { topic_id: topicId, notes: 'Decisão: Adotar GraphQL' } }));
  await notesPromise;

  console.log('📋 Notas no tópico após envio por participante:', JSON.stringify(notesReceivedByFacil));
  if (!notesReceivedByFacil) {
    console.log('❌ FALHA CONFIRMADA: Participante NÃO consegue salvar anotações! O backend bloqueia com is_facilitator.');
  } else {
    console.log('✓ SUCESSO: Participante conseguiu salvar anotações!');
  }

  // 5. Testar UPDATE_TOPIC_NOTES como FACILITADOR
  console.log('➡️ Enviando UPDATE_TOPIC_NOTES como Facilitador...');
  let notesReceivedByPart = null;
  const facilNotesPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(), 1500);
    wsPart.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'SNAPSHOT') {
        const t = data.payload.topics?.find((x) => x.id === topicId);
        if (t && t.notes && t.notes.includes('Facilitador')) {
          notesReceivedByPart = t.notes;
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  wsFacil.send(JSON.stringify({ action: 'UPDATE_TOPIC_NOTES', payload: { topic_id: topicId, notes: 'Notas do Facilitador: Aprovado' } }));
  await facilNotesPromise;
  console.log('📋 Notas no tópico após envio por facilitador:', JSON.stringify(notesReceivedByPart));

  wsFacil.close();
  wsPart.close();
  process.exit(0);
}

testNotes().catch(console.error);
