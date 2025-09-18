// global-includes.js
(function() {
  const head = document.getElementsByTagName('head')[0];

  // CSS
  const css = document.createElement('link');
  css.rel = "stylesheet";
  css.href = "https://lnagy2002.github.io/kidsconnections/games-utils.css";
  head.appendChild(css);

  // Game scripts
  const menu = document.createElement('script');
  menu.src = "https://lnagy2002.github.io/kidsconnections/games-menu.js";
  menu.defer = true;
  menu.setAttribute("data-menu", "https://lnagy2002.github.io/kidsconnections/games-menu.json");
  head.appendChild(menu);

  const utils = document.createElement('script');
  utils.src = "https://lnagy2002.github.io/kidsconnections/games-utils.js";
  head.appendChild(utils);

  // Google Analytics
  const ga = document.createElement('script');
  ga.src = "https://www.googletagmanager.com/gtag/js?id=G-KFSR46Z6C8";
  ga.async = true;
  head.appendChild(ga);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-KFSR46Z6C8');
})();
