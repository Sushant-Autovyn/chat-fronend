import { createApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { createCustomElement } from '@angular/elements';

createApplication(appConfig)
  .then((appRef) => {
    const chatWidget = createCustomElement(App, { injector: appRef.injector });
    customElements.define('support-chat-widget', chatWidget);
  })
  .catch((err) => console.error(err));
