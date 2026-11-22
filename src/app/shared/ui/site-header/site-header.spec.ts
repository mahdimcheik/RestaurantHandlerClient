import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  it('links to the order page', async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();
    const order = (fixture.nativeElement as HTMLElement).querySelector('a.btn');
    expect(order?.getAttribute('href')).toBe('/commander');
  });
});
