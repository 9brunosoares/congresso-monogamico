# XVI Congresso Monogâmico — passagem de bastão

Documento de contexto para o próximo agente (Codex). Leia tudo antes de mexer no código.

## 1. O projeto

O **Congresso Monogâmico** é uma viagem recorrente entre amigos, de quarta à noite até domingo de manhã, e a próxima é a 16ª ("XVI"). O app é um web app (PWA) que cada participante instala na tela inicial do iPhone. Ele precisa oferecer:

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

- Front-end estático no GitHub Pages. `index.html` contém a interface; `backend.js` usa os módulos oficiais do SDK Web 13.1.0 por CDN.
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
- `settle()`: algoritmo guloso que casa o maior devedor com o maior credor para minimizar os Pix.

### Navegação (barra inferior, 6 abas)
Início · Programa · Placar · Querido · Contas · Fofoca. O Mural da Vergonha está dentro de Fofoca, numa aba segmentada junto com o chat. **Seis é o limite** do que cabe no iPhone; se entrar outra seção grande, reorganize o menu.

## 3. Identidade visual (aprovada, não mudar sem o Bruno pedir)

A versão aprovada é a **"vermelha"**. Outras foram testadas e descartadas: caderno pautado, a identidade de um convite "save the date" e uma institucional verde chamada "plenário".

- **Fontes (Google Fonts):** Bricolage Grotesque nos títulos, Figtree no texto e JetBrains Mono nos números.
- **Tokens no `:root`:** `--bg #ecebf2`, `--surface #fff`, `--ink #1b1530`, `--muted #686280`, `--seal #c4122f` (vermelho-lacre, o acento), `--brass #a77f12` (dourado do líder), além de `--good` e `--bad`.
- **Modo escuro** completo via `prefers-color-scheme`, com os mesmos tokens redefinidos.
- **Motivo:** crachá de congresso e lacre vermelho. O card "Próxima sessão" é escuro, com contagem regressiva e caixa de preparação em vermelho.
- **Ícone:** selo vermelho com borda serrilhada, "XVI" no centro e "CONGRESSO" embaixo (`icon-*.png`, `apple-touch-icon.png`).
- **Correção já aplicada:** a classe decorativa do lacre se chama `.sealmark`. O nome antigo, `.seal`, colidia com `.btn.seal` e jogava o botão principal para fora da tela.

## 4. Arquivos entregues

- `index.html`: o app completo, já com as meta tags de PWA e iOS (`apple-mobile-web-app-*`, manifest, `theme-color` claro e escuro).
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
- Datas informadas: chegada quarta à noite, 18/11/2026; quinta de home office; feriado sexta 20/11; retorno domingo 22/11 pela manhã.
- Programação provisória: quinta pizza e jogos de tabuleiro; sexta circuito e Quiz dos especialistas; sábado guerra de bexiga e lona, mais retrospectiva individual com objeto pessoal à noite; domingo Oscar do Congresso e volta para São Paulo.
- Café da manhã, almoço e janta cadastrados nos cinco dias. Quarta café/almoço indicados antes da chegada; domingo almoço/janta indicados após a saída, sem encontro coletivo definido. Horários são sugestões, não foram confirmados pelo Bruno.
- Orçamento definitivo e horários ainda pendentes. Não inventar valores ou horários como se fossem confirmados.
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
