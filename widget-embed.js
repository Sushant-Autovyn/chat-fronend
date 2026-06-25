(function () {

const WIDGET_SCRIPT_URL = 
'https://chat-fronend-tau.vercel.app/widget.js?v=2';

const WIDGET_CSS_URL = 
'https://chat-fronend-tau.vercel.app/styles.css?v=2';

const ROOT_ID = 'support-chat-widget-root';


function addWidgetRoot() {

if(document.getElementById(ROOT_ID)){
return;
}


const wrapper=document.createElement('div');

wrapper.id=ROOT_ID;

wrapper.style.position='fixed';

wrapper.style.bottom='24px';

wrapper.style.left='24px';

wrapper.style.zIndex='99999';

wrapper.style.pointerEvents='none';



const widget=document.createElement('support-chat-widget');

widget.style.pointerEvents='auto';

wrapper.appendChild(widget);

document.body.appendChild(wrapper);

}



function loadStylesheet(href){

const link=document.createElement('link');

link.rel='stylesheet';

link.href=href;

document.head.appendChild(link);

}



function loadScript(src){

const script=document.createElement('script');

script.src=src;

script.async=true;

document.body.appendChild(script);

}



function initWidget(){

addWidgetRoot();

loadStylesheet(WIDGET_CSS_URL);

loadScript(WIDGET_SCRIPT_URL);

}


if(document.readyState==='loading'){

document.addEventListener(
'DOMContentLoaded',
initWidget
);

}else{

initWidget();

}


})();