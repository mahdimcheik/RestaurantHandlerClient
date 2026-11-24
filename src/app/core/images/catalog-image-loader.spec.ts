import { catalogImageLoader } from './catalog-image-loader';

const photo = 'http://localhost:9000/bucket/catalog/2026/11/abc-w1200.webp';

describe('catalogImageLoader', () => {
  it('choisit la plus petite taille qui couvre la largeur demandée', () => {
    expect(catalogImageLoader({ src: photo, width: 90 })).toBe(photo.replace('-w1200', '-w160'));
    expect(catalogImageLoader({ src: photo, width: 320 })).toBe(photo.replace('-w1200', '-w320'));
    expect(catalogImageLoader({ src: photo, width: 700 })).toBe(photo);
  });

  it('plafonne à la plus grande taille', () => {
    expect(catalogImageLoader({ src: photo, width: 1600 })).toBe(photo);
  });

  it('rend l’URL telle quelle sans largeur demandée', () => {
    expect(catalogImageLoader({ src: photo.replace('-w1200', '-w640') })).toBe(
      photo.replace('-w1200', '-w640'),
    );
  });

  it('ne touche ni aux photos à taille unique ni aux autres images', () => {
    const legacy = 'http://localhost:9000/bucket/catalog/2026/11/abc.webp';
    expect(catalogImageLoader({ src: legacy, width: 90 })).toBe(legacy);
    expect(catalogImageLoader({ src: 'https://ik.imagekit.io/x/margaritta.png', width: 90 })).toBe(
      'https://ik.imagekit.io/x/margaritta.png',
    );
    expect(catalogImageLoader({ src: '/images/coupe.webp', width: 90 })).toBe('/images/coupe.webp');
  });
});
