(function () {

  const WIDGET_SCRIPT_URL = 
  'https://chat-fronend-tau.vercel.app/widget.js?v=10';

  const WIDGET_CSS_URL = 
  'https://chat-fronend-tau.vercel.app/styles.css?v=10';

  const ROOT_ID = 'support-chat-widget-root';


  function addWidgetRoot() {

    if (document.getElementById(ROOT_ID)) {
      return;
    }


    const wrapper = document.createElement('div');

    wrapper.id = ROOT_ID;


    // Position
    wrapper.style.position = 'fixed';

    wrapper.style.bottom = '24px';

    wrapper.style.left = '24px';

    wrapper.style.right = 'auto';

    wrapper.style.top = 'auto';


    // Layer
    wrapper.style.zIndex = '999999';


    // allow click
    wrapper.style.pointerEvents = 'none';


    const widget = document.createElement('support-chat-widget');


    widget.style.pointerEvents = 'auto';


    // force widget position
    widget.style.position = 'relative';

    widget.style.left = '0';

    widget.style.right = 'auto';


    wrapper.appendChild(widget);


    document.body.appendChild(wrapper);

  }



  function loadStylesheet(href) {


    if (!href) return;


    const oldStyle = document.querySelector(
      `link[href^="${href.split('?')[0]}"]`
    );


    if(oldStyle){
      oldStyle.remove();
    }


    const link = document.createElement('link');


    link.rel = 'stylesheet';

    link.href = href;


    document.head.appendChild(link);

  }




  function loadScript(src) {


    const script = document.createElement('script');


    script.src = src;


    script.async = true;


    script.onload = function(){

      console.log(
        'Support chat widget loaded'
      );

    };


    script.onerror = function(){

      console.error(
        'Failed loading widget script'
      );

    };


    document.body.appendChild(script);

  }




  function initWidget(){


    addWidgetRoot();


    loadStylesheet(
      WIDGET_CSS_URL
    );


    loadScript(
      WIDGET_SCRIPT_URL
    );

  }




  if(
    document.readyState === 'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      initWidget
    );


  }else{


    initWidget();


  }


})();