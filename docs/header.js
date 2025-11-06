  const script = document.currentScript;
  const title = script.getAttribute("data-title") || "Game";
  // const image = script.getAttribute("data-image") || "https://bittobitscom.wordpress.com/wp-content/uploads/2025/09/logo-yellow.png";

  const container = script.parentElement;
  container.innerHTML = `
    <section id="header-container">
      <!-- <img style="background: white;border-radius: 15px;" src="" alt="" height="60px"> -->
      <div>
        <h1 style="color:var(--muted)">${title} <div id="date"></div></h1>

      </div>
    </section>
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

  document.getElementById("date").textContent = `${formattedDate}`;
