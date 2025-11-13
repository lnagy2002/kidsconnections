  const scriptFooter = document.currentScript;

  const containerFooter = scriptFooter.parentElement;
  containerFooter.innerHTML = `
  <footer class="footer-container">
  <img
    src="https://bittobitscom.wordpress.com/wp-content/uploads/2025/11/cropped-untitled-design.png"
    alt="The Mind Bits"
    class="footer-logo"
  />
  <div class="footer-text">©2025 The Mind Bits</div>
</footer>
  `;
