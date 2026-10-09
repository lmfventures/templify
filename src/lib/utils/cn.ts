type ClassValue = string | number | null | undefined | false | ClassValue[];

/** Joins conditional class names. Swap for `clsx` + `tailwind-merge` if you need conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }

  return out.join(' ');
}
