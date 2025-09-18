  const script = document.currentScript;
  const title = script.getAttribute("data-title") || "Game";

  const container = script.parentElement;
  container.innerHTML = `
    <section id="header-container">
      <img src="https://bittobitscom.wordpress.com/wp-content/uploads/2025/09/logo-yellow.png" alt="" height="60px">
      <div>
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

