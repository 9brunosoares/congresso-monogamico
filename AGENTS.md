# XVI Congresso Monogâmico — passagem de bastão

Documento de contexto para o próximo agente (Codex). Leia tudo antes de mexer no código.

## 1. O projeto

O **Congresso Monogâmico** é uma viagem recorrente de 4 dias entre amigos, e a próxima é a 16ª ("XVI"). O app é um web app (PWA) que cada participante instala na tela inicial do iPhone. Ele precisa oferecer:

- **Login individual:** cada congressista tem o seu.
- **Programação dos 4 dias:** próxima sessão, contagem regressiva e se ela exige preparação.
- **Divisão de gastos estilo Splitwise:** quem pagou o quê, saldos e "quem paga quem" com o mínimo de transferências.
- **Orçamento do congresso:** total e por categoria.
- **Perfil ADM** para os organizadores.
- **Placar individual de pontos:** jogos e brincadeiras somam; tarefas de auxílio (lavar louça, tirar o lixo) somam; infrações (lixo no chão, louça suja pela casa) tiram.
- **Mural da Vergonha:** denúncias de quem desrespeitar "as regras da monogamia". O Tribunal julga e o condenado perde pontos.
- **Queridômetro estilo BBB:** toda manhã, cada um dá um emoji para cada congressista. É anônimo: só se mostra quantos emojis cada pessoa recebeu, nunca quem deu. Os emojis são ❤️ 💔 🐍 🤮 🧳 🍪 🤥 🎯. A planta 🌱 foi removida a pedido.
- **Chat anônimo** para fofocas ("alguém não deu descarga", "quem tomou minha skol beats").

O humor fica implícito; o app deve parecer profissional.

**Dono do projeto:** Bruno (GitHub `9brunosoares`). Organizadores e ADMs: **Bruno, Igor Baptista e Gabriel Bim**.

## 2. Estado atual: protótipo funcional, sem backend

Está tudo em **`index.html`**, num arquivo único: HTML, CSS e JavaScript puro, sem framework e sem build.

- **Todos os dados ficam no `localStorage` de cada celular** (chave `xvi-congresso`; a aba atual fica em `xvi-tab`). Por isso nada é compartilhado entre os participantes. Resolver isso é o objetivo da próxima etapa.
- **O login é falso:** escolhe-se a foto e digita-se qualquer PIN.
- **Os dados de exemplo são fictícios:** datas de 19 a 22/11/2026, programação, gastos, pontos e denúncias.
- **Há um relógio de demonstração** que começa na sexta, 20/11, às 15:40, para a contagem regressiva fazer sentido. Um botão no topo alterna para o relógio real.
- **As fotos dos participantes estão embutidas em base64** na constante `PH` do `index.html`. Elas também estão em arquivos separados na pasta `img/`, com nome igual ao `id` de cada pessoa. Ao migrar, prefira os arquivos e tire o base64, que deixa o HTML pesado.

### Participantes (`PEOPLE`, `id` → nome exibido)
| id | Nome | ADM |
|---|---|---|
| bruno | Bruno | sim |
| caio | Caio Carvalho | |
| luan | Luan | |
| carlos | Carlos Eduardo | |
| gabriel | Gabriel Bim | sim |
| guiob | Gui OB | |
| igor | Igor Baptista | sim |
| rafa | Rafa Sarjani | |
| rafael | Rafael Gherardi | |
| thiago | Thiago Nanu | |
| thiaga | Thiaga | |
| guilherme | Guilherme | |
| diogo | Diogo Antunes | |

### Estrutura do estado local (objeto `S`), base para o modelo do Firestore
- `me`: id do usuário logado.
- `budget`: orçamento total em R$.
- `points[]`: `{who, d (delta de pontos), why, kind: "aux"|"jogo"|"inf", at}`.
- `exps[]`: `{id, title, cat, amount, payer, split: [ids], at}`.
- `shame[]`: `{id, who (réu), by (denunciante), what, status: "pend"|"ok", at}`. Condenar gera `-15` em `points`; absolver remove a denúncia.
- `querido`: `{ [dia]: { [idAlvo]: { [emoji]: contagem } } }`.
- `qvoted`: `{ [dia]: [ids que já votaram] }`.
- `chat[]`: `{id, text, at, mine?}`. Não há autor.

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
- `img/*.jpg`: as 13 fotos de perfil, 160×160.

## 5. Repositório e hospedagem

- O repositório **`9brunosoares/congresso-monogamico`** existe, é público e **está vazio**. Nada foi enviado ainda, porque o Claude não tinha permissão de escrita.
- O destino é o **GitHub Pages**, a partir da branch `main` e da pasta raiz. A URL esperada é `https://9brunosoares.github.io/congresso-monogamico/`.
- No iPhone, o app é instalado pelo Safari: Compartilhar → Adicionar à Tela de Início.

## 6. Próximos passos (decisão tomada: GitHub Pages + Firebase)

1. **Publicar o estático atual** no repositório e ativar o Pages (Settings → Pages → main / root).
2. **Bruno cria o projeto** no Firebase (console.firebase.google.com, plano gratuito Spark). Ele ativa o **Authentication** (Email/Password) e o **Firestore**, registra um app Web e passa o `firebaseConfig`. O config do Firebase pode ficar no front-end; a segurança vem das Security Rules.
3. **Login:**
   - Cada participante recebe uma conta com e-mail sintético (`<id>@congresso.app`) e um **PIN de 6 dígitos**, porque o Firebase exige pelo menos 6 caracteres.
   - Na tela de login, a pessoa escolhe a foto e digita o PIN, e o app monta o e-mail a partir do `id`.
   - As contas são criadas pelos ADMs ou por script.
   - O papel de ADM fica num documento `admins/{uid}`, checado nas rules com `exists()`. Assim não é preciso Admin SDK nem custom claims.
4. **Modelo do Firestore (sugestão):**
   - `people/{id}`: nome, foto e `uid`.
   - `agenda/{sessionId}`.
   - `points/{autoId}` e `expenses/{autoId}`. Gravação para participantes; edição e exclusão só para ADM.
   - `settings/main`: orçamento e categorias.
   - `cases/{autoId}`: o Mural. Qualquer participante cria; só ADM julga.
   - `chat/{autoId}`: `{text, createdAt}` **sem uid**. As rules devem aceitar exatamente essas chaves, e só ADM apaga.
   - `querido/{dia}/voters/{uid}`: `{voted: true}`, criado uma vez, e `querido/{dia}/tally/{idAlvo}`: contadores por emoji.
     - O voto é gravado num **batch**: o documento do votante e os incrementos.
     - As rules usam `!exists()` no documento do votante e `existsAfter()` para garantir um voto por pessoa por dia.
     - **Nunca gravar quem deu qual emoji.**
   - Trocar o `localStorage` por `onSnapshot` para que tudo apareça em tempo real.
5. **Anonimato:** os participantes não podem ver o autor de nenhuma mensagem nem de nenhum voto. O Bruno já sabe da ressalva: quem administra o projeto poderia, em tese, mudar o código. Não prometer sigilo absoluto.
6. **Opcional:** notificação ("sessão em 15 min") via Firebase Cloud Messaging. Funciona em PWA no iOS 16.4+ instalado na tela inicial.
7. **Conteúdo real:** substituir os dados de exemplo por datas, programação, pontuações e orçamento reais, a pedir ao Bruno. Remover o relógio de demonstração antes da viagem, ou deixá-lo só para ADM.

## 7. Como trabalhar com o Bruno

- Português do Brasil, direto, sem enrolação nem preâmbulo. Ele prefere franqueza a concordância.
- Ele tem olho apurado para língua e estética: revise acentuação e concordância nos textos do app.
- Evite aberturas como "claro, aqui está" e expressões como "sem frescura".
- Mostre versões navegáveis cedo e itere a partir do retorno dele.
