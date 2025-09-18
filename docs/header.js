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

(function(){
  const script = document.currentScript;
  const title = script.getAttribute("data-title") || "Game";

  const container = script.parentElement;
  container.innerHTML = `
    <section class="controls">
      <img src="https://bittobitscom.wordpress.com/wp-content/uploads/2025/09/logo-yellow.png" alt="" height="60px">
      <div class="title-block">
        <h2>${title}</h2>
        <div id="date"></div>
      </div>
    </section>
    <hr>
  `;

  // === Date + Level Logic ===
  const t = new Date();
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = t.toLocaleDateString(undefined, options);

  const mm = String(t.getMonth() + 1).padStart(2, '0'); 
  const dd = String(t.getDate()).padStart(2, '0');
  const yyyy = t.getFullYear();

  const formattedFileDate = mm + dd + yyyy;
  const level = getQueryParam('level') || 'easy';

  document.getElementById("date").textContent = `Daily ${level} • ${formattedDate}`;
})();
