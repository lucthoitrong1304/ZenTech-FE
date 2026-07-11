import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SiteHeaderComponent } from '@/site-management/customer/shell/components/site-header/site-header.component';
import { HeaderNavItem } from '@/site-management/customer/shell/models/site-navigation.models';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;

  const parentCategory: HeaderNavItem = {
    id: 'parent-id',
    label: 'Peripherals',
    slug: 'peripherals',
    link: '/categories/peripherals',
    children: [
      {
        id: 'child-id',
        label: 'Keyboards',
        slug: 'keyboards',
        link: '/categories/keyboards',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderComponent);
  });

  it('selects and requests navigation for a desktop parent category', () => {
    fixture.componentRef.setInput('navItems', [parentCategory]);
    const selected = vi.fn();
    const navigationRequested = vi.fn();
    fixture.componentInstance.navSelect.subscribe(selected);
    fixture.componentInstance.navigationRequested.subscribe(navigationRequested);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.site-header__nav-link')).nativeElement.click();

    expect(selected).toHaveBeenCalledOnce();
    expect(selected).toHaveBeenCalledWith(parentCategory);
    expect(navigationRequested).toHaveBeenCalledOnce();
    expect(navigationRequested).toHaveBeenCalledWith({ commands: ['/categories/peripherals'] });
  });

  it('selects and requests navigation for a desktop child category', () => {
    fixture.componentRef.setInput('navItems', [parentCategory]);
    const selected = vi.fn();
    const navigationRequested = vi.fn();
    fixture.componentInstance.navSelect.subscribe(selected);
    fixture.componentInstance.navigationRequested.subscribe(navigationRequested);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.site-header__category-dropdown-item')).nativeElement.click();

    expect(selected).toHaveBeenCalledOnce();
    expect(selected).toHaveBeenCalledWith(parentCategory.children?.[0]);
    expect(navigationRequested).toHaveBeenCalledOnce();
    expect(navigationRequested).toHaveBeenCalledWith({ commands: ['/categories/keyboards'] });
  });

  it('requests mobile category navigation only once', async () => {
    fixture.componentRef.setInput('navItems', [parentCategory]);
    const navigationRequested = vi.fn();
    fixture.componentInstance.navigationRequested.subscribe(navigationRequested);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[aria-label="Open categories"]')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const categoryButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.site-header__menu-item'),
    ).find(button => button.textContent?.trim() === parentCategory.label);
    expect(categoryButton).toBeTruthy();
    categoryButton?.click();

    expect(navigationRequested).toHaveBeenCalledOnce();
    expect(navigationRequested).toHaveBeenCalledWith({ commands: ['/categories/peripherals'] });
  });

  it('links authenticated customers to the account area', async () => {
    fixture.componentRef.setInput('currentUser', {
      isAuthenticated: true,
      fullName: 'Customer User',
      avatarUrl: null,
    });
    const navigationRequested = vi.fn();
    fixture.componentInstance.navigationRequested.subscribe(navigationRequested);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[aria-label="Customer User"]')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const accountButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.site-header__menu-item'),
    ).find(button => button.textContent?.trim() === 'Quản lý tài khoản');
    expect(accountButton).toBeTruthy();
    accountButton?.click();

    expect(navigationRequested).toHaveBeenCalledWith({ commands: ['/account'] });
  });

  it('keeps login and register actions for guests', async () => {
    fixture.componentRef.setInput('currentUser', null);
    const navigationRequested = vi.fn();
    fixture.componentInstance.navigationRequested.subscribe(navigationRequested);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[aria-label="Tài khoản"]')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menuButtons = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.site-header__menu-item'),
    );
    const loginButton = menuButtons.find(button => button.textContent?.trim() === 'Đăng nhập');
    const registerButton = menuButtons.find(button => button.textContent?.trim() === 'Đăng ký');
    expect(loginButton).toBeTruthy();
    expect(registerButton).toBeTruthy();

    loginButton?.click();
    registerButton?.click();

    expect(navigationRequested).toHaveBeenCalledWith({ commands: ['/auth/login'] });
    expect(navigationRequested).toHaveBeenCalledWith({ commands: ['/auth/register'] });
  });
});
