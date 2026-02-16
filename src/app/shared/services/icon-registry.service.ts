import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

interface IconRegistry {
  [category: string]: string[];
}

@Injectable({
  providedIn: 'root'
})
export class IconRegistryService {
  private readonly icons: IconRegistry = {
    toast: ['ic_success', 'ic_error', 'ic_warning'],
    ui: ['ic_close']
  };

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {}

  registerIcons(): void {
    Object.values(this.icons)
      .flat()
      .forEach(iconName => {
        this.matIconRegistry.addSvgIcon(
          iconName,
          this.domSanitizer.bypassSecurityTrustResourceUrl(`icons/${iconName}.svg`)
        );
      });
  }
}
