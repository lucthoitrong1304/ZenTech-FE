import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SiteHeaderComponent } from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderComponent);
  });

  it('links authenticated customers to the account area', async () => {
    fixture.componentRef.setInput('currentUser', {
      isAuthenticated: true,
      fullName: 'Customer User',
      avatarUrl: null,
    });
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[aria-label="Customer User"]')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.innerHTML).toContain('/account');
  });

  it('keeps login and register actions for guests', async () => {
    fixture.componentRef.setInput('currentUser', null);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[aria-label="Tai khoan"]')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.innerHTML).toContain('/auth/login');
    expect(document.body.innerHTML).toContain('/auth/register');
  });
});
