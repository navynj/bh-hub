import { FieldValues, UseFormReturn } from 'react-hook-form';
import { lineBreak } from './text';

export const errorRenderer = <T extends FieldValues>(
  form: UseFormReturn<T>,
  key: keyof T,
  key2?: keyof T
) =>
  form.formState.errors[key] && (
    <div className="w-full mt-1 p-3 text-sm bg-error text-error-foreground text-center rounded-lg">
      {lineBreak(
        key2
          ? (((key as string) +
              ': ' +
              (form.formState.errors[key] as any)?.[key2]?.message) as string)
          : (form.formState.errors[key]?.message as string) ||
              ((form.formState.errors[key]?.root as any)?.message as string)
      )}
    </div>
  );

/**
 * Translates error message if it's a translation key (contains dot and starts with uppercase, e.g., 'Cost.pleaseFill')
 * Otherwise returns the message as is
 */
export const translateErrorMessage = (
  message: string | undefined,
  t: (key: string) => string,
): string | undefined => {
  if (!message) return undefined;
  // Check if message is a translation key (contains dot and starts with uppercase letter)
  const isTranslationKey = /^[A-Z][a-zA-Z]*\..+/.test(message);
  return isTranslationKey ? t(message) : message;
};
