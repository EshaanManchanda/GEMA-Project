export function cn(...classes: (string | number | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
