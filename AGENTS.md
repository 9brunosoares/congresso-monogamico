# XVI Congresso Monogâmico — passagem de bastão

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
| kirk | Kirk | `img/kirk.jpg` |  |
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
