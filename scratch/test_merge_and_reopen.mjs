// Node 22 tem WebSocket global nativo
async function runTest() {
  console.log('1. Criando sessão via POST /api/sessions...');
  const res = await fetch('http://127.0.0.1:8082/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Teste Merge & Reopen', max_votes_per_user: 3 }),
  });
  const sessionData = await res.json();
  console.log('Sessão criada:', sessionData.id);

  const ws = new WebSocket(
    `ws://127.0.0.1:8082/ws/session/${sessionData.id}?session_hash=test_user&token=${sessionData.facilitator_token}`
  );

  await new Promise((resolve) => {
    ws.addEventListener('open', resolve);
  });
  console.log('WebSocket conectado com token de facilitador.');

  let snapshot = null;
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'SNAPSHOT') {
      snapshot = msg.payload;
    }
  });

  // Aguarda snapshot inicial
  while (!snapshot) await new Promise((r) => setTimeout(r, 50));

  console.log('2. Adicionando 2 tópicos...');
  ws.send(JSON.stringify({
    action: 'ADD_TOPIC',
    payload: { title: 'Tópico 1 - CI/CD', description: 'Pipeline demorando muito', author_name: 'Alice' }
  }));
  ws.send(JSON.stringify({
    action: 'ADD_TOPIC',
    payload: { title: 'Tópico 2 - GitHub Actions', description: 'Deploy em paralelo', author_name: 'Bob' }
  }));

  while (snapshot.topics.length < 2) await new Promise((r) => setTimeout(r, 50));
  console.log('Tópicos criados:', snapshot.topics.map(t => ({ id: t.id, title: t.title })));

  const [t1, t2] = snapshot.topics;

  console.log('3. Testando MERGE_TOPICS (Tópico 2 mesclado no Tópico 1)...');
  ws.send(JSON.stringify({
    action: 'MERGE_TOPICS',
    payload: { source_topic_id: t2.id, target_topic_id: t1.id }
  }));

  while (snapshot.topics.length !== 1) await new Promise((r) => setTimeout(r, 50));
  const mergedTopic = snapshot.topics[0];
  console.log('Tópico resultante:', {
    id: mergedTopic.id,
    title: mergedTopic.title,
    author_name: mergedTopic.author_name,
    description: mergedTopic.description,
  });

  if (!mergedTopic.description.includes('Bob') || !mergedTopic.author_name.includes('Bob')) {
    throw new Error('Merge não combinou autores/descrições corretamente!');
  }
  console.log('✓ MERGE_TOPICS validado com sucesso!');

  console.log('4. Avançando para DISCUSSION...');
  ws.send(JSON.stringify({
    action: 'CHANGE_PHASE',
    payload: { phase: 'DISCUSSION' }
  }));

  while (snapshot.session.phase !== 'DISCUSSION') await new Promise((r) => setTimeout(r, 50));
  console.log('Fase atual:', snapshot.session.phase);
  console.log('Tópico ativo inicial:', snapshot.session.active_topic_id);

  console.log('5. Concluindo o tópico (MOVE_TOPIC_STATUS -> DISCUSSED)...');
  ws.send(JSON.stringify({
    action: 'MOVE_TOPIC_STATUS',
    payload: { topic_id: mergedTopic.id, status: 'DISCUSSED' }
  }));

  while (snapshot.topics[0].status !== 'DISCUSSED') await new Promise((r) => setTimeout(r, 50));
  console.log('Tópico agora está:', snapshot.topics[0].status);
  console.log('Sessão active_topic_id após concluir:', snapshot.session.active_topic_id);

  console.log('6. Reabrindo o tópico encerrado errado (MOVE_TOPIC_STATUS -> TO_DISCUSS)...');
  ws.send(JSON.stringify({
    action: 'MOVE_TOPIC_STATUS',
    payload: { topic_id: mergedTopic.id, status: 'TO_DISCUSS' }
  }));

  while (snapshot.topics[0].status !== 'TO_DISCUSS') await new Promise((r) => setTimeout(r, 50));
  console.log('Tópico reaberto com status:', snapshot.topics[0].status);

  console.log('7. Retomando discussão do tópico (MOVE_TOPIC_STATUS -> DISCUSSING)...');
  ws.send(JSON.stringify({
    action: 'MOVE_TOPIC_STATUS',
    payload: { topic_id: mergedTopic.id, status: 'DISCUSSING' }
  }));

  while (snapshot.topics[0].status !== 'DISCUSSING') await new Promise((r) => setTimeout(r, 50));
  console.log('Tópico retomado com status:', snapshot.topics[0].status);
  console.log('Sessão active_topic_id atualizada para:', snapshot.session.active_topic_id);

  if (snapshot.session.active_topic_id !== mergedTopic.id) {
    throw new Error('Active topic ID não foi atualizado corretamente ao retomar discussão!');
  }

  console.log('✓ Todos os testes de Merge e Reabertura passaram com 100% de sucesso!');
  ws.close();
}

runTest().catch((e) => {
  console.error('Erro no teste:', e);
  process.exit(1);
});
