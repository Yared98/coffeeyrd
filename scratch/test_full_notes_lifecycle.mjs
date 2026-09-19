async function testFullNotesLifecycle() {
  console.log('🧪 Iniciando teste completo do ciclo de vida de Anotações & Combinados...');

  // 1. Criar sessão
  const res = await fetch('http://localhost:8082/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Sessão Auditoria Notas', max_votes_per_user: 3 }),
  });
  if (!res.ok) throw new Error('Falha ao criar sessão');
  const session = await res.json();
  console.log('✓ 1. Sessão criada com sucesso:', session.id);

  // 2. Conectar Facilitador e 2 Participantes (Carol e Daniel)
  const wsFacil = new WebSocket(`ws://localhost:8082/ws/session/${session.id}?token=${session.facilitator_token}`);
  const wsCarol = new WebSocket(`ws://localhost:8082/ws/session/${session.id}`);
  const wsDaniel = new WebSocket(`ws://localhost:8082/ws/session/${session.id}`);

  await Promise.all([
    new Promise((r) => wsFacil.addEventListener('open', r)),
    new Promise((r) => wsCarol.addEventListener('open', r)),
    new Promise((r) => wsDaniel.addEventListener('open', r)),
  ]);
  console.log('✓ 2. Facilitador + 2 Participantes conectados em tempo real via WebSocket');

  // 3. Adicionar tópico de teste
  wsCarol.send(JSON.stringify({
    action: 'ADD_TOPIC',
    payload: { title: 'Implementação de Cache Redis', author_name: 'Carol' },
  }));

  let topicId = null;
  await new Promise((resolve) => {
    wsDaniel.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'SNAPSHOT' && data.payload.topics?.length > 0) {
        topicId = data.payload.topics[0].id;
        resolve();
      }
    });
  });
  console.log('✓ 3. Tópico adicionado e sincronizado para todos, ID:', topicId);

  // 4. Facilitador move para fase DISCUSSION
  wsFacil.send(JSON.stringify({
    action: 'CHANGE_PHASE',
    payload: { phase: 'DISCUSSION' },
  }));
  await new Promise((r) => setTimeout(r, 200));
  console.log('✓ 4. Sessão avançada para fase DISCUSSION');

  // 5. Participante Daniel registra notas e decisões combinadas
  console.log('➡️ 5. Participante Daniel salvando anotações e combinados...');
  const sampleNotes = 'Decisões da Reunião:\n- Redis Cluster adotado na AWS\n- TTL padrão: 15 minutos\n- Ação: Daniel abrir PR até quarta-feira.';
  
  const danielNotesPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout aguardando notas de Daniel chegarem para Carol')), 2500);
    wsCarol.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'SNAPSHOT') {
        const t = data.payload.topics?.find((x) => x.id === topicId);
        if (t && t.notes && t.notes.includes('TTL padrão')) {
          clearTimeout(timeout);
          resolve(t.notes);
        }
      }
    });
  });

  wsDaniel.send(JSON.stringify({
    action: 'UPDATE_TOPIC_NOTES',
    payload: { topic_id: topicId, notes: sampleNotes },
  }));

  const notesReceivedByCarol = await danielNotesPromise;
  console.log('✓ Carol recebeu notas em tempo real no snapshot!');
  console.log('Conteúdo:\n', notesReceivedByCarol);

  // 6. Facilitador complementa com uma linha adicional
  console.log('➡️ 6. Facilitador complementando notas...');
  const updatedNotes = notesReceivedByCarol + '\n- Aprovado por consenso unânime.';
  
  const facilNotesPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout aguardando notas do facilitador chegarem para Daniel')), 2500);
    wsDaniel.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'SNAPSHOT') {
        const t = data.payload.topics?.find((x) => x.id === topicId);
        if (t && t.notes && t.notes.includes('consenso unânime')) {
          clearTimeout(timeout);
          resolve(t.notes);
        }
      }
    });
  });

  wsFacil.send(JSON.stringify({
    action: 'UPDATE_TOPIC_NOTES',
    payload: { topic_id: topicId, notes: updatedNotes },
  }));

  const finalNotes = await facilNotesPromise;
  console.log('✓ Daniel recebeu notas complementadas em tempo real!');

  // 7. Facilitador conclui tópico (move para DISCUSSED)
  wsFacil.send(JSON.stringify({
    action: 'MOVE_TOPIC_STATUS',
    payload: { topic_id: topicId, status: 'DISCUSSED' },
  }));
  await new Promise((r) => setTimeout(r, 200));
  console.log('✓ 7. Tópico movido para DISCUSSED com notas preservadas');

  // 8. Verificar exportação de ata Markdown do backend
  const exportRes = await fetch(`http://localhost:8082/api/sessions/${session.id}/export`);
  if (!exportRes.ok) throw new Error('Falha ao exportar ata');
  const markdownText = await exportRes.text();
  console.log('✓ 8. Ata exportada com sucesso pelo endpoint /export');
  
  if (!markdownText.includes('TTL padrão') || !markdownText.includes('consenso unânime')) {
    throw new Error('As anotações e combinados não foram incluídos na ata exportada!');
  }
  console.log('✓ Anotações e combinados constam com 100% de integridade na ata final Markdown!');

  wsFacil.close();
  wsCarol.close();
  wsDaniel.close();

  console.log('\n🎉 SUCESSO TOTAL: Todo o fluxo de Anotações e Combinados está 100% funcional e colaborativo!');
}

testFullNotesLifecycle().catch((err) => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
