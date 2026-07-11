import { Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { PermissionCode } from '@/core/permissions/permission.models';
import { PermissionService } from '@/core/permissions/permission.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly permissionService = inject(PermissionService);

  readonly appHasPermission = input.required<PermissionCode | string>();

  constructor() {
    effect(() => {
      const visible = this.permissionService.has(this.appHasPermission() as PermissionCode);
      visible
        ? this.renderer.removeStyle(this.element.nativeElement, 'display')
        : this.renderer.setStyle(this.element.nativeElement, 'display', 'none');
    });
  }
}
