// Keep a frozen viewport of the XVI above the XVII while its alpha mask erodes.
export function playFarewell(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) return;
  const frame = document.createElement('div');
  frame.className = 'finale-transition';
  frame.inert = true;
  frame.setAttribute('aria-hidden', 'true');
  const old = document.createElement('div');
  old.className = 'finale-old';
  const page = document.createElement('div');
  page.style.marginTop = -window.scrollY + 'px';
  page.append(...root.childNodes);
  old.append(page);
  const embers = document.createElement('div');
  embers.className = 'finale-embers';
  frame.append(old, embers);
  document.body.append(frame);
  const remove = () => frame.remove();
  old.addEventListener('animationend', remove, {once:true});
  setTimeout(remove, 2550);
}

export function farewellScreen(animate) {
  return `<main class="finale-stage${animate?' finale-opening':''}" aria-labelledby="finale-title">
    <div class="finale-center">
      <div class="finale-crest"><img src="assets/finale/xvii.webp" width="1254" height="1254" alt="XVII Congresso Monogâmico de São Paulo · COMORG"></div>
      <h1 id="finale-title" tabindex="-1">Nos vemos no congresso <br>do ano que vem</h1>
    </div>
    <button type="button" class="wrap-launch" data-open-wrapped aria-haspopup="dialog">Meu XVI Wrapped ↗</button>
    <button class="btn seal finale-finance" type="button" data-go="contas"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7h18v12H3zM3 11h18M6 15h4"/></svg>Racha Conta <span aria-hidden="true">↗</span></button>
  </main>`;
}

