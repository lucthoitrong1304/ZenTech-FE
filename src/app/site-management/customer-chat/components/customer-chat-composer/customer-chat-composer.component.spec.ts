import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerChatComposerComponent } from './customer-chat-composer.component';

describe('CustomerChatComposerComponent', () => {
  let component: CustomerChatComposerComponent;

  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  beforeEach(() => {
    component = TestBed.runInInjectionContext(() => new CustomerChatComposerComponent());
  });

  it('emits pasted image files and prevents the default paste', () => {
    const image = new File(['image'], 'pasted.png', { type: 'image/png' });
    const event = createPasteEvent([createClipboardFileItem(image)]);
    const emitSpy = vi.spyOn(component.filesSelected, 'emit');

    callOnPaste(component, event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(emitSpy).toHaveBeenCalledWith([image]);
  });

  it('emits multiple pasted images together', () => {
    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const second = new File(['second'], 'second.webp', { type: 'image/webp' });
    const event = createPasteEvent([
      createClipboardFileItem(first),
      createClipboardFileItem(second),
    ]);
    const emitSpy = vi.spyOn(component.filesSelected, 'emit');

    callOnPaste(component, event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(emitSpy).toHaveBeenCalledWith([first, second]);
  });

  it('leaves text-only paste untouched', () => {
    const event = createPasteEvent([
      {
        kind: 'string',
        type: 'text/plain',
        getAsFile: () => null,
      },
    ]);
    const emitSpy = vi.spyOn(component.filesSelected, 'emit');

    callOnPaste(component, event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });
});

function callOnPaste(component: CustomerChatComposerComponent, event: ClipboardEvent): void {
  (component as unknown as { onPaste(event: ClipboardEvent): void }).onPaste(event);
}

function createPasteEvent(items: Partial<DataTransferItem>[]): ClipboardEvent {
  return {
    clipboardData: {
      items,
      files: [],
    },
    preventDefault: vi.fn(),
  } as unknown as ClipboardEvent;
}

function createClipboardFileItem(file: File): Partial<DataTransferItem> {
  return {
    kind: 'file',
    type: file.type,
    getAsFile: () => file,
  };
}

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
