(() => {
  'use strict';
  const root = document.querySelector('.market');
  if (!root) return;
  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const preview = Array.isArray(window.FMarketCatalogPreview);
  const items = preview ? window.FMarketCatalogPreview : [];
  const byId = new Map(items.map(item => [item.id,item]));
  const categories = {all:'Все предметы',rifle:'Винтовки',sniper:'Снайперские',pistol:'Пистолеты',knife:'Ножи',gloves:'Перчатки'};
  const wears = {MW:'Немного поношенное',FT:'После полевых испытаний',WW:'Поношенное'};
  const rarities = {covert:'Тайное',classified:'Засекреченное',extraordinary:'Экстраординарное'};
  const sorts = ['featured','price-asc','price-desc','name','float'];
  const grid = $('#market-grid');
  const form = $('#filters-form');
  const phone = matchMedia('(max-width:440px)');
  const money = amount => new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount/100)+' ₴';
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loadSet = key => { try { const value=JSON.parse(localStorage.getItem(key)||'[]'); return new Set(Array.isArray(value)?value.filter(id=>byId.has(id)):[]); } catch { return new Set(); } };
  const favorites=loadSet('fmarket.catalog.favorites.v1');
  const cart=loadSet('fmarket.catalog.selection.v1');
  for(const id of cart) if(!byId.get(id).available) cart.delete(id);
  let state, limit=12, toastTimer, searchTimer, dialogTrigger, filtersTrigger;
  function defaults() { return {q:'',category:'all',weapon:'all',min:'',max:'',wear:[],rarity:[],stattrak:false,available:false,favorites:false,sort:'featured'}; }
  function readURL() {
    const p=new URLSearchParams(location.search), next=defaults();
    next.q=(p.get('q')||'').slice(0,100);
    if(p.get('category') in categories) next.category=p.get('category');
    if([...$('#weapon-filter').options].some(o=>o.value===p.get('weapon'))) next.weapon=p.get('weapon');
    for(const key of ['min','max']) { const raw=p.get(key); if(raw!==null&&raw.trim()!==''&&Number.isFinite(Number(raw))&&Number(raw)>=0&&Number(raw)<=10000000) next[key]=String(Number(raw)); }
    next.wear=p.getAll('wear').filter(v=>v in wears);next.rarity=p.getAll('rarity').filter(v=>v in rarities);
    for(const key of ['stattrak','available','favorites']) next[key]=p.get(key)==='1';
    if(sorts.includes(p.get('sort'))) next.sort=p.get('sort');
    return next;
  }
  function saveURL() {
    const p=new URLSearchParams();
    for(const key of ['q','min','max']) if(state[key]!=='') p.set(key,state[key]);
    for(const key of ['category','weapon']) if(state[key]!=='all') p.set(key,state[key]);
    for(const key of ['wear','rarity']) state[key].forEach(v=>p.append(key,v));
    for(const key of ['stattrak','available','favorites']) if(state[key]) p.set(key,'1');
    if(state.sort!=='featured') p.set('sort',state.sort);
    try { history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash); } catch { /* File previews can have restricted History access. */ }
  }
  function persist() { try { localStorage.setItem('fmarket.catalog.favorites.v1',JSON.stringify([...favorites]));localStorage.setItem('fmarket.catalog.selection.v1',JSON.stringify([...cart])); } catch { /* The current page remains fully usable without storage. */ } }
  function notify(text) { clearTimeout(toastTimer);$('#market-toast').textContent=text;toastTimer=setTimeout(()=>{$('#market-toast').textContent='';},3000); }
  function syncControls() {
    $('#market-search').value=state.q;$('#weapon-filter').value=state.weapon;$('#price-min').value=state.min;$('#price-max').value=state.max;$('#market-sort').value=state.sort;
    all('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===state.category)));
    for(const name of ['wear','rarity']) all(`[name="${name}"]`).forEach(input=>{input.checked=state[name].includes(input.value);});
    for(const name of ['stattrak','available']) form.elements[name].checked=state[name];
    $('#favorites-filter').setAttribute('aria-pressed',String(state.favorites));
  }
  function activeFilters() {
    const list=[];
    if(state.q) list.push(['q','Поиск: '+state.q]);
    if(state.category!=='all') list.push(['category',categories[state.category]]);
    if(state.weapon!=='all') list.push(['weapon',state.weapon]);
    if(state.min!=='') list.push(['min','От '+state.min+' ₴']);
    if(state.max!=='') list.push(['max','До '+state.max+' ₴']);
    state.wear.forEach(v=>list.push(['wear:'+v,v]));state.rarity.forEach(v=>list.push(['rarity:'+v,rarities[v]]));
    if(state.stattrak)list.push(['stattrak','StatTrak™']);if(state.available)list.push(['available','Без блокировки']);if(state.favorites)list.push(['favorites','Избранное']);
    return list;
  }
  function filtered() {
    const min=state.min===''?0:Math.round(Number(state.min)*100),max=state.max===''?Infinity:Math.round(Number(state.max)*100);
    const invalid=!Number.isFinite(min)||min<0||Number.isNaN(max)||max<0||min>max;
    $('#price-error').textContent=invalid?'Проверьте диапазон: «От» не должно превышать «До».':'';
    $('#price-min').setAttribute('aria-invalid',String(invalid));$('#price-max').setAttribute('aria-invalid',String(invalid));
    let found=invalid?[]:items.filter(i=>(state.category==='all'||i.category===state.category)&&(state.weapon==='all'||i.weapon===state.weapon)&&(!state.wear.length||state.wear.includes(i.wear))&&(!state.rarity.length||state.rarity.includes(i.rarity))&&(!state.stattrak||i.stattrak)&&(!state.available||i.available)&&(!state.favorites||favorites.has(i.id))&&i.priceMinor>=min&&i.priceMinor<=max&&`${i.weapon} ${i.name}`.toLocaleLowerCase().includes(state.q.toLocaleLowerCase().trim()));
    if(state.sort==='price-asc')found.sort((a,b)=>a.priceMinor-b.priceMinor);
    if(state.sort==='price-desc')found.sort((a,b)=>b.priceMinor-a.priceMinor);
    if(state.sort==='name')found.sort((a,b)=>(a.weapon+a.name).localeCompare(b.weapon+b.name));
    if(state.sort==='float')found.sort((a,b)=>a.float-b.float);
    return found;
  }
  function card(i,index) {
    const favorite=favorites.has(i.id),added=cart.has(i.id),title=esc(i.weapon+' | '+i.name);
    return `<article class="market-card ${i.available?'':'is-locked'}" data-id="${i.id}" data-rarity="${i.rarity}"><div class="market-card__top"><span class="${i.stattrak?'market-card__type':''}">${i.stattrak?'StatTrak™':'CS2 · '+i.wear}</span><button class="market-card__favorite" type="button" data-favorite="${i.id}" aria-pressed="${favorite}" aria-label="${favorite?'Убрать из избранного':'В избранное'}: ${title}">${favorite?'♥':'♡'}</button></div><button class="market-card__view" type="button" data-view="${i.id}" aria-label="Подробнее: ${title}"><span class="market-card__art"><img src="${i.image}" alt="${title}" width="512" height="384" loading="${index<4?'eager':'lazy'}" decoding="async"></span><span class="market-card__weapon">${esc(i.weapon)}</span><h2>${esc(i.name)}</h2></button><div class="market-card__wear"><span title="${wears[i.wear]}">${i.wear} · ${i.wear==='FT'?'Полевые испытания':i.wear==='MW'?'Немного понош.':'Поношенное'}</span><span>${i.float.toFixed(4)}</span></div><div class="market-card__float" style="--float:${i.float*100}%" aria-hidden="true"></div><div class="market-card__bottom"><div class="market-card__price">${money(i.priceMinor)}<small>Тестовая цена</small></div><button class="market-card__add" type="button" data-add="${i.id}" aria-pressed="${added}" aria-label="${added?'Убрать из подборки':'В подборку'}: ${title}" ${i.available?'':'disabled'}>${added?'✓':'+'}</button></div><p class="market-card__availability">${i.available?'Без блокировки · пример':'Обмен заблокирован · пример'}</p></article>`;
  }
  function render({reset=false,focus=null}={}) {
    if(reset)limit=12;
    const found=filtered(),shown=found.slice(0,limit);
    grid.innerHTML=shown.map(card).join('');grid.setAttribute('aria-busy','false');
    $('#result-count').textContent=preview?`Найдено предметов: ${found.length}`:'Каталог ещё не подключён';
    $('#shown-count').textContent=`Показано ${shown.length} из ${found.length}`;
    $('#market-empty').hidden=found.length>0;$('#market-pagination').hidden=found.length===0;$('#load-more').hidden=limit>=found.length;
    $('#favorite-count').textContent=favorites.size;$('#cart-count').textContent=cart.size;
    const active=activeFilters();$('#filter-count').textContent=active.length||'';
    $('#market-chips').innerHTML=active.map(([key,label])=>`<button type="button" data-remove-filter="${esc(key)}" aria-label="Убрать фильтр: ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('');
    if(focus)document.querySelector(focus)?.focus({preventScroll:true});
    saveURL();
  }
  function reset() { clearTimeout(searchTimer);state=defaults();syncControls();render({reset:true}); }
  all('[data-reset]').forEach(b=>b.addEventListener('click',reset));
  all('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;state.weapon='all';syncControls();render({reset:true});}));
  $('#market-search').addEventListener('input',e=>{state.q=e.target.value.slice(0,100);clearTimeout(searchTimer);searchTimer=setTimeout(()=>render({reset:true}),150);});
  $('#market-search').maxLength=100;
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',()=>{
    state.min=$('#price-min').value;state.max=$('#price-max').value;state.weapon=$('#weapon-filter').value;
    state.wear=all('[name=wear]:checked').map(i=>i.value);state.rarity=all('[name=rarity]:checked').map(i=>i.value);
    state.stattrak=form.elements.stattrak.checked;state.available=form.elements.available.checked;render({reset:true});
  });
  $('#market-sort').addEventListener('change',e=>{state.sort=e.target.value;render({reset:true});});
  $('#favorites-filter').addEventListener('click',()=>{state.favorites=!state.favorites;syncControls();render({reset:true});});
  $('#market-chips').addEventListener('click',e=>{const b=e.target.closest('[data-remove-filter]');if(!b)return;const [key,value]=b.dataset.removeFilter.split(':');if(value)state[key]=state[key].filter(v=>v!==value);else state[key]=defaults()[key];syncControls();render({reset:true});$('#market-search').focus({preventScroll:true});});
  $('#load-more').addEventListener('click',()=>{const offset=limit;limit+=12;render();grid.children[offset]?.querySelector('[data-view]').focus({preventScroll:true});});
  function toggleCart(id) { if(!byId.get(id)?.available)return;const existed=cart.has(id);existed?cart.delete(id):cart.add(id);persist();notify(existed?'Предмет убран из подборки':'Предмет добавлен в подборку');render({focus:`[data-add="${id}"]`}); }
  grid.addEventListener('click',e=>{
    const favorite=e.target.closest('[data-favorite]'),add=e.target.closest('[data-add]'),view=e.target.closest('[data-view]');
    if(favorite){const id=favorite.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);persist();render({focus:`[data-favorite="${id}"]`});if(!document.querySelector(`[data-favorite="${id}"]`))$('#favorites-filter').focus({preventScroll:true});}
    if(add)toggleCart(add.dataset.add);
    if(view)openItem(view.dataset.view,view);
  });
  function openDialog(dialog,trigger) { dialogTrigger=trigger;dialog.showModal(); }
  function openItem(id,trigger) {
    const i=byId.get(id);if(!i)return;
    $('#skin-dialog-content').innerHTML=`<p class="market__eyebrow">ПРЕДПРОСМОТР ПРЕДМЕТА</p><img class="market-dialog__art" src="${i.image}" width="512" height="384" alt="${esc(i.weapon+' | '+i.name)}"><p class="market-card__weapon">${esc(i.weapon)} ${i.stattrak?'· StatTrak™':''}</p><h2 id="skin-dialog-title">${esc(i.name)}</h2><dl><div><dt>Износ</dt><dd>${wears[i.wear]}</dd></div><div><dt>Float (пример)</dt><dd>${i.float.toFixed(4)}</dd></div><div><dt>Редкость</dt><dd>${rarities[i.rarity]}</dd></div><div><dt>Тестовая цена</dt><dd>${money(i.priceMinor)}</dd></div><div><dt>Цена Steam</dt><dd>Источник не подключён</dd></div></dl><p class="market-dialog__note">Изображение реального скина. Цена, float и доступность — примеры для проверки интерфейса. Это не предложение о продаже.</p><button class="button" type="button" data-detail-add="${id}" ${i.available?'':'disabled'}>${!i.available?'Обмен заблокирован · пример':cart.has(id)?'Убрать из подборки':'Добавить в подборку'}</button>`;
    openDialog($('#skin-dialog'),trigger);
  }
  $('#skin-dialog-content').addEventListener('click',e=>{const b=e.target.closest('[data-detail-add]');if(!b)return;const id=b.dataset.detailAdd;toggleCart(id);b.textContent=cart.has(id)?'Убрать из подборки':'Добавить в подборку';});
  function renderCart() {
    $('#cart-items').innerHTML=cart.size?[...cart].map(id=>{const i=byId.get(id);return `<div class="market-cart__row"><img src="${i.image}" alt="" width="70" height="55"><div>${esc(i.weapon+' | '+i.name)}<small>${i.wear} · ${money(i.priceMinor)}</small></div><button type="button" data-remove-cart="${id}" aria-label="Убрать ${esc(i.weapon+' | '+i.name)}">×</button></div>`;}).join(''):'<p class="market-cart__note">Подборка пока пуста. Добавляйте предметы кнопкой «+».</p>';
    $('#cart-total').textContent=money([...cart].reduce((sum,id)=>sum+byId.get(id).priceMinor,0));$('#checkout-preview').disabled=!cart.size;$('#checkout-status').textContent='';
  }
  $('#cart-open').addEventListener('click',e=>{renderCart();openDialog($('#cart-dialog'),e.currentTarget);});
  $('#cart-items').addEventListener('click',e=>{const b=e.target.closest('[data-remove-cart]');if(!b)return;cart.delete(b.dataset.removeCart);persist();render();renderCart();$('#cart-dialog .market-dialog__close').focus();});
  $('#checkout-preview').addEventListener('click',()=>{$('#checkout-status').textContent='Покупка пока недоступна: авторизация, реальные предложения и платёжный сервис не подключены. Заказ не создан, деньги не списаны.';});
  all('.market-dialog').forEach(dialog=>{
    dialog.querySelector('.market-dialog__close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{const box=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom))dialog.close();});
    dialog.addEventListener('close',()=>{if(dialogTrigger?.isConnected)dialogTrigger.focus({preventScroll:true});else $('#market-search').focus({preventScroll:true});});
  });
  const filters=$('#market-filters');
  function closeFilters() {
    if(!filters.classList.contains('is-modal'))return;
    filters.classList.remove('is-modal');filters.removeAttribute('role');filters.removeAttribute('aria-modal');
    all('.header,.footer,.market__breadcrumb,.market__heading,.market__notice,.market__categories,.market-results,.market-bottom').forEach(e=>{e.inert=false;});
    document.documentElement.classList.remove('filters-open');$('#filters-open').setAttribute('aria-expanded','false');
    if(phone.matches)filtersTrigger?.focus();
  }
  $('#filters-open').addEventListener('click',e=>{
    e.stopPropagation();
    filtersTrigger=e.currentTarget;filters.classList.add('is-modal');filters.setAttribute('role','dialog');filters.setAttribute('aria-modal','true');
    all('.header,.footer,.market__breadcrumb,.market__heading,.market__notice,.market__categories,.market-results,.market-bottom').forEach(el=>{el.inert=true;});
    document.documentElement.classList.add('filters-open');e.currentTarget.setAttribute('aria-expanded','true');$('.market-filters__close').focus();
  });
  filters.addEventListener('click',e=>{if(filters.classList.contains('is-modal'))e.stopPropagation();});
  $('.market-filters__close').addEventListener('click',closeFilters);$('.market-filters__apply').addEventListener('click',closeFilters);
  document.addEventListener('keydown',e=>{if(!filters.classList.contains('is-modal'))return;if(e.key==='Escape'){e.preventDefault();closeFilters();}if(e.key==='Tab'){const controls=[...filters.querySelectorAll('button,input,select')].filter(el=>!el.disabled&&el.getClientRects().length);const index=controls.indexOf(document.activeElement);e.preventDefault();controls[(index+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}});
  phone.addEventListener('change',()=>{if(!phone.matches)closeFilters();});
  window.addEventListener('popstate',()=>{state=readURL();syncControls();render({reset:true});});
  if(!preview){$('#market-mode').lastElementChild.textContent='Каталог в разработке · реальные предложения и цены ещё не подключены.';$('#empty-title').textContent='Каталог скоро появится';$('#empty-description').textContent='Подключаем источник предложений. Реальные предметы, цены и покупка пока недоступны.';$('#market-empty [data-reset]').hidden=true;}
  state=readURL();syncControls();render();
})();
