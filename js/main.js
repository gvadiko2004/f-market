(() => {
  'use strict';
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const profileButton = document.querySelector('.profile__button');
  const profileMenu = document.querySelector('.profile__menu');
  const dialog = document.querySelector('#info-dialog');
  let returnFocus;
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
    nav.classList.remove('is-open');
  };
  const closeProfile = () => {
    profileButton.setAttribute('aria-expanded', 'false');
    profileMenu.hidden = true;
  };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    closeProfile();
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  profileButton.addEventListener('click', () => {
    const open = profileMenu.hidden;
    profileMenu.hidden = !open;
    profileButton.setAttribute('aria-expanded', String(open));
    closeMenu();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.profile')) closeProfile();
    if (!event.target.closest('.nav, .menu-toggle')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (nav.classList.contains('is-open')) { closeMenu(); menuButton.focus(); }
      if (!profileMenu.hidden) { closeProfile(); profileButton.focus(); }
    }
  });
  matchMedia('(min-width: 851px)').addEventListener('change', closeMenu);
  function showInfo(title, description, trigger) {
    returnFocus = trigger;
    document.querySelector('#dialog-title').textContent = title;
    document.querySelector('#dialog-description').textContent = description;
    closeProfile();
    closeMenu();
    dialog.showModal();
  }
  // Replace this event handler with your server-side Steam OpenID endpoint.
  document.querySelectorAll('[data-auth]').forEach(button => button.addEventListener('click', () => {
    showInfo('Вход через Steam', 'Это демонстрационная версия сайта. Авторизация через Steam и продажа скинов пока недоступны.', button);
  }));
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => {
    showInfo(button.dataset.info, 'Этот раздел пока не опубликован.', button);
  }));
  dialog.querySelectorAll('.dialog__close, .dialog__ok').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => returnFocus?.focus());
  document.querySelector('.newsletter__form').addEventListener('submit', event => {
    event.preventDefault();
    document.querySelector('.newsletter__status').textContent = 'Подписка пока недоступна. Адрес не был отправлен.';
  });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .06, rootMargin: '0px 0px 30px 0px' });
    document.documentElement.classList.add('motion');
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    reducedMotion.addEventListener('change', event => {
      if (event.matches) { document.documentElement.classList.remove('motion'); observer.disconnect(); }
    });
  }
})();
