import { cn } from '@/lib/utils';

export const lineBreak = (text?: string, className?: string) => {
  const textArr = text?.split('\n\n').map((item) => item.split('\n'));
  return textArr?.map((p, i) => (
    <span key={i} className={cn('block', className)}>
      {p.map((line, j) => (
        <span className="block" key={j}>
          {line}
          {j < p.length - 1 && <br />}
        </span>
      ))}
      {i < textArr.length - 1 && <br />}
    </span>
  ));
};

export const checkRichTextEmpty = (text: string) => {
  const regex = /(<([^>]+)>)/gi;
  return text.includes('<img')
    ? true
    : !!text?.replace(regex, '')?.trim()?.length;
};

export function generateValidHandle(vendor: string) {
  return vendor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
