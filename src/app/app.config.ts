import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
     {
      provide: 'MAT_FORM_FIELD_DEFAULT_OPTIONS',
      useValue: {
        appearance: 'outlined',
        subscriptSizing: 'dynamic',
      },
     }
  ]
};
