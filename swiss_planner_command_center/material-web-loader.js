(async function loadMaterialWeb() {
  try {
    await import("@material/web/all.js");
    const module = await import("@material/web/typography/md-typescale-styles.js");
    if (module.styles && module.styles.styleSheet && document.adoptedStyleSheets) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, module.styles.styleSheet];
    }
    window.__MATERIAL_WEB_READY__ = true;
    document.documentElement.classList.add("material-web-ready");
    window.dispatchEvent(new CustomEvent("material-web-ready"));
  } catch (error) {
    window.__MATERIAL_WEB_READY__ = false;
    document.documentElement.classList.add("material-web-fallback");
    console.info("Material Web runtime unavailable; using local Material 3 fallback primitives.", error);
  }
})();
