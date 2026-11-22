# XVI Congresso Monogâmico — passagem de bastão

## Avaliação em destaque no encerramento (22/11/2026)
- Pedido de Bru: botão **Avalie o Congresso** agora dentro do card **Congresso encerrado / Até o XVII.**, com botão vermelho destacado e indicação de pesquisa anônima. Removido o atalho separado. Nosso feed passa para depois dos demais blocos da Home; Mural permanece no topo. Front-end20261122o, sem mudanças em dados, regras ou mapa.

## Pesquisa anônima de avaliação do Congresso (22/11/2026)
- Autorizada por Bru e aberta no card **Avalie o Congresso**, na Home após Links oficiais, preservando Mural/Feed e demais blocos. Seis temas de1–5 estrelas ou Não se aplica: experiência geral, chácara, comidas/bebidas, programação, organização e aplicativo. Campo opcional de sugestões até1500 caracteres. Uma entrega definitiva por conta, sem prazo configurado ou pontos.
- `congressReviews/xvi`: somente `{voters,ratings,suggestions}`. Notas são seis contadores compactados em base16 (N/A e estrelas1–5), atualizados por incrementos atômicos; não há avaliações individuais, UID, autor ou horário. Sugestões são lista de `{id,text}`, ID aleatório sem vínculo com conta, preservando textos iguais. `congressReviewVoters/{uid}` guarda apenas `{voted:true}`, sem escolhas, texto ou data; só o titular lê. Batch pareado impede votos repetidos/sem recibo. Histórico técnico da infraestrutura não é uma garantia de anonimato absoluto.
- Apenas ADMs consultam o agregado e sugestões pelo botão Ver resultados · COMORG dentro da pesquisa. Ninguém edita/apaga avaliações pelo cliente. Nenhum listener adicional na Home; módulo e leitura do recibo somente ao abrir, duas escritas no envio; médias excluem N/A. Respostas ficam no servidor para consulta posterior.
- Validação:87 testes locais (incluindo13 envios concorrentes, reentrada, repetição, mesma sugestão e mudança de conta);57 cenários específicos de regras e345 de regressão no serviço oficial, somente documentos simulados. Prévia isolada390×844 confirmou card, seis temas, validação, envio, confirmação/reentrada e resumo ADM, sem criar avaliações reais. Front-end20261122n. Publicar somente regras do Firestore e front-end no GitHub Pages. Preservadas as alterações atuais do Claude na main, inclusive Kirk; mapa, RTDB e Auth não foram alterados.

## Apresentações encerradas com13 rankings (22/11/2026)
- OB enviou o último ranking e Bru autorizou encerrar.13 comprovantes conferidos, sem auto voto, com agregado recalculado independentemente antes da premiação. Encerramento antecipado às10h40 SP em `RANKING_END`, `PRESENTATION_END` e regras; Queridômetro permanece revelado desde10h16. Nenhum voto individual alterado/apagado.
- Resultado:1º Felipe(+20),2º Gherardi(+10),3º Nanu(+5), sem empate. Bônus únicos `points/presentation_felipe`, `points/presentation_gherardi`, `points/presentation_nanu`, conferidos/criados idempotentemente pelo script privado `.private/finalize-presentations-20261122.cjs --apply`; evitar relançar. Placar geral continua aberto.
- Front-end20261122f. Publicar somente regras do Firestore e front-end; não alterar RTDB, Auth, mapa ou outras votações. Resultado agregado fora da raiz pública em `../Resultados-Apresentacoes-2026/resultado.json`.

## Queridômetro final revelado antecipadamente; apresentações aguardam OB (22/11/2026)
- Bru autorizou publicar o Queridômetro de22 após os13/13 votos. Revelação/encerramento antecipados em22/11 às10h16 SP (`FINAL_RESULTS_AT` e `revealAt` em shared.js; regras de leitura e janela ajustadas somente para20779). Prazo original de penalidades permanece12h; dias anteriores e votos armazenados preservados. Exportação da TV usa `revealAt` para incluir a rodada final já publicada.
- Conferência mostrou12/13 rankings, faltando OB. Bru escolheu explicitamente aguardar OB: **não encerrar as apresentações nem lançar os prêmios agora**. `RANKING_END` e `PRESENTATION_END` continuam12h e as regras de ranking permanecem intactas. Front-end20261122e; publicar somente regras do Firestore e front-end.

## Carros da volta para São Paulo (22/11/2026)
- Card de Volta para São Paulo personalizado na Home e na Agenda, com carro e ocupantes do perfil logado. `RETURN_CARS` em `travel.js` é independente da vinda: Nanu[Nanu,Pelado]; Bru[Bru,Ibrahim]; Felipe[OB,Felipe,Cadu,Luan]; Igor[Igor,Pig,Diogo,Gherardi]; Sadano[Sadano]. Não alterar `CARS`, horários da vinda ou elegibilidade histórica do Queridômetro.
- Observação do card real atualizada somente no campo `note`: Procure o motorista para combinar o horário. Horários e demais campos da agenda preservados; backup privado e verificação em `.private/update-return-note-20261122.cjs`. A personalização usa o nome atual Bru e conserva o título comum da atividade. Teste dos13 perfis na Home/Agenda e regressão da divisão da vinda aprovados. Front-end20261122d; sem deploy de regras ou mapa.

## Ranking das apresentações após o último Queridômetro (22/11/2026)
- Autorizado por Bru: Queridômetro22 abre desde00h SP e continua encerrando às12h. Dias19–21 mantêm início às06h; resultados e penalidades históricas preservados. Após enviar os emojis de22, oferece ranking em lugar do quiz de5s; o quiz High anterior e seus bônus não são apagados. Quem já enviou os emojis pode abrir pela aba Queridômetro; reentrada recupera o próprio voto ou rascunho local.
-12 apresentações, com fotos recortadas das duas montagens fornecidas pelo usuário em `assets/presentations`: foto1 Ibrahim/Sadano/Nanu/Pelado/Igor/OB; foto2 Luan/Bru/Cadu/Felipe/Gherardi/Pig. Diogo não apresentou e avalia12; os demais avaliam11, sem voto próprio. Setas e seletor de posição, foto ampliável, sem cronômetro, envio definitivo até12h22/11 SP. Não regravar votos antigos ou criar votos reais para validar.
- `presentationBallots/{apelido}`: `{order,scores,createdAt}`, voto imutável privado (somente o próprio cliente lê). `presentationTallies/main`: `{voters,sums,samples}`, incremento atômico com recibo; agregado só pode ser lido após12h. Regras validam permutação completa e pesos de todas as posições, vínculo de UID, comprovante de Queridômetro22, prazo e voto único. Pesos da melhor à pior:11 itens110,99…0;12 itens110,100…0. Resultado compara a média normalizada recebida por cada apresentação, por produtos cruzados exatos; índice exibido0–100.
- Pódio por classificação competitiva: empates ganham o mesmo prêmio, com sequência1/1/3.1º+20,2º+10,3º+5. `points/presentation_<apelido>` é validado contra o agregado encerrado, criado uma única vez e imutável, inclusive para ADM; placar encerrado bloqueia. Apuração/premiação são executadas pelo app aberto após o prazo (ou na próxima abertura), sem Function paga, cron, RTDB ou Auth. Não há prêmio antes do encerramento.
- Módulos `presentation-ranking-{model,data}.js`, `presentation-ranking.js` e CSS próprio. Sem listener adicional permanente na Home; fotos só são carregadas ao abrir o ranking. Ao fechar ou trocar a conta, limpa a janela e o relógio local. Não alterar mapa ou física.
- Validação:82 testes locais;157 cenários específicos de regras,341 de regressão do Queridômetro e133 dos quizzes antigos no serviço oficial, com dados simulados. Testes dos quizzes divididos em lotes menores com retry503. Prévia isolada em390×844 confirmou ausência de voto próprio,12 opções para Diogo, fotos, ampliação, reordenação, envio e resultado pós-prazo. Nenhum voto ou prêmio real criado durante testes. Versão do front-end20261122a; publicar somente `firestore:rules` e front-end via GitHub Pages.

## Igor pode avançar com respostas pendentes (21/11/2026)
- Pedido de Bru durante a apresentação: Igor pode liberar a próxima pergunta sem esperar as12 respostas, inclusive com zero votos. UI, transação e regra de `igorLive/main` deixam de exigir quórum. Mantidos controle exclusivo de Igor, ordem sequencial, criação atômica da próxima rodada vazia, proibição de sobrescrever rodadas e imutabilidade dos votos. Ao avançar, a pergunta anterior não recebe novos votos; resultados já gravados são preservados. Não alterar o quórum do Nanu.
- Validação:79 testes locais aprovados e332 cenários específicos de regras com dados simulados, incluindo avanço com0/1/11 votos e recusa de voto em pergunta encerrada. Nenhuma sessão ou resposta real alterada para testar. Versão do front-end20261121u.

## Enquete oficial do Nanu liberada após ensaio (21/11/2026)
- Bru confirmou o sucesso do teste e autorizou a apresentação oficial. `NANU_TEST_MODE=false`: sala `nanuLive/main`, Nanu controla e os outros12 congressistas votam. A sala oficial estava ausente; Nanu recebe Liberar primeira pergunta novamente. Preservar o ensaio concluído em `nanuLive/teste`, sem copiar seus votos ou apagar dados.
- Conferido o mesmo bloqueio de leitura futura no Igor: já corrigido no adaptador publicado. Testes de ambos recusam leitura de rodada futura e percorrem todas as perguntas com avanço atômico. Nenhuma regra nova ou migração é necessária; publicar somente front-end com versões atualizadas dos módulos do Nanu.

## Correção do avanço nas enquetes (21/11/2026)
- `next()` do Nanu e do Igor não lê mais o agregado da pergunta futura: essa leitura era negada pelas regras porque a pergunta ainda não estava aberta. A transação lê sessão e contagem atual e grava a próxima sessão/rodada juntas; as regras existentes continuam exigindo rodada nova e vazia, ordem e quórum. Nenhuma regra foi afrouxada.
- Testes dos adaptadores agora simulam permission-denied ao ler pergunta futura e exercitam o avanço completo das salas oficial, ensaio e Igor. Preservar o voto de Bru já registrado na pergunta1 do ensaio; não reiniciar a sala nem avançar administrativamente por ele. Publicar somente front-end com versões novas dos adaptadores.

## Ensaio da enquete do Nanu em dois celulares (21/11/2026)
- Bru emprestará o celular logado como Bru para Nanu testar a jornada de votante; Nanu usa o próprio celular, logado como Nanu, para conduzir. **Não é simulação local num só aparelho.** Duas contas sincronizadas, somente Bru vota; os outros congressistas não veem nem acessam o ensaio. Cada resposta de Bru já libera o avanço para Nanu. Cabeçalho Ensaio · Nanu e Bru.
- `NANU_TEST_MODE=true` em `nanu-poll-model.js`: `NANU_ROOM='teste'`, `NANU_ACTIVE_VOTERS=['bruno']`. `NANU_VOTERS` conserva os12 votantes oficiais. API e listener da Agenda usam a sala ativa; participantes de fora não abrem consulta privada. Para voltar à apresentação oficial, mudar a flag para false e publicar os módulos/versões correspondentes; a sala `main` e seu quórum12 permanecem intactos.
- Sala separada `nanuLive/teste` com o mesmo esquema de sessão, rounds e answers. Regras: somente Nanu controla, somente Bru vota com recibo imutável/incremento atômico; quórum1, perguntas1–11 em ordem, nuvem após resposta. Nenhuma permissão extra no perfil Bru, Auth, pontos, mapa ou enquete do Igor. Não copiar respostas do ensaio para `nanuLive/main` nem reutilizar o ensaio como resultado oficial.
- Validação:79 testes locais (SDK exercita as salas main e teste separadamente);204 cenários específicos do ensaio,205 da sala oficial e337 de regressão no serviço oficial, todos com dados simulados. Prévia com Nanu e Bru confirmou liberação, voto ao vivo e avanço após uma resposta. As duas salas reais estavam ausentes na preparação e não foram iniciadas para validar. Publicar somente `firestore:rules` e front-end.

## Quiz High: aceitar Éden e bônus autorizados (21/11/2026)
- Bru confirmou que somente Éden também é uma resposta correta. `quizAnswer` aceita Éden/eden com ou sem acento, maiúsculas e espaços externos e continua gravando a forma canônica `jardim do eden`. Regras do Firestore, prazo, tentativa única e valor+20 permanecem iguais; não é necessário deploy de regras. Publicar front-end com versões atualizadas dos dois módulos do quiz.
- Bônus reais já registrados e conferidos, sem duplicação: Cadu+10 por Encontrou o javali na vida real (`points/bonus_javali_real_20261121_cadu`); Nanu+20 e Gherardi+20 pela resposta Éden (`points/bonus_quiz_eden_20261121_nanu` e `points/bonus_quiz_eden_20261121_gherardi`). Não relançar. Bônus de Cadu é independente do prêmio do javali virtual e não altera seu dono.
- Tentativas antigas erradas guardam `answer:''`, sem o texto digitado. Não é possível descobrir retrospectivamente quem mais respondeu Éden a partir desses comprovantes. Nanu/Gherardi foram corrigidos pela confirmação explícita de Bru; tentativas originais preservadas. Script administrativo idempotente e backups ficam em `.private/bonus-javali-real-eden-20261121.cjs` e `.private/bonus-javali-eden-backup-*.json`.

## Apresentação do Igor: palpites ao vivo e exportação (21/11/2026)
- No mesmo card da Retrospectiva, na Agenda: Igor vê **Conduzir enquete do Igor**; os outros 12 congressistas recebem **Participar da enquete do Igor** quando ele libera a primeira pergunta. Igor apresenta, não vota e só avança após as 12 respostas. Independente da enquete do Nanu; preservar os registros dela. Nenhuma sessão ou voto de teste foi criado na produção.
- `igor-poll-model.js` guarda as dez perguntas, sem resposta certa/errada e sem pontos. Pergunta1: Sim verde/Não vermelho. Pergunta3:1–30 anos, passo1, ou Nunca vai acabar (`never`). Pergunta4:5–100 anos, passo5, ou +100 anos (`over`). O botão especial, ao lado da barra, a desativa; tocar novamente restaura o valor anterior. O voto só é enviado no botão Enviar resposta.
- Confirmação de Bru: perguntas8 e10 têm somente Sim/Não; Outro, na pergunta9, apenas conta votos, sem campo de texto. Pergunta7 tem as oito capas e nomes completos. Miniaturas locais em `assets/igor-poll`, fontes da Apple Music em `SOURCES.json`; carregamento sob demanda na pergunta dos álbuns.
- `igorLive/main` guarda `{question,startedAt,updatedAt}`; `rounds/{1..10}` guarda `{counts,total}`; `answers/{apelido}` guarda `{choice,createdAt}`. Valores de anos usam `y1`…`y30` ou `y5`…`y100`. Resposta imutável e incremento do contador são enviados em lote atômico. Reenvio/reentrada não duplicam. Só Igor inicia/avança; contagens ficam ocultas ao participante até seu voto; Igor pode consultar as respostas. Dados são permanentes para exportação, sem limpeza automática.
- `igor-poll.js` abre diálogo independente do app, acompanha somente a pergunta atual e interrompe listeners ao fechar/ocultar. A Agenda observa um documento de sessão adicional; a Home não ganha consulta. UI e regras da enquete do Nanu permanecem separadas. Preservar mapa/capivaras/javali, RTDB, Auth e dados reais.
- Exportar somente a pedido: `node scripts/export-igor-poll.cjs --out .private/exports/igor`. Produz JSON, TXT agregado e CSV dos votos, em pasta privada; não grava no Firebase. Totais são calculados dos comprovantes individuais. Nunca commitar/publicar a exportação ou colocá-la na raiz pública do Pages.
- Validação:79 testes locais,314 cenários de regras do Igor,205 do Nanu e337 de regressão no serviço oficial, todos simulados. Prévia isolada com duas contas confirmou liberação, contagens, avanço até a pergunta10, controles das barras e Outro sem texto; exportação conferida com120 votos fictícios. Publicar somente `firestore:rules` e front-end via GitHub Pages, deixando a sessão real sem iniciar.

## Apresentação do Nanu: enquete ao vivo (21/11/2026)
- No card da Retrospectiva/Restrospectiva do meu An*, na Agenda, somente Nanu vê **Conduzir enquete do Nanu** antes da liberação. Ao iniciar, os outros 12 congressistas recebem **Participar da enquete do Nanu** em tempo real. Nanu apresenta e não vota; o convidado extra não participa. A enquete deve permanecer sem sessão no banco até Nanu clicar em Liberar primeira pergunta.
- `nanu-poll-model.js` contém as 11 perguntas e alternativas, sem gabarito. Questões1–10: uma resposta imutável por pessoa; contagens por alternativa só aparecem depois do próprio voto. Nanu acompanha as contagens e só avança após12 respostas; não pode pular perguntas. Nunca revelar alternativa correta no cliente. Gabarito/notas fornecidos por Bru estão somente em `.private/nanu-poll-gabarito.json`, ignorado pelo Git. Não há bônus de placar nesta dinâmica.
- Questão11: palpite curto de até140 caracteres; após enviar, mostra nuvem compartilhada em tempo real. Frequência conta cada palavra uma vez por pessoa, agrupa acentos/maiúsculas e preserva negações. Ver respostas permite ler os textos completos; nomes não são exibidos. Não mudar respostas/statísticas históricas para corrigir a apresentação.
- Firestore: `nanuLive/main` guarda pergunta e timestamps; `rounds/{1..11}` guarda `a,b,c,total`; `answers/{apelido}` guarda `choice` ou `text`, com `createdAt`. `nanu-poll-data.js` envia comprovante e incremento em lote atômico, com recuperação de reenvio. Início/avanço são transações exclusivas de Nanu. Regras impedem voto duplicado, leitura antecipada das contagens e alteração de perguntas encerradas.
- `nanu-poll.js` abre diálogo independente da renderização do app, acompanha somente a pergunta atual e interrompe consultas ao fechar/ocultar. A Agenda observa apenas o documento de sessão; a Home não ganha consulta. Preservar mapas, RTDB, Auth, contas, pontos, Queridômetro e quizzes anteriores.
- Verificação:76 testes locais;44 cenários do javali,205 cenários específicos de regras,337 de regressão e133 dos quizzes anteriores no serviço oficial com documentos simulados. Prévia isolada com duas contas confirmou liberação, voto/contagem sem recarregar, avanço até a pergunta11 e nuvem responsiva. Nenhum voto ou sessão de teste foi criado na produção. Publicar somente `firestore:rules` e front-end via GitHub Pages.

## Chácara: Kirk estava dentro da fantasia de tubarão (22/11/2026, Claude)
- Pedido do Bru: o avatar Kirk (boné verde com estrela vermelha, cabelo escuro cacheado, bigode e cavanhaque, camisa amarela com gola verde) era quem estava o tempo todo dentro do tubarão. Ele corre pelo gramado plano a leste dos carros (`kirkAt`, pelo relógio, igual para todos, cerca de 12 × 14 m), saltitando sem parar com os braços para cima e dando duas voltas completas a cada 5,5 s. Nome Kirk sobre a cabeça. É obstáculo (`sharkC`, raio 0,55). Com redução de movimento ele só anda.
- A fantasia inflável ficou sem ar: o tubarão antigo está oculto e no lugar há um pano achatado e amassado (contorno irregular, barriga branca, cabeça, cauda e barbatanas tombadas, rugas, olhos e boca de lado, pés vazios) em área plana (`COSTUME=[27.6,3.4]`).
- Kirk é NPC do mapa, fora de `PEOPLE`/roster: não entra em presença, placar nem app. `makeChar(KIRK,13)` é chamado no fim da cena, para não mudar a sequência de `rnd()` do resto do cenário. Novas opções de `makeChar`: `shirt`, `collar`, `nolock` (sem cadeado do congresso) e `capStar`.
- Rosto em `mapa/spr/face_kirk.webp`, derivado do rosto do OB com barba por fazer e pinta. Sem mudança no Firebase.

## Chácara: capivaras que subiram pelo portão (21/11/2026, Claude)
- Pedido do Bruno: capivaras espalhadas para confundir com o javali. Nove em `CAPYS` (`mapa/index.html`): quatro passeiam em elipse (3 × 2,2 m) pelo relógio, igual em todos os aparelhos; duas pastam; três dormem deitadas com os mesmos "z" do javali (perto do portão, a oeste da Capela e perto do mirante). Mais claras que o javali, sem presas.
- Uma malha só por capivara (duas geometrias compartilhadas, cor por vértice). Não são obstáculo. Pisar numa mostra "Era só uma capivara."; não dá ponto e não grava nada. Sem mudança no Firebase.

## Chácara: javali selvagem dormindo, +20 e segue quem o acordou (21/11/2026, Claude)
- Pedido do Bruno: javali dormindo encostado no canto da Capela do lado oposto ao estacionamento, ao lado da escada (`BOAR_SPOT=[-3.3,23.7]` em `mapa/index.html`; o Bruno corrigiu o lado, antes era [2,12.5]). Deitado de barriga, respiração lenta e três "z" subindo. Quem passa por cima (raio 0,95 m, a pé) acorda o javali, ganha +20 no placar geral e passa a ser seguido por ele com a mesma lógica da cachorra do Pig (rastro com atraso de 0,7 s, para a 2,4 m, alcança se ficar a mais de 12 m ou travado).
- Prêmio único no total: só o primeiro ganha. `boar.js` faz uma transação que cria `mapRecords/javali` `{by,t}` e `points/javali` (+20, kind jogo, motivo "Acordou o javali da chácara") juntos; reenvio e concorrência não duplicam. Placar encerrado bloqueia. Regras: criação única, autor = conta logada, bônus imutável (nem ADM edita/apaga), `bruno` recusado.
- Todos veem o javali seguindo o dono (estado pelo listener do Firestore, posição pelo avatar remoto). Com o dono fora do mapa, o javali volta a dormir no lugar original e não pode ser acordado de novo: quem pisa vê "Esse javali já tem dono: X."
- Bru (perfil de teste): ao pisar, o javali segue só ele, só no aparelho dele e sem pontos (toast avisa). Isso não consome o prêmio.
- Canal: iframe `boar-claim` → `mapa-viagem.js` → `mapa-sala.js` `boar()` → `boar-result`; estado `boar` `{known,boar}`. Sem leitura do Firestore o javali só dorme.
- **Regras publicadas em21/11/2026**, junto com a enquete do Nanu, somente `firestore:rules`. Mapa/canal do Claude preservados sem alterações. Testes: `tests/boar.test.js` (local) e44 cenários de `scripts/test-boar-rules.cjs` no serviço oficial; simulação de documento já existente usa update, como no Firestore real. Para devolver o prêmio, apagar `mapRecords/javali` e `points/javali` pelo console.
- Revalidação solicitada após PR#17/#18, em 21/11/2026, sobre a main `fc0e8ff`: **610 cenários aprovados** no serviço oficial, somente com documentos simulados — `test-boar-rules.cjs` (44), `test-rules.cjs` (337), `test-lake-record-rules.cjs` (50), `test-daily-quiz-rules.cjs` (133) e `test-infraction-rules.cjs` (46). Nenhuma mudança adicional nas regras foi necessária; mantida a correção anterior do mock de sobrescrita.
- Deploy repetido com Firebase CLI 15.37.0, exclusivamente `firestore:rules`; conteúdo ativo conferido e idêntico ao arquivo validado. Executado via `pnpm dlx firebase-tools@latest`, pois `npx` não está disponível nesta sessão. Não foram criados `mapRecords/javali` ou `points/javali` na produção, nem alterados RTDB, Auth, mapa ou dados reais.


## Resultados atualizados para o Claude (21/11/2026 às 12:14)
- `docs/TV-CONGRESSO.md` agora contém as tabelas reais do placar e do Queridômetro de21/11; usar a seção Resultados atuais, preservando a entrega inicial como histórico. CapturaUTC `2026-11-21T15:14:57.856Z`.
- Rodada encerrada com12 votantes/144 emojis,13 no ranking e3 casos publicados. Pontos do Quiz dos Especialistas, bônus já ganhos na High e+3 da chave de Sadano já estão contabilizados: não relançar.
- Pacote atualizado de mídias/dados em `../TV-Congresso/entrega/Claude-TV-Congresso-2026-11-21-12h14.zip`. Somente tabelas agregadas no repo; snapshot completo e fotos do mural continuam fora da raiz pública. Nenhum vídeo novo foi renderizado nesta atualização.

## Próximo quiz: dark room da High (21/11/2026)
- Após o próximo envio do Queridômetro, pergunta “Qual é o nome do dark room da High?”, valendo+20, com os mesmos5s. Aceita “Jardim do Éden” com/sem acento, maiúsculas e espaços extras; persiste apenas `jardim do eden` no acerto, string vazia no erro. Erro/tempo esgotado não tira pontos.
- Nova rodada, tentativa única por conta em `dailyQuizEden/{uid}` e bônus atômico/imutável `points/quiz_eden_<uid>`. Disponível nos preenchimentos de21 ou22/11 para quem ainda não fez essa pergunta. Ter feito o quiz anterior não bloqueia este. Não apagar/reiniciar os registros `dailyQuizOB` nem alterar os bônus+5 anteriores.
- Rodada OB não aceita novos inícios após20/11, inclusive em versões antigas do app; respostas já iniciadas conservam a validação anterior. Novo quiz exige comprovante próprio de voto do mesmo dia, prazo do servidor7s com UI estrita de5s e placar aberto. Sem listeners extras, sem revelar escolhas do Queridômetro.
- Ao atualizar, publicar somente firestore:rules e front-end; preservar mapa, Realtime Database, Auth e dados reais. Testar as duas rodadas com dados simulados.

## Queridômetro: emoji de planta (20/11/2026)
- Adicionada 🌱 como nona opção, no fim de EMOJIS. Preservar a ordem dos oito emojis anteriores: não migrar nem regravar votos antigos. O nono contador usa16**8; nove dígitos em base16 cabem com precisão no número JS.
- Seletor em duas linhas, com5 colunas e botões de44px para caber no celular. Resultados mostram 🌱 com o mesmo fluxo dos outros emojis; janela, participação, anonimato e penalidades permanecem iguais.
- Regras aceitam também o incremento4294967296, mantendo comprovantes e proteção contra duplicação/voto próprio. Publicar somente firestore:rules e front-end; não mudar Realtime Database, mapa, Auth ou índices. Testes usam documentos simulados, sem votar na produção.
- Renderizador da TV aceita snapshot com8 ou9 opções (grade3×3 quando houver planta); exportações novas precisam do ícone8.png. Vídeo anterior permanece um retrato da captura original.

## Vídeo em loop para a TV (20/11/2026)
- Pedido, fontes, schema e instruções para o Claude em `docs/TV-CONGRESSO.md`. Intercala Queridômetro encerrado, placar completo e casos aprovados do mural; sem foto, reconstituição ilustrada a lápis.
- `node scripts/export-tv.cjs --out <pasta-privada>` exporta somente dados necessários, sem escrever no Firebase; reaproveita roster, elegibilidade, decodificação e cálculo real do placar. `scripts/tv/render_tv.py` compõe offline e recusa ilustração ausente/resultado inconsistente. Não alterar o mapa/app/regras para atualizar esse vídeo.
- Primeira captura20/11 às18:01 SP, rodada20 com11 votantes/132 emojis,13 no ranking,2 casos publicados. MP4 Full HD/30fps,144s, silencioso, dissolve da última tela à primeira. Novas versões somente a pedido.
- Pacote de dados e mídias para anexar ao Claude em `../TV-Congresso/entrega/Claude-TV-Congresso-2026-11-20.zip` (fora do repo público). Não commitar snapshots/fotos autenticadas, credenciais, PINs ou histórico do chat.

## Home: mural e feed primeiro (20/11/2026)
- Ordem solicitada: Mural da Vergonha no topo (com a sirene ao lado durante a viagem), Nosso feed em seguida, e depois os demais blocos na ordem anterior: atividade atual/próxima, Links oficiais, Chácara virtual, Queridômetro e eventual portal de descoberta.
- O mural continua aparecendo somente quando há condenação. Sem mural, o feed vem primeiro e a sirene permanece junto dos Links oficiais. Sem duplicar atalhos nem alterar dados, mapa ou regras do Firebase.

## Tarefas e infrações diretas (20/11/2026)
- Adicionada Organizar a casa (+5) à interface, validação do backend e pareamento tarefa/ponto nas regras. Substituída Sem look temático por Chamou o Bru pelo nome morto (-3); preservar lançamentos históricos antigos sem renomear/recalcular.
- Qualquer membro pode escolher o congressista e registrar diretamente uma das cinco infrações da tabela. Não há etapa de falar com ADM nem aprovação. Somente ADMs mantêm valor personalizado e lançamentos positivos livres. Início da viagem e encerramento do placar continuam valendo.
- `addInfraction` cria `points/inf_<id>` com os seis campos usuais e `by` (apelido do autor). Regras conferem autor, alvo, valor negativo e motivo/valor da tabela para não ADM; não liberam pontos positivos nem edição/exclusão por membros. ADMs podem corrigir/excluir com placar aberto, preservando autor/data na correção. Quiz, tarefas e recordes continuam com validações próprias e esquema anterior.
- Bru pediu três ocorrências dessa nova infração para Igor, total -9. Script administrativo idempotente em `.private/igor-name-infractions.cjs` verifica ocorrências atuais, faz backup privado e completa até três sem alterar outros pontos. IDs reservados `inf_igor_nome_morto_20261120_1..3`; sem `--apply` é só conferência.
- As três ocorrências foram registradas e verificadas em20/11; não lançar outras três ao retomar esta tarefa. Regras publicadas conferidas com o arquivo local. Validação:70 testes locais e485 cenários no serviço oficial (46 novos,327 regressão,50 represa,62 quiz), todos com dados simulados.

## Alerta do javali liberado aos 13 congressistas (20/11/2026)
- Após testar a versão pessoal, Bru autorizou o mesmo alerta para todos os congressistas logados. Aparência de janela iOS, translúcido,5s após abrir/retomar o app com o perfil pronto. Mensagem sobre javali e Prefeitura de Vargem/SP; “antigos seguros” foi corrigido para “Abriguem-se em locais seguros”. Botão OK fecha.
- `bru-alert.js` agenda sem reiniciar a cada snapshot. Ocultar o app ou trocar de conta cancela a espera; outra janela aberta adia para não cobrir o quiz. Exibição única por perfil/aparelho: Bru conserva o marcador `xvi-bru-javali-20261120-v1`; os demais usam o mesmo prefixo seguido de `:<id>`. Quem já viu não repete e não bloqueia outras contas no aparelho. Não consumir marcadores de produção durante testes. Sem leituras/escritas do Firebase e sem mudança no mapa.

## Apelido Bru e revelação mantida (20/11/2026)
- Bruno pediu trocar o nome exibido para **Bru**. `roster.js` é a fonte da interface e dos relatórios de contas; `mapa/index.html` também exibe Bru. ID interno `bruno`, login, foto, permissões e registros permanecem vinculados à mesma conta. No mapa mudou somente o apelido.
- Bruno cancelou o pedido de ocultar os resultados e anunciar uma apresentação na sala. Essa alteração NÃO foi publicada. Preservar o fluxo original: resultados no app a partir de12h, Home com chamada de revelação e aba com totais/destaques. O quiz publicado continua funcionando.

## Quiz após Queridômetro (20/11/2026)
- Bruno aprovou os prints do convite e da pergunta e autorizou a publicação. Não mudar o mapa.
- Após o próximo envio bem-sucedido de votos, cada congressista recebe o convite “Quiz do dia”. O botão “Ok, me sinto pronto” abre a pergunta “Qual é o sobrenome do OB?”, campo e contador de5s. Ao zerar fecha e envia automaticamente a última resposta digitada dentro do prazo; Enter pode antecipar. Relógio monotônico, sem pausa ao trocar de aba. Cinco segundos começam no botão, e não no convite.
- Uma tentativa desse quiz por conta, persistida em `dailyQuizOB/{uid}`: `{day,startedAt}` e depois `{answer,answeredAt}`. Aceita Martinez, Martines e Pereira, sem diferenciar maiúsculas, espaços externos ou acentos; resposta incorreta é gravada como string vazia. Não armazenar votos individuais nem associar escolhas de emojis ao quiz.
- Início exige comprovante próprio de votação naquele dia. Acerto grava a resposta e `points/quiz_ob_<uid>` (+5/kind jogo) na mesma transação. Regra recusa repetição, bônus sem acerto, outro titular e alteração/exclusão do bônus. Bruno pode participar deste quiz (exclusão de Bruno é só no recorde da represa). Placar encerrado bloqueia novas tentativas/bonificações.
- `daily-quiz.js`: UI, limite local estrito de5s e normalização. `daily-quiz-data.js`: leituras pontuais e transações; sem listener adicional. Servidor permite7s desde o início confirmado, sendo2s de tolerância de transporte; a UI nunca aceita texto após5s. Voto continua salvo mesmo se quiz/rede falhar. Recarga ou nova aba não reinicia tentativa já iniciada.
- Prévia local isolada em `.private/quiz-preview-server.cjs` (sem Firebase) e prints em `.private/quiz-prints/`. Verificação:64 testes locais,62 cenários de regras do quiz,327 de regressão e50 de recordes, sem dados de produção. Publicação deste quiz: somente regras de Firestore e front-end; não publicar Realtime Database/hosting/auth.

## Agenda: abertura no dia atual (20/11/2026)
- Todo toque em Agenda, inclusive com a aba já aberta, seleciona o dia atual de São Paulo. Abrir o app com Agenda como última aba também começa no dia atual. Antes/depois da viagem usa o primeiro/último dia; a visibilidade conforme a saída de cada congressista continua aplicada.

## Queridômetro: isenção da penalidade de 19/11 (20/11/2026)
- Bruno dispensou a multa de -5 por não preenchimento em 19/11 porque a COMORG não havia avisado os primeiros congressistas. `missedVotePoints` exclui esse dia do cálculo em todos os placares e históricos. A penalidade continua nos dias20,21 e22, após o prazo e conforme os comprovantes carregados.
- Não lançar pontos positivos de compensação: as multas são derivadas da participação, e a isenção corrige o cálculo diretamente. Votos/resultados/participação de19 continuam registrados.

## Represa: recorde oficial e bônus no placar (19/11/2026)
- Esta seção substitui as regras de recorde local/Realtime Database descritas abaixo. Início oficial em 18/11/2026 00h de São Paulo, igual ao restante do app. Bruno continua sendo o perfil de teste, excluído dos recordes.
- `mapRecords/latinhas` no Firestore guarda `{by,pts,t}`. `lake-record.js` aceita somente avanço estrito entre1 e999, com data do servidor, e cria `points/lake_<pts>` com +15/kind jogo/quem bateu o recorde na MESMA transação. Empates, reenvios e concorrência não duplicam pontos. Recordes e bônus param quando o placar fecha. Cada superação, inclusive pelo mesmo autor, rende outro bônus.
- Só a marca confirmada pelo servidor entra na placa e dispara Novo recorde/+15. A placa sem marca diz Não jogue lixo na água. Marcas do localStorage antigo não são mais usadas. Erro de envio permite tentar novamente pelo botão Registrar marca; transações exigem conexão. Presença, falas, interruptor e física continuam nos canais existentes.
- `mapa/recordeLatinhas` no Realtime Database fica legado, com escrita bloqueada para impedir avanço por versões antigas. Preservar esse nó para auditoria. A migração administrativa só importa a última marca se tiver data dentro da viagem e cria seu bônus uma vez. Não há histórico dos recordes intermediários anteriores à migração.
- Verificação:62 testes locais,50 cenários de regras para recordes e327 de regressão no serviço oficial. Os testes usam dados simulados. `scripts/migrate-lake-record.cjs --apply` faz a migração idempotente com backup privado.

## Chácara: resgate das latinhas no caiaque (13/11/2026, Claude)
- Ao embarcar no caiaque começa uma rodada: faixa "Atenção, noias!", depois "Peguem suas latinhas!" e 30 s para recolher latinhas espalhadas pela represa (`CAN_X0..CAN_Z1` em `mapa/index.html`, cerca de 118 × 66 m, sem marcação na água; as boias foram removidas de propósito). A rodada começa com 1 latinha e cresce de forma acelerada (`canSpawn`): cada coleta faz surgirem 2 nos primeiros 10 s, 3 dos 10 aos 20 s e 4 nos 10 s finais; quando faltam 5 s cai a "chuva de latinhas", tantas quantas o jogador já recolheu (mínimo 8). Teto de 72 na água. Cada latinha é uma malha só com cor por vértice, e as ondinhas somem quando há mais de 14 latinhas, para não pesar. As latinhas chegam arremessadas da margem em arco (`can.fly`), só podem ser recolhidas depois de cair e fazem uma ondinha ao bater na água; a chuva final não tem aviso na tela, de propósito. O desenho da latinha (`canShape`) tem rótulo, gargalo, lacre aberto e, em algumas, canudo. As novas nascem entre 8 e 18 m do caiaque, a pelo menos 5 m umas das outras. Histórico de 13/11: antes disso houve um modo com 24 latinhas espalhadas (PR #10) e um modo em ondas 1, 2, 4, 8 (PR #13); o Bruno escolheu este. Cada uma vale 1 ponto, ou 2 se recolhida até 1,5 s depois da anterior. Nos últimos 5 s o cronômetro fica vermelho e pulsa. Cada latinha tem um anel branco pulsando na água para ser vista de longe. Como a rodada mudou de 60 s para 30 s em área maior, um recorde gravado antes dessa mudança (13/11, madrugada) não é comparável e deve ser apagado no console. Atracar encerra a rodada com a pontuação feita. Quando o tempo acaba na água, o jogador é desembarcado ao lado da placa, de frente para a câmera, e o caiaque volta ao ponto original (`canEnd(true)`); a faixa de fim de jogo fica no alto da tela para não cobrir o nome do avatar. Só nesse desembarque automático o andar fica travado (`canFreeze`): por 2 s e, depois, até o jogador soltar o controle, com teto de mais 1 s. A câmera continua livre.
- O jogo roda só no aparelho de quem rema (`canStart`, `canFrame`, `canEnd`); os outros veem apenas o caiaque. Retomar a sessão já embarcado não inicia rodada.
- A placa de madeira ao lado do caiaque (`drawRecord`) diz "Não jogue lixo na água" enquanto não há recorde. Depois mostra o recorde compartilhado; sem ele, a melhor marca do aparelho (`localStorage`, chave `congresso-mapa-latinhas-<id>`).
- O usuário `bruno` testa o mapa e não conta para recorde: joga normalmente, mas não grava marca local, não envia recorde (`CAN_TESTER` no mapa, `record` em `mapa-sala.js`) e a regra do banco recusa `by` igual a `bruno`.
- **Pendente de deploy:** a regra de `mapa/recordeLatinhas` está em `database.rules.json` e só vale depois de `firebase deploy --only database`. Ela aceita apenas marca maior que a atual, de 1 a 999, assinada pelo próprio autor, e recusa o usuário `bruno`. Se a regra já tinha sido publicada antes de 13/11 à noite, publique de novo para valer a exclusão do `bruno`. Sem o deploy nada quebra: o listener se encerra sozinho e a placa fica só com a marca local.
- Para zerar o recorde, apague o nó `mapa/recordeLatinhas` pelo console do Firebase (a regra não permite baixar a marca pelo app).

## Chácara: conversa por balões mais fluida (12/11/2026, Claude)
- A janela central virou uma barra no topo (`#speech-overlay`), sem escurecer a cena e sem esconder os balões. Fica no topo, e não no rodapé, para o teclado do iPhone não cobrir nem deslocar a cena. Ela continua aberta depois de enviar.
- Duração do balão: `speechMs` em `mapa-sala.js` (4 s + 60 ms por caractere, teto de 10 s).
- Cada participante vê o próprio balão e os que recebe de frente e sem encolher com a distância. Terceiros veem o balão voltado para a câmera do destinatário; o verso mostra só o formato com três pontos.
- Quem recebe uma fala pode responder por 30 s mesmo fora dos 5,5 m (`replyUntil`); o botão vira "Responder X".
- Aviso lateral também quando o balão está encoberto (`balloonOccluded`, raycast a cada 280 ms só para falas dirigidas ao usuário).
- "Digitando": uma fala com o texto `…` enviada pelo mesmo canal `mapa/falas`, no máximo a cada 3,5 s, e substituída quando a fala real chega. Os códigos de movimento da pose (0–20) já estão todos ocupados, por isso não foi usado `m`. Nenhuma regra do Firebase mudou.

## Chácara: bola, rede de vôlei e acabamento visual (12/11/2026, Claude)
- `mapa/index.html`: a rede de vôlei virou uma corda elástica simulada (24 nós presos nos postes). Corpos encostados viram apoio; quem insiste estica até o limite e quem solta é devolvido. Os postes entraram em `CIRC`.
- A bola tem física própria (`ballStep`, passo fixo de 1/120 s): gravidade, quique, atrito de rolagem, declive do terreno, `BOXES`, `CIRC` (inclui o tubarão), avatares, piscina e represa. Na represa ou fora do mapa ela volta para a quadra.
- Sincronização: quem tocou por último é a autoridade e publica posição e velocidade em `mapa/bola` (iframe → `mapa-viagem.js` → `mapa-sala.js`, método `kick`). Os outros simulam a partir do último estado; estado antigo é avançado em até 20 s.
- **Pendente de deploy:** a regra de `mapa/bola` está em `database.rules.json`, mas só vale depois de `firebase deploy --only database`. Sem ela a leitura é negada, o listener da bola se encerra sozinho e cada aparelho vê a própria bola; presença, falas e interruptor não são afetados.
- Visual sem passada extra de desenho: textura procedural na grama, sombra de contato das árvores numa malha só, e detalhe por `onBeforeCompile` (`fx`) em telhado, piso, deck, represa e piscina. Não há shadow map nem pós-processamento, de propósito, para preservar o desempenho no celular.

## Home e descoberta da chácara (11/11/2026)
- Home prioriza próxima atividade/saída pessoal. Durante uma atividade, Agora e Depois ficam no mesmo cartão, com preparos reais; sem preenchimento “Nada a preparar”. Endereço do carro usa travelPlan autenticado. Horários em São Paulo; transição de atividades reavalia a tela automaticamente.
- Relógio global com segundos removido. Mural e sirene ficam após a atividade. Sem condenados, Links oficiais ocupa o espaço ao lado da sirene. Com mural, links vêm na linha seguinte. Feed continua com duas fotos e botão + no título.
- Queridômetro não ocupa a home antes de abrir. Durante a janela: chamada para votar só após carregar o marcador próprio e respeitando chegada; após votar, aviso compacto. Ao meio-dia, cartão de revelação; só diminui depois que o resultado carregou na aba visível. Marcador de leitura local por perfil/dia, sem consulta nova.
- `discovery.js`: **DISCOVERY_RELEASED=true** por autorização de Bruno. Visitar Agenda + Contas e abrir novamente libera o portão ilustrado para cada perfil logado. A animação curta respeita redução de movimento. Retorno ao PWA após >=60s em segundo plano também conta como reabertura.
- Só ao receber ready do iframe se registra a primeira entrada; fechar antes de carregar preserva o portão. Após entrar, portal some da home e Chácara virtual permanece no perfil, com aviso discreto ao voltar. Em 18/11 00h SP deixam de surgir portões; acesso permanece para quem já entrou.
- Progresso e marcos ficam no localStorage do aparelho, isolados por perfil.
- Só Bruno tem os controles de teste em Perfil → Prévia da chácara: progresso, Simular nova abertura, Recomeçar descoberta. Reiniciar afeta só essa descoberta local; não apaga posição do avatar, votos ou dados reais.
- A restrição de descoberta é de interface, como o antigo botão exclusivo; não constitui proteção de arquivos estáticos do mapa público. Esta mudança não altera regras do Firebase nem os dados do congresso.
- Cenários da home e jornada verificados no navegador com backend simulado, mapa Three.js real em modo solo e larguras320/390/430. Não gravar testes na produção.

## Chat: cores sorteadas por abertura (01/11/2026)
- Mensagens novas de um mesmo autor têm a mesma cor discreta (faixa lateral, ponto e fundo suave), sem nome, legenda ou “autor verde”. Palette14 tons distintos claro/escuro; texto mantém cor de leitura. Próprias mensagens continuam à direita e apagar continua aplicando risco duplo.
- `chat-colors.js`: embaralha cores com crypto em memória por abertura da Fofoca. Entrar novamente na aba, recarregar app ou trocar conta refaz sorteio; snapshots, envio, riscar e paginação NÃO trocam cores já atribuídas naquela abertura. Cada leitor tem sorteio local independente. Nada de cores no Firestore/storage/URL; sorteio aleatório pode repetir uma cor por acaso.
- `chat/{id}` acrescenta `threadKey`:128bits aleatórios em32hex, sem UID/apelido no documento público. É pseudônimo estável do autor nos dados, não a cor. Não afirmar impossibilidade de correlacionar mensagens pelo acesso técnico aos dados; o sorteio visual não é criptografia nem anonimato contra infraestrutura.
- Perfil privado `chatAuthors/{uid}`:{threadKey}; reserva privada `chatThreads/{threadKey}`:{uid}, ambos imutáveis e sem listagem por cliente. Perfil só próprio UID lê; reserva só titular lê. Criação pareada impede reservar chave de outro membro. Primeiro envio cria perfil+reserva+mensagem+comprovante em transação; próximos reutilizam a chave. Nenhum listener novo nem serviço pago.
- Regras exigem chave do perfil do remetente nas mensagens novas; riscar preserva chave/texto/data. Mensagens anteriores sem threadKey permanecem neutras; comprovantes de autoria já existentes continuam permitindo riscar quando aplicável. Sem migração/inferência/alteração dos testes antigos.
- Limpeza futura integral do chat deve remover mensagens, comprovantes, perfis chatAuthors e reservas chatThreads, para recomeçar pseudônimos também; preservar contas/PINs em Auth/people. Checkpoint descobre automaticamente esses caminhos. Não executar limpeza agora.

## Chat: apagar risca, somente autor (30/10/2026)
- Botão apagar somente nas próprias mensagens novas e ainda não riscadas. Não excluir o documento: marcar struck:true e renderizar texto com line-through double, mantendo legibilidade, conteúdo e horário. Não explicar a piada no front, sem aviso/toast extra. ADMs não têm permissão de apagar/riscá-las por serem ADMs.
- `chat/{id}` novo: SOMENTE text<=280, createdAt timestamp servidor e struck boolean inicialmente false. Update permite somente false→true por autor; conteúdo/data imutáveis; ninguém exclui fisicamente pelo cliente. Mensagens antigas sem struck seguem legíveis.
- Autoria em comprovante privado `chatAuthors/{uid}/messages/{id}` com SOMENTE owned:true, criado no mesmo batch da mensagem nova. Só o próprio UID lê/lista seus comprovantes; nem ADM do app lê os alheios. Regras recusam reivindicar mensagem antiga ou comprovante sem mensagem nova. Texto público não contém UID/apelido/autor; infraestrutura administrativa pode acessar comprovantes, não prometer anonimato absoluto contra infraestrutura.
- Um listener privado apenas na Fofoca identifica mensagens próprias entre sessões/dispositivos da mesma conta; pool/cache/pausa existentes. Sem usar o sessionStorage legado como prova de autoria; reset da memória ao trocar sessão evita atribuição ao usuário seguinte.
- Mensagens anteriores não tinham autoria verificável: preservadas sem botão apagar, sem backfill ou inferência. Na limpeza futura remover tanto mensagens de teste quanto comprovantes privados associados; checkpoint descobre subcoleções mesmo sem documento pai.

## Tarefas sem aprovação (30/10/2026)
- Cada membro registra a PRÓPRIA tarefa e ganha pontos imediatamente, usando os quatro valores fixos da tabela (louça5, lixo5, cozinhar10, gelo/bebida3). Sem Aprovar/Recusar, solicitação ou fila. `tasks` novos já nascem status ok.
- `submitTask` grava tarefa e `points/task_<id>` na mesma transação, com mesmos who/d/why/at/createdAt e kind aux. Regras permitem ao membro criar somente esse ponto vinculado a uma tarefa nova própria, nunca pontos arbitrários/duplicados, nem tarefa sem ponto enquanto placar aberto.
- ADMs veem todas as tarefas na aba Placar e Excluir com confirmação; `deleteTask` retira tarefa e ponto correspondente juntos. Só ADM pode excluir. Após encerramento do placar, exclusão fica bloqueada para preservar a classificação congelada. Novas tarefas continuam registráveis após fechamento, sem gerar pontos ou prometer pontuação na interface.
- Bruno confirmou explicitamente manter as duas tarefas antigas de teste do Nanu SEM PONTOS. Preservadas sem conversão e fora da nova lista de registradas; não executar a migração privada. Nenhum teste foi apagado; continuam cobertos pela seleção de limpeza futura.

## Correção do valor da locação (30/10/2026)
- Bruno corrigiu o valor real para **R$3.000**, pago por Pig e dividido pelos14. Substitui todas as referências históricas a R$2.640 abaixo. Orçamento permanece R$14.000.
- Atualizar o lançamento existente `expenses/rental-2026`, mantendo autoria/data original e rateio, com nova versão, evento financeiro antes/depois e incremento do controle. Não criar gasto duplicado.
- Na futura limpeza, preservar a locação com o VALOR ATUAL; a base limpa privada antiga com R$2.640 é histórica e não deve sobrescrever esta correção. Checkpoints originais permanecem imutáveis.

Documento de contexto para o próximo agente (Codex). Leia tudo antes de mexer no código.

## 1. O projeto

O **Congresso Monogâmico** é uma viagem recorrente entre amigos, de quarta à noite até domingo no começo da tarde, e a próxima é a 16ª ("XVI"). O app é um web app (PWA) que cada participante instala na tela inicial do iPhone. Ele precisa oferecer:

- **Login individual:** cada congressista tem o seu.
- **Programação de quarta a domingo:** próxima sessão, contagem regressiva e se ela exige preparação.
- **Divisão de gastos estilo Splitwise:** quem pagou o quê, saldos e "quem paga quem" com o mínimo de transferências.
- **Orçamento do congresso:** total e por categoria.
- **Perfil ADM** para os organizadores.
- **Placar individual de pontos:** jogos e brincadeiras somam; tarefas de auxílio (lavar louça, tirar o lixo) somam; infrações (lixo no chão, louça suja pela casa) tiram.
- **Mural da Vergonha:** denúncias de quem desrespeitar "as regras da monogamia". O Tribunal julga e o condenado perde pontos.
- **Queridômetro estilo BBB:** toda manhã, cada um dá um emoji para cada congressista. É anônimo: só se mostra quantos emojis cada pessoa recebeu, nunca quem deu. Os emojis são ❤️ 💔 🐍 🤮 🧳 🍪 🤥 🎯. A planta 🌱 foi removida a pedido.
- **Chat anônimo** para fofocas ("alguém não deu descarga", "quem tomou minha skol beats").

O humor fica implícito; o app deve parecer profissional.

**Dono do projeto:** Bruno (GitHub `9brunosoares`). Organizadores e ADMs: **Bruno, Igor e Pig**.

## 2. Estado atual: Firebase integrado, sem build do front-end

- Front-end estático no GitHub Pages. `index.html` contém os estilos e a abertura; `app.js` contém a interface; `backend.js` usa os módulos oficiais do SDK Web 13.1.0 por CDN.
- `roster.js` é a fonte da lista `PEOPLE`: 14 IDs/apelidos, fotos e os três ADMs oficiais.
- `firebase-config.js` contém somente a configuração Web pública. Nenhuma senha, PIN ou credencial administrativa deve entrar no repositório.
- Projeto Firebase `congresso-monogamico`, banco `(default)` Standard, região `southamerica-east1`, faixa gratuita. Authentication Email/Password ativado.
- **Login real:** foto + PIN de 6 dígitos. Primeiro acesso cria a conta `<id>@congresso.app`, vincula o `uid` ao perfil previamente cadastrado e cria `admins/{uid}` somente para Bruno, Igor e Pig. O vínculo não pode ser transferido por clientes. Sessão persistida pelo Firebase Auth; PIN não é salvo no código nem no estado do app.
- O primeiro registro reserva o apelido. Este fluxo foi escolhido para o grupo de amigos; não é uma verificação externa de identidade. Não generalizar esse cadastro para um serviço aberto sem convite/verificação.
- **Dados compartilhados:** Firestore com `onSnapshot`, escritas por documento e transações para julgamentos e votação; sem sincronizar o objeto inteiro nem importar automaticamente o antigo `localStorage`.
- **Coleções operacionais começam vazias:** pontos, gastos, tarefas, denúncias, mensagens e votos. `agenda-data.js` preserva apenas a programação provisória de 18 a 22/11/2026; orçamento inicial provisório R$ 12.000.
- Relógio real por padrão. Somente ADM vê a alternância para demonstração; a votação sempre usa a data real de São Paulo.
- Fotos externas em `img/<id>.jpg`, com inicial se o arquivo não carregar. Sem base64.

### Participantes (`PEOPLE`, lista oficial do XVI Congresso)

Usar apenas `nick` (apelido); não há campo de nome completo. O `id` é o apelido em minúsculas e sem acento.

| id | Apelido | Foto | ADM |
|---|---|---|---|
| bruno | Bruno | `img/bruno.jpg` | sim |
| ob | OB | `img/ob.jpg` |  |
| luan | Luan | `img/luan.jpg` |  |
| igor | Igor | `img/igor.jpg` | sim |
| pig | Pig | `img/pig.jpg` | sim |
| pelado | Pelado | `img/pelado.jpg` |  |
| gherardi | Gherardi | `img/gherardi.jpg` |  |
| nanu | Nanu | `img/nanu.jpg` |  |
| sadano | Sadano | `img/sadano.jpg` |  |
| ibrahim | Ibrahim | `img/ibrahim.jpg` |  |
| cadu | Cadu | `img/cadu.jpg` |  |
| diogo | Diogo | `img/diogo.jpg` |  |
| felipe | Felipe | `img/felipe.jpg` |  |

### Modelo do Firestore

- `people/{id}`: `{nick, photo, uid:null|string, admin:bool}`. Cadastro feito administrativamente; cliente só pode vincular o próprio `uid` uma vez.
- `admins/{uid}`: `{id}`. Criado na mesma transação do primeiro vínculo, validado contra o perfil oficial. Sem autopromoção nem promoção local.
- `settings/main`: `{budget}`.
- `agenda/{id}`: `{d,t,title,place,pts,prep,note,start,end}`.
- `points/{id}`: `{who,d,why,kind,at,createdAt}`. Escrita somente ADM.
- `expenses/{id}`: `{title,cat,amount,payer,split,at,createdAt}`. Participantes criam; ADM edita/exclui.
- `tasks/{id}`: `{who,d,why,status,at,createdAt}`. Participante pede aprovação da própria tarefa; ADM aprova/recusa. Aprovação gera `points/task_<id>` na mesma transação.
- `cases/{id}`: `{who,by,what,status,at,createdAt}`. ADM condena com `points/case_<id>` e `-15` na mesma transação; absolvição remove a denúncia. Repetições são recusadas.
- `chat/{id}`: **somente** `{text,createdAt}`, sem autor/uid. As últimas 100 mensagens aparecem em tempo real. Marcação de mensagem própria fica apenas em `sessionStorage` do remetente.
- `querido/{diaSP}`: `{counts:{[id]:number},voters:int}`, com os 14 IDs oficiais. Cada número guarda oito contadores em dígitos de base 16, na ordem de `EMOJIS`: `1,16,256,...,268435456`. Um voto soma exatamente uma dessas potências por alvo, exceto o próprio. Há no máximo 13 recebimentos por alvo, portanto nenhum dígito ultrapassa 13 nem transfere para o seguinte. `decodeTally()` reconstrói os totais. A validação do delta exige valor numericamente inteiro e mantém o limite de avaliação do Firestore. Não guarda ordem, escolhas individuais nem ligação ao votante.
- `querido/{diaSP}/voters/{uid}`: **somente** `{voted:true}`. Só o próprio usuário lê o marcador; não há listagem. Contadores e marcador são gravados atomicamente em `writeBatch` (dois documentos), com `increment()` calculado pelo servidor. Não usar contagens lidas no cliente: votos concorrentes precisam comutar. Contagem +1 para cada um dos outros 13 participantes, sem voto próprio, uma vez ao dia.
- `diaSP = floor((epochMillis - 10800000)/86400000)`, validado contra o relógio do servidor nas regras. Não depende do relógio de demonstração.
- O objeto `S` é apenas uma projeção em memória do Firestore. `localStorage` guarda só a aba de navegação; o Firebase Auth cuida da sessão.
- `firestore.rules` valida autenticação, papéis, tipos, campos permitidos, tamanhos, listas oficiais e transições. Regras são um protótipo validado para este grupo; reavaliar antes de ampliar o público.

### Constantes no código
- `AGENDA`: sessões com `d` (dia), `t` (hora), `title`, `place`, `pts?`, `prep?` (o que preparar) e `note?`.
- `RULES`: tabela de pontos. Soma: louça +5, lixo +5, cozinhar +10, repor gelo +3, jogos +10 a +20. Tira: lixo no chão −5, louça suja −5, atraso −3, sem look temático −5, infração da monogamia −15.
- `CATS`: categorias de gasto com orçamento (casa, mercado, bebida, transporte, atividades).
- `EMOJIS`: os 8 emojis do queridômetro.
- `settle()`: algoritmo guloso que casa devedores e credores para reduzir transferências; não garante mínimo global.

### Navegação (barra inferior, 6 abas)
Início · Agenda · Placar · Queridômetro · Contas · Fofoca. Fofoca contém somente o chat anônimo. O Mural da Vergonha é uma tela auxiliar, acessada pelo destaque na home apenas quando há condenados. O julgamento de pendentes fica no painel ADM. **Seis é o limite** do que cabe no iPhone; se entrar outra seção grande, reorganize o menu.

## 3. Identidade visual (aprovada, não mudar sem o Bruno pedir)

A versão aprovada é a **"vermelha"**. Outras foram testadas e descartadas: caderno pautado, a identidade de um convite "save the date" e uma institucional verde chamada "plenário".

- **Fontes (Google Fonts):** Bricolage Grotesque nos títulos, Figtree no texto e JetBrains Mono nos números.
- **Tokens no `:root`:** `--bg #ecebf2`, `--surface #fff`, `--ink #1b1530`, `--muted #686280`, `--seal #c4122f` (vermelho-lacre, o acento), `--brass #a77f12` (dourado do líder), além de `--good` e `--bad`.
- **Modo escuro** completo via `prefers-color-scheme`, com os mesmos tokens redefinidos.
- **Motivo:** crachá de congresso e lacre vermelho. O card "Próxima sessão" é escuro, com contagem regressiva e caixa de preparação em vermelho.
- **Ícone:** selo vermelho com borda serrilhada, "XVI" no centro e "CONGRESSO" embaixo (`icon-*.png`, `apple-touch-icon.png`).
- **Correção já aplicada:** a classe decorativa do lacre se chama `.sealmark`. O nome antigo, `.seal`, colidia com `.btn.seal` e jogava o botão principal para fora da tela.

## 4. Arquivos entregues

- `index.html`: estilos e abertura do app, com as meta tags de PWA e iOS (`apple-mobile-web-app-*`, manifest, `theme-color` claro e escuro).
- `manifest.webmanifest`: nome "XVI Congresso Monogâmico", nome curto "Congresso", `display: standalone`.
- `icon-1024.png`, `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180) e `favicon.png`.
- `robots.txt` (`Disallow: /`) e a meta `noindex`: o Bruno quer o site público, mas fora dos buscadores.
- `img/*.jpg`: fotos dos 14 participantes. Bruno, Sadano, Felipe, Ibrahim e Kirk usam as capturas originais recebidas, enquadradas pelo campo `frame: [largura, altura, x, y, lado]` de `PEOPLE` e pelo CSS do avatar; apenas o retrato circular fica visível. As demais fotos têm 160×160. Fotos ausentes continuam mostrando a inicial.

## 5. Repositório e hospedagem

- O repositório **`9brunosoares/congresso-monogamico`** existe, é público e **contém o protótipo na branch `main`**.
- A hospedagem está configurada no **GitHub Pages**, a partir da branch `main` e da pasta raiz. A URL esperada é `https://9brunosoares.github.io/congresso-monogamico/`.
- No iPhone, o app é instalado pelo Safari: Compartilhar → Adicionar à Tela de Início.

## 6. Operação e próximos passos

- Configuração local: `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`.
- Instalar ferramentas de desenvolvimento: `pnpm install`. O site não precisa de build e não depende de Node em produção.
- `node scripts/setup-firebase.cjs`: inicialização idempotente com a sessão existente do Firebase CLI; não sobrescreve perfis/agenda/orçamento já existentes. Faz cópia local das regras anteriores em `.private/` e valida as novas pelo tooling MCP oficial incluído no Firebase CLI.
- Publicar regras: `npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes,auth --project congresso-monogamico --non-interactive`.
- Atualizar a agenda aprovada: `node scripts/sync-agenda.cjs --apply` substitui somente a coleção `agenda` a partir de `agenda-data.js`, com backup em `.private/`. Sem `--apply`, apenas mostra as quantidades. Não usar sem pedido explícito para substituir a programação.
- Publicar front-end: commit/push em `main`; GitHub Pages usa a raiz. Domínio `9brunosoares.github.io` autorizado no Firebase Auth.
- Testes locais (sete cenários): `node --test tests/*.test.js`. Diagnóstico de regras sem gravações: `node scripts/test-rules.cjs` (nove cenários com data e documentos simulados, usando o texto exato das regras; complementado pelo teste real do backend).
- Teste integrado: `node scripts/verify-firebase.cjs`. **Somente antes de os apelidos Bruno, OB e Luan terem sido cadastrados por pessoas reais**: recusa perfis/contas já usados. Cria contas e registros temporários, usa o backend real em sessões separadas, verifica permissões e limpa somente seus próprios dados no `finally`. Não executar sobre votos reais do dia.
- Scripts administrativos usam a autenticação local do CLI em memória; não geram chaves de serviço nem imprimem tokens. `.private/`, logs, `.env*` e `node_modules/` estão ignorados pelo Git.
- Datas confirmadas: chegada quarta à noite, 18/11/2026; quinta de home office na casa; feriado sexta 20/11; retorno domingo 22/11 no começo da tarde. Bruno corrigiu explicitamente a informação desatualizada de chegada em 19/11: NÃO mover a chegada para quinta.
- Programação provisória: quinta pizza e jogos de tabuleiro; sexta circuito e Quiz dos especialistas; sábado guerra de bexiga e lona, mais retrospectiva individual com objeto pessoal à noite; domingo Oscar do Congresso e volta para São Paulo.
- Café da manhã, almoço e janta cadastrados nos cinco dias. Quarta café/almoço antes da chegada; domingo almoço na casa e janta após o retorno. Horários são sugestões: chegada 20h e saída 14h representam noite/começo da tarde, sem confirmação da hora exata.
- Orçamento estimado aprovado: R$14.000 (R$1.000 por cada um dos 14, incluindo ADMs). Locação real R$2.640 paga por Pig, dividida por todos. Não inventar outros valores ou horários confirmados.
- Fase de testes até a divulgação perto da viagem: Bruno pode pedir limpeza. Não apagar registros agora nem automaticamente; quando solicitado, manter contas/PINs e programação salvo pedido diferente. Chat e votos não podem ser filtrados por autor, pois são anônimos; limpar essas áreas por dia ou integralmente, conforme o pedido.
- FCM/notificações são opcionais e não foram ativadas.
- Anonimato: o app não guarda autor nas mensagens nem ligação entre votante e emojis. Não prometer sigilo absoluto contra administradores de infraestrutura, que podem alterar código/regras e observar tráfego/eventos.

## Atualização da lista oficial

- 14 participantes; ADMs: Bruno, Igor e Pig. Usar somente apelidos em todas as telas.
- Migração Firebase: os registros locais antigos não são enviados ao banco. O app usa apenas os 14 IDs oficiais de `roster.js`.
- Fotos antigas dos participantes que saíram foram removidas; não há fotos em base64.

## 7. Como trabalhar com o Bruno

- Português do Brasil, direto, sem enrolação nem preâmbulo. Ele prefere franqueza a concordância.
- Ele tem olho apurado para língua e estética: revise acentuação e concordância nos textos do app.
- Evite aberturas como "claro, aqui está" e expressões como "sem frescura".
- Mostre versões navegáveis cedo e itere a partir do retorno dele.

## Ajustes de votação e home (29/10/2026)
- Login pergunta “Quem é você?” e não exibe selo ADM nos perfis antes de autenticar.
- Home: botão destacado Fazer denúncia; Ver mural da vergonha sempre que houver qualquer caso, pendente ou julgado.
- Loading em CSS: duas alianças se aproximam e cadeado fecha. Sem imagens extras; respeita redução de movimento.
- Queridômetro SOMENTE de 19 a 22/11/2026, 00h <= hora < 12h de São Paulo, validado em request.time. Demonstração não altera votação.
- Cada voto grava atomicamente o total, marcador privado e `participation/{diaSP}/people/{apelido}` com somente `{voted:true}`. Participantes podem ler a entrega, nunca escolhas por autor. Clientes não podem editar/apagar comprovantes ou marcar outra pessoa.
- Participação só é consultada para dias cujo prazo já passou; não consultar dias futuros. O placar só deriva a penalidade após attendanceReady confirmar o carregamento do dia. `missedVotePoints()` deriva −5 por pessoa/dia após o meio-dia, sem depender de abrir o app no prazo e sem gravações repetidas. Computado em todos os placares e histórico. Não lançar também points manuais pelo mesmo motivo.
- Antes da viagem não há penalidade nem voto de teste. Limpeza futura precisa incluir participation nos dias correspondentes, para manter consistência.

## Instalação e animação aprovadas (29/10/2026)
- `install.js` é a entrada local e leve. Navegador comum mostra tutorial de quatro passos na identidade vermelha, com escolha iPhone/iPad ou Android. Desktop orienta a abrir no celular.
- Somente `(display-mode: standalone)` ou `navigator.standalone === true` inicia `app.js` por import dinâmico. Não há botão “continuar no navegador” ou parâmetro de URL para pular o tutorial. Não é uma fronteira de autenticação/segurança; Firebase continua validando o acesso.
- SDK Firebase, sessão e listeners só iniciam quando o app é aberto como aplicativo; abrir o tutorial não busca dados do congresso.
- iOS: Safari → Compartilhar → Adicionar à Tela de Início → Abrir como App da Web, quando disponível. Android: Chrome → menu → Instalar aplicativo/Adicionar à tela inicial. Botão nativo Instalar Congresso aparece somente quando o navegador oferece beforeinstallprompt; confirmar instalação não libera a aba comum.
- Animação final: dois anéis diagonais com pedras, cadeado vermelho mais abaixo e à esquerda, fechadura, haste reta elevada com brecha só à direita. Lado esquerdo sempre conectado. Movimento de encaixe mantido; sem arquivos de imagem adicionais, respeita redução de movimento.
- `app.js` foi extraído do módulo inline sem alterar fluxos/dados; loader aparece na abertura e pequeno nos botões de envio. Referências de módulos versionadas para evitar mistura de cache de versões.
- Testes: `node --test tests/*.test.js` (12 cenários; inclui detecção iPad, navegador bloqueado, modo app liberado, instruções e instalação sem bypass). Verificação visual no navegador em largura de 390px.

### Tutorial simplificado
- A pedido do Bruno, tela do navegador reduzida a “Você está no navegador.”, instrução de instalação e três passos curtos. Sem crachá, slogan, fotos, simulação de tela inicial ou textos longos. Mantém vermelho, tipografia, escolha iOS/Android e regra de abrir o login somente pelo ícone.

- Menu atualizado: Agenda e Queridômetro (Queri / dômetro em duas linhas, sem hífen visual); nome acessível inteiro no botão. Área de texto com altura uniforme para manter os seis ícones alinhados.

- Ajuste fino do menu: coração com 20px (demais 24px), margem de 2px para alinhar centros; removida altura mínima extra dos rótulos, linhas de 11px e padding vertical dos botões de 4px. Preservada safe area do iPhone.

- Agenda: swipe horizontal sobre as atividades troca o dia (esquerda avança, direita volta), sem circular nos extremos. Rolagem vertical e gestos nas bordas preservados; seletor superior mantém rolagem horizontal própria e acompanha o dia selecionado. Implementação em agenda-gesture.js.

## Denúncias com foto e mural limpo
- Home exibe Ver mural da vergonha somente se houver cases com status ok. Pendentes ficam no perfil ADM → Julgar denúncias. Fofoca só mostra Chat anônimo; removido o seletor Mural/Chat e o texto explicativo longo.
- Mural público contém apenas condenados: foto anexada (se houver), título, apelido e −15. Sem foto anexa usa avatar oficial. Sem regimento longo nem denúncias pendentes.
- Removidos o rodapé “Programação e orçamento provisórios...” e o aviso “Programação provisória de 18 a 22...” da agenda; os dados continuam provisórios, não confundir remoção do aviso com confirmação de horários/orçamento.
- cases: campos antigos + hasPhoto bool opcional (legados sem campo continuam válidos). Cliente cria pend; só ADM condena/absolve. Leitura de pendentes somente ADM; membros consultam cases com where(status == ok). O backend obtém papel antes de criar o listener correspondente.
- casePhotos/{caseId}: somente dataUrl JPEG base64, até 180000 caracteres (~135 KB). Documento separado, sem índice nesse campo. Nenhuma foto embutida no HTML. Usa Firestore já configurado; sem ativar Storage/Blaze.
- report-photo.js reduz fotos para até 960px e ajusta qualidade/dimensão antes de enviar; canvas retira metadados. Originais de até 20 MB; imagens não suportadas recebem erro claro. Anexo opcional, prévia e botão Remover foto.
- Denúncia e foto são criadas atomicamente em batch. As regras exigem autoria, schema, limite e referência cruzada; foto não pode ser anexada avulsa nem alterada. Foto pendente só ADM lê, condenada só membros. Absolvição remove também foto.
- Limpeza futura de testes deve incluir casePhotos dos casos removidos. Não apagar registros reais ao testar.
- Verificação atual: 16 testes locais; 30 cenários simulados do texto exato das regras no serviço oficial; prévia do navegador com backend em memória verificou anexar/comprimir foto, pendente fora do mural, julgar no painel e publicar no mural com imagem. Sem contas reais ou gravações de teste na produção.

## Revisão de consumo do Firestore (29/10/2026)
- Mantido Spark/Standard e Firestore existente. Não habilitar Blaze ou novos serviços sem pedido; esta revisão não apagou/migrou registros, não alterou PINs e não criou somatórios novos no servidor.
- Cache oficial persistente: initializeFirestore + persistentLocalCache + persistentMultipleTabManager, limite local alvo 40 MiB; fallback de memória para ambientes sem IndexedDB. Ajuda nas reconexões, mas não elimina cobrança de novas consultas ou reconexões prolongadas (>30min conforme documentação). Não prometer funcionamento offline completo: o shell do site não tem service worker.
- data-sync.js mantém consultas comuns sem duplicação por render ou timer. Na home só pontos, despesas, orçamento, agenda e existência de condenado (query limit1), mais votação/participação apenas quando as datas exigem.
- Pontos e despesas são lidos integralmente para manter o placar, todos os saldos e o rateio exatos. Não aplicar limit nesses ledgers sem criar uma solução consistente de agregação/migração. Cache persiste registros entre aberturas; histórico crescente ainda tem custo em partidas frias.
- Chat sincroniza só em Fofoca: 50 recentes, com cursor startAfter para Ver mensagens anteriores; histórico não foi apagado. Tarefas só em Placar, filtradas por pendentes (ADM) ou próprio participante.
- Mural: 12 condenações recentes, índice cases(status ASC,createdAt DESC), cursor para Ver mais; Tribunal sincroniza pendentes somente enquanto aberto. Perfil ADM mantém Julgar denúncias sem contador que exigiria consulta permanente.
- Fotos mantidas opcionais e compactadas; nenhuma é carregada na home/chat. IntersectionObserver solicita somente imagens visíveis/próximas no Mural/Tribunal. Busca única (sem listener por foto imutável), deduplicação simultânea, cache do SDK antes de rede, até 24 imagens em memória e até duas buscas em paralelo. Erro não causa loop; botão de nova tentativa.
- App em segundo plano por 60s interrompe listeners; retorno reconecta uma vez e conserva dados em memória/cache. Regras/permissões continuam iguais.
- Não consulta queridômetro fora de 19–22/11; resultado agregado só na tela Queridômetro, marcador próprio nos dias de votação. Participação só após cada prazo, para evitar leituras de dias futuros e penalidades antes de carregar o comprovante. Voto usa batch com transformações e regras existentes; retirado getDoc extra antes de todo voto, mantendo rechecagem no erro de duplicidade.
- resource-exhausted interrompe listeners e bloqueia novos envios até tentativa manual; mensagem clara e registros preservados. Não há polling de consumo no app ou tentativas automáticas agressivas. Nenhum orçamento de nuvem/cap de gastos foi configurado.
- Proteção de envio duplicado conserva trava por ação mesmo se uma atualização reconstruir o botão. Orçamento zero exibe estado correto, sem NaN/Infinity.
- scripts/audit-usage.cjs é somente leitura: contagens por coleção, prova de disponibilidade do índice e métricas Monitoring das últimas24h. São métricas aproximadas; essa janela não é o dia de quota do Pacífico. Null é indisponível, nunca presumir zero. Não há automação recorrente.
- Verificação: 23 testes locais, incluindo backend real com SDK simulado contando consultas, páginas com cursor, cache/deduplicação de fotos, pausa/resume, erro de quota e datas de participação. SDK13.1.0 real carrega no navegador sem erros. Não executar verify-firebase.cjs sobre contas reais; o teste destrutivo continua apenas para ambiente ainda não usado. As regras não mudaram nesta revisão; índice novo deve estar pronto antes de publicar.

## Contas, Pix e correção das datas (29/10/2026)
- Esta seção substitui referências históricas a orçamento R$12.000 e limites fictícios por categoria. Orçamento R$14.000 visível a todos; só ADM altera. Categoria mostra gasto real, sem inventar limites individuais.
- `finance.js`: cálculo em centavos inteiros; restos de um centavo distribuídos deterministicamente pelo ID do gasto e ordem oficial do roster. Não mudar essa convenção sem migração, pois alteraria rateios existentes. Todos os centavos são preservados; sugestões de transferência zeram o saldo matemático do ledger. Novos lançamentos recusam mais de duas casas decimais.
- expenses: campos anteriores + `amountCents` e `by` (apelido de quem lançou). O backend novo sempre os grava; regras aceitam esquema anterior para clientes em cache, validam consistência dos centavos e autoria quando presente, e impedem alteração de by. Leitura de registros anteriores converte amount para centavos. Isso não é uma trilha de auditoria completa.
- `pixKeys/{id}`: somente `{type,value}`. Tipos aleatoria/cpf/telefone/email; até77 caracteres e validação de formato; CPF tem dígitos verificados no cliente. Titular cadastra/edita/remove; nem ADM altera chave alheia. Membros leem as chaves por pedido explícito de compartilhamento do Bruno. Sem nomes completos, contas bancárias ou credenciais. Não valida existência da chave/titular no banco.
- Pix só sincroniza em Contas; Minha chave Pix abre formulário. Quem paga quem oferece consulta e cópia da chave do destinatário. Mostrar aviso para conferir destinatário no banco. Não envia Pix e NÃO registra pagamento bancário/reembolso já realizado.
- Não afirmar equivalência completa com Splitwise: ainda faltam registro de quitações, histórico de alterações e rateio desigual/múltiplos pagadores num lançamento. Recomendar manter Splitwise durante o piloto.
- `scripts/update-trip-finance.cjs`: sem --apply consulta apenas; com --apply faz backup privado e atualização idempotente. Locação única expenses/rental-2026, Pig pagador, R$2640/14; orçamento14000; altera só duas sessões de domingo (retorno14h, almoço na casa), preservando quarta, quinta e demais registros de uso. Recusa possível locação duplicada. Não usar sync-agenda para esta alteração parcial.
- Validação: 30 testes locais (incluindo mil cenários de rateio e acerto em centavos) e 56 cenários do texto exato das regras no serviço oficial. Testes não criaram contas nem registros de uso na produção.

## Pagamentos, histórico e encerramento (30/10/2026 — substitui limitações anteriores)
- Pagamentos entre participantes podem ser lançados desde já. Membro registra/edita/cancela pagamentos enviados ou recebidos por ele; ADM pode registrar para quaisquer dois participantes. As regras validam envolvimento e papel no servidor, sem texto de permissões na interface. Pagamento é declaração de quem pagou/recebeu, sem consulta bancária ou segunda aprovação obrigatória.
- `payments/{id}`: from/to oficiais distintos, amountCents inteiro positivo, kind payment|settlement, settlementId (vazio ou t0..t12), paidOn YYYY-MM-DD até hoje SP, note<=200, by, at, createdAt, status active|cancelled, version, updatedAt, updatedBy. Soma crédito de quem enviou e reduz o de quem recebeu. Não soma ao total de gastos/orçamento. Pagamento cancelado deixa de afetar saldo.
- Gastos podem ser abertos ao tocar na linha: valor, categoria, pagador, autor conhecido, data e rateio exato por pessoa. Autor ou ADM edita/cancela antes do fechamento. Cancelamento mantém documento e histórico; não excluir fisicamente.
- Expenses exigem amountCents, by e metadados de versão. by vazio só representa autoria antiga desconhecida na migração; cliente novo sempre vincula seu próprio apelido. settings/main agora contém budget,version,updatedAt,updatedBy.
- `financeHistory/{tipo_id_versao}` é imutável: type expense|payment|budget|closing, recordId, version, action create|update|cancel (baseline somente via migração), by, before, after, createdAt. Antes/depois são cópias completas exatas da mesma transação; regras recusam alteração sem evento e evento sem alteração correspondente. Não se recupera um histórico anterior que nunca foi guardado.
- `financeControl/main`: revision,closed,lastEvent. Toda alteração financeira incrementa revisão e aponta para seu evento atômico. Isso evita fechar contas com uma fotografia inconsistente enquanto alguém lança/altera registros. Confirmação final tem ID determinístico; confirmações simultâneas não duplicam pagamentos. Edições usam versão esperada e recusam sobrescrita de formulário antigo.
- Apenas ADM vê Encerrar contas a partir de 22/11/2026 00h SP; regra usa request.time, sem relógio demo. O modal avisa que bloqueará gastos e alterações. Encerramento lê fontes do servidor, calcula saldos com todos os pagamentos anteriores e só confirma se a revisão global não mudou. Não há reabertura pela interface.
- `financeClosings/main`: budget,expenseTotalCents,transfers:{from:[],to:[],amountCents:[]},version:1,updatedAt/By,closedAt/By. Três listas paralelas, mesmo tamanho 0..13, IDs oficiais, valores inteiros positivos; validadas integralmente. Formato em colunas reduz avaliação das regras para caber no limite de1000 expressões. `transferRows()` converte para linhas id t0..t12. Snapshot e evento de fechamento imutáveis.
- Após fechamento: gastos, ajustes de orçamento e pagamentos manuais ficam bloqueados no backend. Todos consultam Acerto final. Pagador, recebedor ou ADM confirma cada transferência; grava payments/final_tN correspondente EXATAMENTE ao par/valor do relatório. Uma confirmação basta. Pode cancelar confirmação e reconfirmar no mesmo documento com versões sucessivas. Não recalcular a lista final a cada quitação: marcar as linhas originais como pagas.
- Copiar relatório gera texto curto de WhatsApp com quem paga quem, valores, Pix atual do recebedor quando cadastrado e marca ✓ pago. Pix continua editável após fechar, sem mudar valores ou pares congelados. Histórico preserva todos os dados financeiros; mudanças de chave Pix não são movimentações financeiras.
- Home sincroniza payments e documento único de fechamento para saldos consistentes. Histórico carrega só na tela auxiliar,50 recentes e cursor Ver anteriores; nunca truncar expenses/payments para calcular saldo. Índices de before/after no histórico desativados para reduzir armazenamento.
- `scripts/migrate-finance-history.cjs`: --apply faz backup privado, preserva valores/rateios/datas originais dos gastos, cria snapshots baseline e controle aberto. Não cria pagamentos nem encerra contas. Sem --apply somente consulta; idempotente, recusa migração parcial.
- Verificação: 33 testes locais, incluindo backend real com SDK em memória: pagamentos parciais, edição/cancelamento, histórico, bloqueio após fechamento, mudança durante snapshot, confirmação concorrente e reconfirmação sem duplicidade. Cenários de regras são simulados no serviço oficial; não criar contas, pagamentos ou fechamentos de teste na produção.

## Resultados, encerramento do placar e limpeza (30/10/2026)
- Queridômetro: não mostrar resultados nem contagem de votantes durante a manhã, mesmo após o próprio voto. Leitura do documento de totais e da participação nas regras só após12h SP do dia correspondente; inclusive ADMs no app. Marcador próprio continua legível para evitar duplicação; batch de incrementos e validações atômicas permanecem.
- resultDay() libera o dia corrente após12h; durante manhã não revela nada do dia; depois do congresso mantém o último resultado. Backend só abre listener de resultados quando liberado. Ao fechar a janela, timer local reavalia consultas sem polling adicional. Erros e UI no último dia: “Esta foi a última votação do congresso.”, sem promessa de amanhã.
- Encerrar placar é link discreto, somente ADM, na aba Placar. Modal confirma congelamento; não está vinculado à data/fechamento das contas. Não encerrar o placar real ao testar.
- scoreClosures/main: somente closedBy e closedAt (timestamp do servidor); membro lê, ADM cria uma vez, ninguém atualiza/exclui pelo cliente. Regras bloqueiam criar/editar/apagar points após existir fechamento. addPoints lê fechamento em transação para evitar corrida.
- scoringPoints() calcula multas somente até closedAt e considera pontos até esse instante. Encerramento antes do meio-dia de domingo não cria a multa de domingo, mesmo que o app reabra depois. Pontos anteriores ficam imutáveis; não é necessário copiar o ranking para outro documento.
- reviewTask e judgeCase continuam funcionando após encerrar: aprovam/julgam normalmente, mas deixam de criar points. Votos, mural, mensagens, agenda e finanças continuam disponíveis. UI deixa de anunciar penalidade de voto e condenação posterior não anuncia −15.
- Agenda-base agora24 sessões: removidos somente café/almoço de quarta antes da chegada e janta de domingo em São Paulo. Almoço de domingo na casa foi explicitamente mantido pelo Bruno. Chegada quarta/noite e saída domingo/começo da tarde continuam. scripts/trim-agenda.cjs faz apenas essas exclusões com backup privado; não substituir toda a programação para esta limpeza.
- CPF primeiro tipo no formulário Pix; chaves já cadastradas mantêm seu tipo. Categorias acrescentadas: colocacao → “Colocação” (grafia explicitamente confirmada, NÃO corrigir para Locação) e outros → “Outros”. Regras e formulário aceitam ambas; gastos existentes não foram recategorizados.
- notice() padroniza avisos de toast e erros com ponto final, preservando pontuação já presente; texto “Escolha sua foto primeiro.” uniforme entre login/backend. Rótulos e botões não recebem pontuação artificial.
- Testes locais35: inclui resultado oculto mesmo com cache, horário de revelação, último domingo, cutoff de penalidade, CPF/categorias e backend de tarefas/denúncias após encerramento. Testes de regras simulam hora e documentos sem fechar o placar ou votar na produção.

## Checkpoint e autoria dos testes (30/10/2026)
- `node scripts/create-checkpoint.cjs` é somente leitura no Firebase: descobre coleções/subcoleções (inclusive pais ausentes), inclui os caminhos oficiais de votação e faz snapshot com transação readOnly em uma única readTime. Salva em `.private/checkpoints/<instante>/firestore.json`, sha256.txt e analise.json. Valida checksum, unicidade e round-trip dos tipos. Fotos de denúncias e histórico completo estão incluídos; relatório não imprime texto do chat nem valores de Pix.
- `scripts/checkpoint-codec.cjs` preserva Timestamp com nanos, GeoPoint, bytes, referências, listas e mapas sem colisão com campos do usuário. Metadados Auth servem apenas à conferência: não exporta senhas/PINs, hashes ou tokens. Restaurar dados pressupõe preservar as contas Auth; não prometer restaurar PIN apagado usando este checkpoint.
- Checkpoints contêm dados privados: nunca commitar/publicar ou colocar na raiz pública do Pages. Não confundir cópia local privada com backup gerenciado na nuvem. Não houve limpeza/restauração ao criar checkpoint.
- `by` de despesas/pagamentos/denúncias identifica perfil que lançou; `updatedBy` de eventos normais identifica quem alterou. Baseline com by/updatedBy Bruno indica migração administrativa, não autoria original. Pagador de despesa, alvo da denúncia e destinatário de pontos NÃO identificam quem criou. Tasks.who identifica o solicitante (regra exige próprio perfil), mas autor do julgamento antigo não é guardado. Agenda e pontos antigos não guardam criador. Chat não tem autoria; não tentar inferi-la.
- Seleção confirmada por Bruno em 30/10/2026: manter somente locação real paga por Pig e configurações (perfis/PINs/papéis, agenda e orçamento); demais gastos e registros operacionais são testes. NÃO limpar agora: a confirmação definiu a seleção para a futura limpeza, não autorizou executá-la neste momento. Base limpa derivada localmente em .private/checkpoints/base-limpa-aprovada-2026-10-30; checkpoint completo original separado. Ambos privados, sem publicação no Pages/Git.
- Antes da limpeza efetiva, criar novo checkpoint para capturar testes posteriores. Preservar os perfis/PINs/papéis AO VIVO, inclusive cadastros posteriores à cópia; não sobrescrever com identidades antigas do arquivo. Conferir alterações reais de configuração e novos gastos legítimos posteriores. Limpar também fotos vinculadas e histórico financeiro dos testes, mantendo integridade de versões/controle; jamais restaurar automaticamente todo o snapshot sobre registros novos sem revisão.

## Links oficiais (30/10/2026)
- Home: card compacto logo após próxima sessão/atividade atual, sem seção/título extra nem URLs, foto ou senha expostas no card. Abre folha com álbum, playlist, mapa/endereço, Airbnb e Wi-Fi. Campos ausentes ficam Em breve, sem links vazios. Ícones SVG locais, sem imagens ou serviços externos.
- ADMs têm Editar na folha; membros consultam/abrem links e copiam senha. Formulário permite alterar todos os campos; versão evita sobrescrita por dois ADMs. Edição funciona mesmo com contas/placar encerrados; não mistura com histórico financeiro.
- officialLinks/main: albumUrl,playlistUrl,mapUrl,airbnbUrl (HTTPS ou vazio, até2000), address<=300, wifiName<=80, wifiPassword<=120 (preservar espaços da senha), version int,updatedAt timestamp servidor,updatedBy apelido. Leitura só membros; criar/editar só ADM; sem exclusão por clientes. Listener de um documento somente na home, reaproveita cache/pool existente.
- Links reais, tokens colaborativos e senha ficam somente no Firestore autenticado; nunca colocar o convite do Spotify no JS público ou script versionado. Playlist mantém parâmetro pt do convite fornecido. Airbnb aponta para o anúncio sem query antiga check_in=2025; rua/endereço não foi inventado a partir do link curto. Álbum e Wi-Fi aguardam preenchimento pelos ADMs.
- Este documento é CONFIGURAÇÃO REAL e deve ser preservado na futura limpeza dos testes, inclusive alterações posteriores dos ADMs. Checkpoints novos descobrem automaticamente a coleção; base antiga anterior à criação não deve apagá-la.
- Validação: 38 testes locais e97 cenários do texto das regras; prévia isolada em navegador validou home compacta, abrir atalhos, editar/salvar e visualizar Wi-Fi de teste. Nenhuma senha real ou dado de teste foi enviado à produção.

## Reações no Mural (30/10/2026)
- Revisão da UX: card mostra só as contagens positivas e pequeno ícone carinha+ no canto inferior direito. Tocar ou segurar420ms abre seletor flutuante acima com cinco emojis. Mesma opção retira; clique fora/Escape fecha; rolagem cancela pressão. Seletor preservado nas atualizações da tela, sem tocar/segurar na foto ou disparar ao rolar.
- Backend usa `setCaseReaction(id,emoji|null)` com escolha explícita idempotente, em vez de alternar conforme o valor lido no servidor; repetir envio não remove a reação. Transação preserva outros membros, falha libera estado de envio para tentar novamente. Sem mudança de esquema/regras nem migração dos votos existentes.
- Cada publicação condenada mostra cinco reações: 😂 😱 🤦 👏 ❤️, com contagem e destaque da própria escolha. Uma por pessoa/publicação; tocar na selecionada retira, outra troca. Não altera pontos nem depende dos fechamentos financeiro/placar.
- `caseReactions/{caseId}`: somente `{votes:{apelido:emoji}}`, até14 entradas oficiais. Não são anônimas no armazenamento; a interface exibe somente totais e a própria seleção. Clientes só leem documentos individuais de casos condenados e só alteram a própria entrada; nem ADM altera a dos outros. Sem listagem/exclusão pelo cliente, sem contadores duplicados.
- Transação lê o caso e o mapa atual para preservar reações concorrentes de outras pessoas. Remover última reação deixa mapa vazio. Não colocar reações no documento de foto nem na coleção de pontos.
- Listener de um documento pequeno por publicação carregada, somente enquanto no mural; usa pool/cache/pausa existentes e acompanha paginação. Nada de reações é consultado na home/chat/Tribunal. Novos documentos são criados só ao reagir, sem migração ou publicações fictícias.
- Na futura limpeza, remover reações dos casos de teste junto com esses casos; checkpoint descobre a coleção automaticamente. Preservar locação corrigida para R$3.000 e configurações reais.

## Agenda e avisos (05/11/2026)
- travel.js adiciona saídas personalizadas por período, sem inventar hora e sem remover sessões anteriores. Igor/Pig/Pelado e Nanu/Cadu/OB/Diogo quarta à noite; Bruno/Ibrahim quinta à noite; Felipe/Gherardi/Luan sexta de manhã. Sadano sozinho e Kirk sem atribuição não têm saída. Volta não definida.
- Login em duas etapas, seleção ocultada durante PIN; Voltar discreto.
- Chat abre no fim e acompanha novas mensagens somente quando perto do fim; leitura local por perfil e dispositivo. Consulta adicional limitada a última mensagem; pendência ADM consulta apenas um caso pendente. Pontos não lidos não revelam autoria.
- Votação 06h<=hora<12h São Paulo no cliente e regras. Indicador piscante só durante janela e depois do marcador próprio carregar.
- Participantes continuam apenas com tarefas positivas próprias; infração mostra Procure um adm. ADMs mantêm permissões. Tarefas abaixo da classificação; tabela removida.

## Atualização oficial: 13 congressistas (05/11/2026)
- Kirk não participa; removido do roster e das permissões, sem apagar históricos financeiros. Orçamento confirmado R$13.000; locação R$3.000/Pig passa ao rateio13. Migração administrativa com checkpoint e eventos antes/depois, sem apagar testes ou pagamentos.
- Agenda por perfil oculta dias e eventos anteriores à saída; noite20h/manhã08h. Sadano desde quarta por falta de data. Home conta até a saída personalizada.
- Queridômetro19: Igor, Pig, Pelado, Nanu, Cadu, OB, Diogo e Sadano. Oito votantes, sete alvos cada. Bruno/Ibrahim e Felipe/Gherardi/Luan excluídos de escolhas, envio e multas nesse dia. De20 em diante13 votantes/12alvos. Resultados19 mostram somente elegíveis, inclusive para observadores. Regras validam deltas zero nos alvos ausentes e recusam votante ausente.

## Textos e Pix no pagamento (05/11/2026)
- Formulário de pagamento exibe Pix e cópia do recebedor selecionado; acompanha troca de recebedor e snapshots de chaves, sem consulta adicional. Ausência de chave não ocupa espaço.
- Sábado: grafia solicitada “Restrospectiva do meu an*”, preparo “levar material da apresentação”. Circuito e continuação: “roupas leves e pênis”, grafia intencional. Atualização parcial com backup e precondição de versão da agenda; horários preservados.

## Janela de teste e edição (06/11/2026)
- TEST_VOTE: votação única até07/11/2026 12h SP; chave fixa07/11, todos13 elegíveis, resultado após fechamento. Não integra VOTE_DAYS nem gera multas; período oficial permanece. Marcador/contagem/participação continuam atômicos e regras recusam fora da janela.
- ADM edita os nove campos da atividade, com duração e transação recusando dados desatualizados. Agenda completa permite editar dias ocultos pela própria chegada; não altera a personalização dos membros.
- Saídas Igor e Nanu quarta19h; Bruno quinta20h. Endereços em travelPlans/{driver}, leitura autenticada e escrita ADM validada, uma consulta ao carro próprio. Nunca inserir endereços reais em JS público.

## Encaixe da saída na agenda (07/11/2026)
- Card de saída dentro da seção do dia, imediatamente abaixo do cabeçalho de data e antes das atividades. Contagem de sessões com singular correto.
- Redesenho do botão de denúncia e acesso ao Mural ainda aguarda aprovação; não aplicar junto desta correção.

## Denúncia e vitrine aprovadas (07/11/2026)
- Denunciar é atalho flutuante circular de sirene, em todas as telas autenticadas, acima do menu. Atrás das folhas modais; espaço reservado no fim das páginas e à direita do compositor do chat. Sem animação contínua.
- Home usa Mural da Vergonha com carimbo Em exposição e até3 retratos de perfis condenados em molduras. Só aparece com condenação, sem contador total nem anexos de denúncias. Consulta hasMural existente passa de limit1 a limit3 e fornece os perfis; sem consulta adicional ou fotos no Firestore.

## Denúncia apenas na Home (07/11/2026)
- Substitui botão flutuante: linha compacta na Home com mural à esquerda e sirene à direita. Sem condenados, atalho horizontal alinhado à direita, sem espaço reservado para mural. Removido Em exposição; retratos/molduras mantidos. Restaurado espaço normal das páginas e compositor do chat.
