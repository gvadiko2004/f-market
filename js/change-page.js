(() => {
  'use strict';

  const page = document.querySelector('.exchange');
  if (!page) return;
  const $ = selector => page.querySelector(selector);
  const localPreview = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const items = localPreview ? (window.FMarketPreview?.items || []) : [];
  const state = { game: 'cs2', query: '', descending: false, currency: 'UAH', selected: new Set(items.length ? [items[0].id] : []) };
  const grid = $('#inventory-grid');
  const empty = $('#inventory-empty');
  const cards = new Map();
  const money = minor => state.currency === 'UAH' ? `${(minor / 100).toFixed(2)}₴` : '—';
  const visibleItems = () => items.filter(item => item.game === state.game && item.name.toLocaleLowerCase('ru').includes(state.query));
  const status = (element, message, error = false) => {
    element.textContent = message;
    element.classList.toggle('is-error', error);
  };

  // Build the fixed preview once. Selection updates never rebuild focused buttons.
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'skin-card';
    card.dataset.itemId = item.id;
    const picture = document.createElement('div');
    picture.className = 'skin-card__image';
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.name;
    image.width = 234;
    image.height = 166;
    image.loading = index < 3 ? 'eager' : 'lazy';
    image.decoding = 'async';
    picture.append(image);
    const info = document.createElement('div');
    info.className = 'skin-card__info';
    const title = document.createElement('h2');
    title.textContent = item.name;
    const price = document.createElement('span');
    price.className = 'skin-card__price';
    price.textContent = money(item.priceMinor);
    info.append(title, price);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skin-card__select';
    button.dataset.selectItem = item.id;
    button.setAttribute('aria-label', `${item.name}, предмет ${index + 1}: выбрать`);
    card.append(picture, info, button);
    cards.set(item.id, { card, button, price });
    fragment.append(card);
  });
  grid.append(fragment);

  function updateSelection() {
    let total = 0;
    items.forEach(item => {
      const selected = state.selected.has(item.id);
      const { card, button, price } = cards.get(item.id);
      card.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? 'Добавлено' : 'Добавить в корзину';
      price.textContent = money(item.priceMinor);
      if (selected) total += item.priceMinor;
    });
    const formatted = localPreview ? money(total) : '—';
    ['#total-amount', '#payout-amount', '#mobile-amount'].forEach(selector => { $(selector).textContent = formatted; });
    $('#deposit-amount').textContent = state.currency === 'UAH' ? '0₴' : '—';
    $('#mobile-count').textContent = String(state.selected.size);
    $('#selection-status').textContent = `Выбрано предметов: ${state.selected.size}. Сумма предпросмотра: ${formatted}.`;
    status($('#payout-status'), '');
  }

  function filterItems() {
    const filtered = visibleItems().sort((a, b) => state.descending ? b.priceMinor - a.priceMinor : a.priceMinor - b.priceMinor);
    const visibleIds = new Set(filtered.map(item => item.id));
    cards.forEach(({ card }, id) => { card.hidden = !visibleIds.has(id); });
    filtered.forEach((item, index) => { cards.get(item.id).card.style.order = index; });
    empty.hidden = filtered.length > 0;
    grid.hidden = filtered.length === 0;
    $('#inventory-message').textContent = !localPreview
      ? 'Авторизация Steam и загрузка инвентаря ещё не подключены.'
      : state.game === 'dota2' ? 'В макете нет предметов Dota 2. Выберите CS:2, чтобы проверить интерфейс.' : 'Попробуйте другое название или сбросьте поиск.';
    $('#reset-filters').hidden = !localPreview;
    $('#search-count').textContent = `Найдено: ${filtered.length}`;
    $('#select-all').disabled = filtered.length === 0;
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-select-item]');
    if (!button) return;
    const id = button.dataset.selectItem;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    updateSelection();
  });
  $('#select-all').addEventListener('click', () => { visibleItems().forEach(item => state.selected.add(item.id)); updateSelection(); });
  $('#unselect-all').addEventListener('click', () => { state.selected.clear(); updateSelection(); });
  $('#sort-price').addEventListener('click', event => {
    state.descending = !state.descending;
    event.currentTarget.setAttribute('aria-label', `Цена: ${state.descending ? 'по убыванию' : 'по возрастанию'}`);
    event.currentTarget.querySelector('span').textContent = state.descending ? 'Price ↓' : 'Price ↑';
    filterItems();
  });
  page.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => {
    if (state.game === button.dataset.game) return;
    state.game = button.dataset.game;
    state.selected.clear();
    page.querySelectorAll('[data-game]').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.game === state.game)));
    filterItems(); updateSelection();
  }));
  $('.search-toggle').addEventListener('click', event => {
    const search = $('#inventory-search');
    search.hidden = !search.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!search.hidden));
    if (!search.hidden) $('#skin-search').focus();
    else { $('#skin-search').value = ''; state.query = ''; filterItems(); }
  });
  $('#skin-search').addEventListener('input', event => { state.query = event.target.value.trim().toLocaleLowerCase('ru'); filterItems(); });
  $('#reset-filters').addEventListener('click', () => {
    state.game = 'cs2'; state.query = ''; $('#skin-search').value = '';
    page.querySelectorAll('[data-game]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.game === 'cs2')));
    filterItems();
    $('.search-toggle').focus();
  });
  page.querySelectorAll('[name="currency"]').forEach(input => input.addEventListener('change', () => {
    state.currency = input.value;
    status($('#currency-status'), state.currency === 'UAH' ? '' : 'Для этой валюты курс не подключён. В макете доступны только суммы UAH.');
    updateSelection();
  }));

  function validateTradeURL() {
    const input = $('#trade-url');
    let valid = false;
    try {
      const url = new URL(input.value.trim());
      valid = url.protocol === 'https:' && url.hostname === 'steamcommunity.com' && !url.username && !url.password && !url.port
        && /^\/tradeoffer\/new\/?$/.test(url.pathname)
        && url.searchParams.getAll('partner').length === 1 && /^\d{1,20}$/.test(url.searchParams.get('partner') || '')
        && url.searchParams.getAll('token').length === 1 && /^[\w-]{8}$/.test(url.searchParams.get('token') || '');
    } catch { /* Invalid input stays local and is never submitted. */ }
    input.setAttribute('aria-invalid', String(!valid));
    status($('#trade-url-status'), valid
      ? 'Формат ссылки верный. Ссылка не отправлена: Steam ещё не подключён.'
      : 'Введите Steam Trade URL с параметрами partner и token.', !valid);
    return valid;
  }
  $('.trade-link').addEventListener('submit', event => { event.preventDefault(); validateTradeURL(); });
  $('#trade-url').addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); status($('#trade-url-status'), ''); });
  $('#payout-email').addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); status($('#payout-status'), ''); });
  $('#payout-form').addEventListener('submit', event => {
    event.preventDefault();
    const message = $('#payout-status');
    if (!localPreview) { status(message, 'Торговый сервер и выплаты ещё не подключены.', true); return; }
    if (!state.selected.size) { status(message, 'Выберите хотя бы один предмет.', true); return; }
    if (state.currency !== 'UAH') { status(message, 'Выберите UAH: курс других валют не подключён.', true); return; }
    if (!validateTradeURL()) { $('#trade-url').focus(); return; }
    const email = $('#payout-email');
    if (!email.checkValidity()) { email.setAttribute('aria-invalid', 'true'); status(message, 'Введите корректный email.', true); email.focus(); return; }
    status(message, 'Обмен не создан. Это предпросмотр: Steam и платёжный провайдер не подключены. Данные никуда не отправлены.');
  });

  if (!localPreview) {
    $('#preview-label').textContent = 'Steam и выплаты пока не подключены';
    $('.payout__methods').hidden = true;
    $('.payout__breakdown').hidden = true;
    $('.payout__notice p').textContent = 'Подключение Steam, загрузка инвентаря и выплаты ещё не настроены. Торговые операции недоступны.';
    page.querySelectorAll('[name="currency"], [name="marketing"], #payout-email').forEach(input => { input.disabled = true; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      $('.exchange__mobile-total').classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0 }).observe($('#payout-form'));
  }
  filterItems(); updateSelection();
})();
