import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '@/site-management/customer/shell/data-access/store/category-navigation.store';
import { CustomerShellStore } from '@/site-management/customer/shell/data-access/store/customer-shell.store';
import { SiteHeaderComponent } from './site-header.component';
import { SiteHeaderContainerComponent } from './site-header-container.component';

describe('SiteHeaderContainerComponent', () => {
  let fixture: ComponentFixture<SiteHeaderContainerComponent>;
  const navigate = vi.fn();
  const category = {
    id: 'category-id',
    label: 'Keyboards',
    slug: 'keyboards',
    link: '/categories/keyboards',
    children: [],
  };

  beforeEach(async () => {
    navigate.mockReset();
    await TestBed.configureTestingModule({
      imports: [SiteHeaderContainerComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        {
          provide: AuthSessionStore,
          useValue: { currentUser: signal(null), logout: vi.fn() },
        },
        {
          provide: CartStore,
          useValue: {
            itemCount: signal(0),
            items: signal([]),
            total: signal(0),
            incrementItem: vi.fn(),
            decrementItem: vi.fn(),
            removeItem: vi.fn(),
          },
        },
        {
          provide: CategoryNavigationStore,
          useValue: { navItems: signal([category]) },
        },
        {
          provide: CustomerShellStore,
          useValue: {
            instantResults: signal([]),
            loadingResults: signal(false),
            searchProducts: vi.fn(),
            clearSearch: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderContainerComponent);
    fixture.detectChanges();
  });

  it('updates the active category and delegates navigation to Router', () => {
    const header = fixture.debugElement.query(By.directive(SiteHeaderComponent))
      .componentInstance as SiteHeaderComponent;

    header.onNavSelect(category);
    fixture.detectChanges();

    expect(header.activeNavLabel()).toBe('Keyboards');
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/categories/keyboards'], { queryParams: undefined });
  });
});
