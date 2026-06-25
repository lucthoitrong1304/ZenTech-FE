import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';
import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function createComponent(value = ''): Promise<ComponentFixture<RichTextEditorComponent>> {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('placeholder', 'Write rich text...');
    fixture.detectChanges();

    return fixture;
  }

  it('renders the full toolbar', async () => {
    const fixture = await createComponent();
    const buttons = fixture.nativeElement.querySelectorAll('.rich-text-editor__button');

    expect(buttons.length).toBe(16);
    expect(fixture.nativeElement.querySelector('[aria-label="Bold"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Redo"]')).not.toBeNull();
  });

  it('hydrates markdown into the editor surface', async () => {
    const fixture = await createComponent('# Product spec');
    const editor = fixture.nativeElement.querySelector('.ql-editor') as HTMLElement | null;

    expect(editor?.innerHTML).toContain('<h1>Product spec</h1>');
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
