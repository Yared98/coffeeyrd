// WebSocket nativo do Node v22

async function runTest() {
  console.log('🧪 Iniciando teste automatizado de Mescla Reversível (Undo Merge)...');

  // 1. Criar Sessão
  const res = await fetch('http://localhost:8082/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Teste Reversible Merge', max_votes_per_user: 5 }),
  });
  if (!res.ok) throw new Error(`Falha ao criar sessão: ${res.statusText}`);
  const session = await res.json();
  console.log(`✓ Sessão criada: ${session.id}`);

  // 2. Conectar WebSocket como Facilitador
  const wsUrl = `ws://localhost:8082/ws/session/${session.id}?token=${session.facilitator_token}`;
  const ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  console.log('✓ WebSocket conectado com sucesso!');

  let latestSnapshot = null;
  const waitForSnapshotCondition = (condition, description) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout aguardando condição: ${description}`));
      }, 5000);

      const check = () => {
        if (latestSnapshot && condition(latestSnapshot)) {
          clearTimeout(timeout);
          resolve(latestSnapshot);
        }
      };

      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SNAPSHOT') {
          latestSnapshot = msg.payload;
          check();
        }
      };

      ws.addEventListener('message', handler);
      check();
    });
  };

  // Aguarda primeiro snapshot
  await waitForSnapshotCondition((s) => s.topics !== undefined, 'Primeiro snapshot');

  // 3. Adicionar Tópico 1 (Alice)
  ws.send(JSON.stringify({
    action: 'ADD_TOPIC',
    payload: { title: 'Tópico 1 Original', description: 'Descricao Alice', author_name: 'Alice' },
  }));
  await waitForSnapshotCondition((s) => s.topics.length === 1, 'Tópico 1 adicionado');
  const t1Id = latestSnapshot.topics[0].id;

  // 4. Adicionar Tópico 2 (Bob)
  ws.send(JSON.stringify({
    action: 'ADD_TOPIC',
    payload: { title: 'Tópico 2 Similar', description: 'Descricao Bob', author_name: 'Bob' },
  }));
  await waitForSnapshotCondition((s) => s.topics.length === 2, 'Tópico 2 adicionado');
  const t2Id = latestSnapshot.topics.find((t) => t.title.includes('Tópico 2')).id;

  // Votar nos tópicos
  ws.send(JSON.stringify({ action: 'TOGGLE_VOTE', payload: { topic_id: t1Id } }));
  ws.send(JSON.stringify({ action: 'TOGGLE_VOTE', payload: { topic_id: t2Id } }));
  await waitForSnapshotCondition(
    (s) => s.topics.every((t) => t.vote_count >= 1),
    'Votos computados'
  );
  console.log('✓ Tópicos 1 e 2 criados com votos e autores distintos!');

  // 5. Executar MERGE_TOPICS (Tópico 2 mesclado no Tópico 1)
  console.log(`\n➡️  Executando MERGE_TOPICS (source: ${t2Id} -> target: ${t1Id})...`);
  ws.send(JSON.stringify({
    action: 'MERGE_TOPICS',
    payload: { source_topic_id: t2Id, target_topic_id: t1Id },
  }));

  await waitForSnapshotCondition(
    (s) => s.topics.length === 1 && s.topics[0].merged_count === 1,
    'Tópicos mesclados'
  );
  const mergedTopic = latestSnapshot.topics[0];
  console.log('✓ Mescla realizada com sucesso!');
  console.log(`  - Título: ${mergedTopic.title}`);
  console.log(`  - Autores: ${mergedTopic.author_name}`);
  console.log(`  - merged_count: ${mergedTopic.merged_count}`);
  console.log(`  - Descrição: ${mergedTopic.description}`);

  if (!mergedTopic.description.includes('Bob') || !mergedTopic.author_name.includes('Bob')) {
    throw new Error('A mescla não consolidou descrição ou autor!');
  }

  // 6. Executar UNDO_MERGE para reverter a mescla
  console.log(`\n↩️  Executando UNDO_MERGE para reverter a mescla...`);
  ws.send(JSON.stringify({
    action: 'UNDO_MERGE',
    payload: { target_topic_id: t1Id },
  }));

  await waitForSnapshotCondition(
    (s) => s.topics.length === 2 && s.topics.every((t) => (t.merged_count || 0) === 0),
    'Mescla desfeita (2 tópicos restaurados)'
  );

  const restoredT1 = latestSnapshot.topics.find((t) => t.id === t1Id);
  const restoredT2 = latestSnapshot.topics.find((t) => t.id === t2Id);

  console.log('✓ UNDO_MERGE executado com sucesso!');
  console.log(`  - Restored T1: "${restoredT1.title}" (autor: ${restoredT1.author_name}, desc: "${restoredT1.description}")`);
  console.log(`  - Restored T2: "${restoredT2.title}" (autor: ${restoredT2.author_name}, desc: "${restoredT2.description}")`);

  if (!restoredT2) {
    throw new Error('Tópico 2 original não foi restaurado!');
  }
  if (restoredT1.description.includes('[Mesclado de Bob')) {
    throw new Error('A descrição do Tópico 1 não foi revertida!');
  }
  if (restoredT1.author_name.includes('Bob')) {
    throw new Error('O autor do Tópico 1 não foi revertido!');
  }

  console.log('\n🎉 TESTE PASSOU COM 100% DE SUCESSO! A mescla é perfeitamente reversível!');
  ws.close();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Falha no teste:', err);
  process.exit(1);
});
