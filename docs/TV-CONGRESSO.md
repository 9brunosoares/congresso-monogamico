# TV do XVI Congresso — briefing para o Claude

## Pedido do Bru

Criar um vídeo horizontal para deixar projetando na televisão, em repetição contínua, intercalando os resultados do Queridômetro, o placar atual e os casos publicados do Mural da Vergonha. Quando um caso não tiver imagem, criar um rascunho da situação descrita, como um desenho de investigação criminal. Durante a viagem, Bru pedirá novas versões com os dados atualizados. Também quer que o Claude possa criar sua própria versão a partir deste briefing e dos mesmos dados.

<!-- TV_RESULTS_BEGIN -->
## Resultados atuais — 21/11/2026 às 12:14

**Usar esta captura na próxima versão do vídeo.** A seção de entrega inicial, abaixo, permanece como histórico.

Fonte: exportação somente de leitura do Firebase, com o mesmo cálculo do placar do app. Captura UTC: `2026-11-21T15:14:57.856Z`; horário local: America/Sao_Paulo. Estes valores são um retrato desse instante.

### Placar geral

| Posição | Congressista | Pontos |
|---:|---|---:|
| 1 | Igor | 107 |
| 2 | Sadano | 96 |
| 3 | Luan | 85 |
| 4 | OB | 60 |
| 5 | Nanu | 58 |
| 6 | Cadu | 45 |
| 7 | Gherardi | 40 |
| 8 | Felipe | 37 |
| 9 | Ibrahim | 35 |
| 10 | Pig | 30 |
| 11 | Diogo | 20 |
| 12 | Pelado | 10 |
| 13 | Bru | -5 |

Os totais já incluem os lançamentos confirmados e as penalidades aplicáveis até a captura, incluindo o Quiz dos Especialistas, os bônus já conquistados no quiz da High e os +3 de Sadano pela chave da cozinha. Não somar esses pontos novamente.

### Queridômetro — rodada de 21/11/2026

**Rodada encerrada: 12 votantes, 13 congressistas elegíveis e 144 emojis recebidos.** Contagens agregadas; não há identificação de quem escolheu cada emoji.

| Congressista | ❤️ | 💔 | 🐍 | 🤮 | 🧳 | 🍪 | 🤥 | 🎯 | 🌱 | Total recebido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Bru | 4 | 0 | 1 | 1 | 0 | 0 | 5 | 0 | 0 | 11 |
| OB | 6 | 0 | 3 | 1 | 1 | 0 | 0 | 0 | 0 | 11 |
| Luan | 5 | 0 | 2 | 1 | 3 | 0 | 0 | 0 | 0 | 11 |
| Igor | 6 | 0 | 1 | 1 | 1 | 0 | 0 | 2 | 0 | 11 |
| Pig | 5 | 0 | 1 | 1 | 2 | 0 | 1 | 1 | 0 | 11 |
| Pelado | 2 | 1 | 1 | 2 | 0 | 2 | 0 | 1 | 2 | 11 |
| Gherardi | 5 | 0 | 1 | 1 | 1 | 0 | 0 | 2 | 1 | 11 |
| Nanu | 4 | 0 | 0 | 1 | 0 | 2 | 0 | 0 | 4 | 11 |
| Sadano | 8 | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 11 |
| Ibrahim | 7 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 3 | 12 |
| Cadu | 6 | 0 | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 11 |
| Diogo | 5 | 0 | 1 | 1 | 0 | 2 | 0 | 1 | 1 | 11 |
| Felipe | 8 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 11 |
| **Total** | 71 | 2 | 15 | 14 | 8 | 7 | 7 | 8 | 12 | **144** |

🌱 já está incluído como nona opção. Para renderizar esta rodada, usar a grade3×3 e o arquivo `assets/emojis/8.png` do pacote atualizado.

### Mural e pacote atualizado para o Claude

Há **3 casos publicados** nesta captura: **2 com imagem original** e **1 sem foto**. As descrições completas, imagens e a reconstituição ilustrada correspondente estão no pacote local atualizado, fora do GitHub público.

Pacote: `../TV-Congresso/entrega/Claude-TV-Congresso-2026-11-21-12h14.zip`.

Dentro do ZIP, usar `snapshot/dados-tv.json` para os dados completos, `RESULTADOS-EM-TEXTO.txt` para leitura direta e as pastas de retratos/mural. O rascunho da cozinha foi reutilizado porque a descrição do caso permanece igual. As mídias não são buscadas por URLs públicas do Firebase.

Esta atualização fornece dados e referências para o Claude criar o próximo vídeo. O MP4 de20/11 e seu pacote original permanecem preservados.
<!-- TV_RESULTS_END -->

## Entrega inicial, 20/11/2026

- Captura dos dados: **20/11/2026 às 18:01, America/Sao_Paulo** (`2026-11-20T21:01:21.850Z`). É um retrato desse instante; não chamar de transmissão ao vivo.
- Queridômetro: rodada encerrada de **20/11**, **11 votantes**, **13 participantes**, **132 emojis** recebidos. Todos os participantes elegíveis aparecem; não divulgar quem votou em quem.
- Placar: os 13 participantes, na mesma ordem e com o mesmo cálculo do aplicativo.
- Mural: dois casos condenados/publicados (`status: ok`), um com foto original e um com reconstituição ilustrada. Nunca incluir denúncias pendentes.
- Vídeo: **1920 × 1080, 30 fps, MP4/H.264, yuv420p, áudio silencioso AAC**, 2min24s. A TV/player deve ter a opção de repetir ativada.
- Sem abertura ou tela preta entre ciclos. Dissolução de 0,5s entre telas, incluindo a última de volta à primeira.

## Arquivos e dados para entregar ao Claude

O pacote atual é **`TV-Congresso/entrega/Claude-TV-Congresso-2026-11-21-12h14.zip`**, na pasta PAI deste repositório. Entregar esse ZIP ao Claude junto com este briefing. Ele contém os dados reais completos desta captura, as mídias, fontes e código para criar o vídeo sem acesso ao Firebase. O pacote de20/11 permanece guardado como histórico.

Estrutura do pacote:

```text
LEIA-ME.md                       # Este briefing
RESULTADOS-EM-TEXTO.txt           # Todos os resultados, placar e descrições
snapshot/dados-tv.json           # Fonte estruturada, com horário da captura
snapshot/retratos/*.jpg          # Retratos e enquadramentos do app
snapshot/mural/caso-*.jpg        # Imagem original de cada caso com foto
snapshot/mural/ilustracao-*.png  # Rascunho de cada caso sem foto
assets/*.ttf                    # Bricolage, Figtree e JetBrains
assets/emojis/*.png             # Nove ícones na ordem do app
assets/licencas/*               # Licenças das fontes
PROMPTS-ILUSTRACOES.md           # Prompt usado e modo de geração
render_tv.py                    # Montagem offline, sem acesso ao Firebase
requirements.txt
manifesto-video.json            # Ordem das telas e duração
contato-telas.jpg               # Visão geral da composição entregue
```

As tabelas agregadas solicitadas por Bru estão neste briefing. O snapshot completo e as fotos autenticadas do mural ficam no pacote local, fora do repositório público e da raiz do GitHub Pages. Não publicar credenciais, UIDs de autenticação, PINs, dados financeiros, chat ou escolhas individuais de voto. O pacote contém somente o material necessário à exibição solicitada.

## Identidade e direção

Manter a identidade do app: fundo roxo quase preto `#120f1b`, cartões `#1d1829`, texto claro `#f1eef8`, vermelho `#ff4d68` e dourado `#e2bd52` para pontos/destaques. Bricolage Grotesque nos títulos, Figtree nos textos e JetBrains Mono nos números. Margens generosas, contraste alto e nomes/números grandes para ler do sofá.

Tom divertido de congresso entre amigos. Evitar animações incessantes, estímulos excessivos e efeitos que atrapalhem a leitura. A versão inicial não tem narração nem música. Cada tela do Queridômetro mostra dois congressistas e seus nove contadores (oito nas capturas anteriores à inclusão de 🌱). A última também mostra destaques calculados, preservando empates. O placar completo aparece em duas colunas. O mural mostra um caso por vez, com descrição fiel, apelido, imagem e penalidade efetivamente registrada.

Com os dados iniciais, a sequência é: duas telas do Queridômetro (8s cada), placar completo (12s), um caso do mural (10s), repetindo esse padrão. Sete telas cobrem os 13 resultados; quatro inserções de placar e quatro de mural completam 144s. Os dois casos aparecem duas vezes. Com novos casos, ajustar a sequência para mostrar todos, sem prender a duração a 144s.

## Reconstituições ilustradas

Usar a descrição real como fonte. Aparência de rascunho a lápis/grafite sobre papel, hachuras, perspectiva e marcas discretas de investigação. A foto do perfil pode orientar a aparência do personagem. Não inventar atos, causas ou participantes não descritos. Não confundir apelidos com descrição literal: **Pelado é o apelido, não um pedido de nudez**.

Identificar a imagem no vídeo como **RECONSTITUIÇÃO ILUSTRADA**; fotos anexadas são **REGISTRO ORIGINAL**. Inserir texto/descritivo na montagem, não dentro da imagem gerada. Na entrega inicial, a ilustração foi gerada com a ferramenta de imagens integrada, com referência visual ao retrato do perfil. O prompt integral está no pacote. Se a descrição mudar, gerar uma nova versão; se só os pontos mudarem, reutilizar a ilustração anterior.

## Dados e fontes de verdade

`scripts/export-tv.cjs` faz uma exportação administrativa **somente de leitura** usando a sessão do Firebase CLI por `scripts/firebase-context.cjs`. Não cria conta, não vota, não grava pontos e não altera o app, o mapa nem regras.

- Pessoas/apelidos/emojis: `roster.js`. São 13; `bruno` é o ID interno e **Bru** é o nome exibido.
- Queridômetro: último dia oficial com prazo encerrado em `VOTE_DAYS`, agregado `querido/{dayKey}` decodificado com `decodeTally`, elegibilidade por `votePeople`. Antes de meio-dia não revelar a rodada em andamento; usar a última encerrada. No snapshot, a soma dos contadores deve ser `voters × (eligible − 1)`.
- Placar: `points`, `scoreClosures/main` e participação dos dias já encerrados, passando por `scoringPoints()` do próprio app. Inclui bônus e descontos derivados; respeita encerramento e isenção de não preenchimento em 19/11. **Não somar novamente** as premiações da lona/briga de galo nem compensar manualmente multas derivadas.
- Mural: somente `cases` com `status == 'ok'` e fotos correspondentes de `casePhotos/{caseId}`. Penalidade vem de `points/case_<caseId>`; não inventar outra. Preservar imagens originais, proporção e conteúdo legível.
- Retratos: `img/{id}.jpg` e `frame` de `roster.js`. O enquadramento é `[largura_original, altura_original, x, y, lado_do_recorte]`.

Formato de `dados-tv.json`:

```text
version, capturedAt (ISO/UTC), timezone, note
participants[]: id, nick, photo (caminho relativo), frame?
queridometro: null ou {date, dayKey, voters, eligible, closed, emojis[],
  rows[]: {id, nick, counts: {emoji: quantidade}}}
scoreboard: {closedAt: ISO|null,
  rows[]: {position, id, nick, points, entries}}
mural: {cases[]: {id, who, nick, description, status, createdAt,
  penalty: número|null, photo: caminho|null, needsIllustration}}
```

Contadores ausentes/zero não são votos negativos. Placar empatado segue a ordem alfabética do app. Não usar `entries` como pontuação. Datas são de São Paulo, independentemente do fuso do computador que renderiza.

Atualização de20/11: o Queridômetro ganhou 🌱 como nona opção, anexada à ordem anterior. Snapshots antigos com oito opções continuam válidos. Novas exportações trazem nove; adicionar o ícone correspondente em `assets/emojis/8.png`. O renderizador adapta a grade para3×3 nesse caso, sem alterar vídeos já entregues.

## Atualizações durante a viagem

1. Com sessão administrativa já autorizada, executar na raiz do repo:

   ```powershell
   node scripts/export-tv.cjs --out '../TV-Congresso/build/snapshot-AAAA-MM-DD-HHhMM'
   ```

2. Conferir os totais e casos novos. Para cada caso sem foto, colocar uma ilustração em `snapshot/mural/ilustracao-<id>.png`. Gerar com ferramenta de imagens, reutilizando ilustrações de casos que não mudaram. O renderizador recusa a ausência da imagem, em vez de mostrar um espaço vazio.
3. Montar a versão offline com Python, Pillow, NumPy e FFmpeg. O pacote já inclui as fontes/ícones:

   ```powershell
   python -m pip install -r requirements.txt
   python render_tv.py --snapshot snapshot --assets assets --output TV-Congresso-atualizado.mp4
   ```

   Ou usar `python scripts/tv/render_tv.py` dentro do repositório, informando os mesmos caminhos. `--ffmpeg caminho` aceita um FFmpeg existente; `--preview-only` gera só as telas para revisão.

4. Revisar `contato-telas.jpg`, as telas de mural e os nomes/números. O renderizador verifica consistência de resultados, todos os integrantes do ranking, arquivos ausentes e textos fora da área da TV.
5. Verificar a reprodução do MP4 inteiro (`ffmpeg -v error -xerror -i VIDEO.mp4 -f null -`), conferir primeiro/último quadro e entregar com data/hora no nome e rodapé.
6. Substituir o arquivo que estiver passando na TV. Não é necessário deploy do app ou alteração no Firebase. Não agendar atualizações automáticas: novas versões são solicitadas pelo Bru.

## Limites desta tarefa

Não alterar física/visual da chácara, home, votação, placar ou regras para viabilizar o vídeo. Não incluir dados simulados na produção. A criação do vídeo não modifica os resultados no aplicativo. O Claude pode criar uma direção artística alternativa, mantendo os mesmos fatos, legibilidade, identificação de ilustrações e respeito ao prazo da votação.
