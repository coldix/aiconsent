import pkg from '../../package.json';
export const VERSION = `v${pkg.version}`;
// Build time in Melbourne time, shown in the OZE footer
export const BUILT = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short',
}).format(new Date()).replace(',', '');
export const NAV = [
  ['/', 'Home'], ['/members/', 'Founding Members'], ['/claims/', 'Claims'], ['/twins/', 'Digital Twins'],
  ['/originality/', 'Is Anything Original?'], ['/charter/', 'Charter'], ['/demands/', 'Our Demands'], ['/support/', 'Support'],
] as const;
