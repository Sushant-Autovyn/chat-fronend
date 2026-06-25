(function () {
  const WIDGET_SCRIPT_URL = 'https://chat-fronend-tau.vercel.app/widget.js';
  const WIDGET_CSS_URL = 'https://chat-fronend-tau.vercel.app/styles.css';
  const ROOT_ID = 'support-chat-widget-root';

  function addWidgetRoot() {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = ROOT_ID;
    wrapper.style.position = 'fixed';
    wrapper.style.bottom = '24px';
    wrapper.style.right = '24px';
    wrapper.style.zIndex = '99999';
    wrapper.style.pointerEvents = 'none';

    const widget = document.createElement('support-chat-widget');
    widget.style.pointerEvents = 'auto';
    wrapper.appendChild(widget);
    document.body.appendChild(wrapper);
  }

  function loadStylesheet(href) {
    if (!href) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, callback) {
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = callback;
    script.onerror = function () {
      console.error('Failed to load chat widget script:', src);
    };
    document.body.appendChild(script);
  }

  function initWidget() {
    addWidgetRoot();
    loadStylesheet(WIDGET_CSS_URL);
    loadScript(WIDGET_SCRIPT_URL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
