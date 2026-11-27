import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Wrapper DRY sobre o Select oficial do shadcn/Base UI.
 * Mantém os componentes ui/* intocados, quebra linhas longas dentro da largura do campo
 * e usa ScrollArea vertical sem cortar bordas arredondadas.
 */
export function FieldSelect({ value, onValueChange, placeholder = t('common.actions.selectPlaceholder'), options = [], className }) {
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <Select value={value ?? ''} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-full min-w-0 max-w-full overflow-hidden', className)}>
        <SelectValue placeholder={placeholder} className="min-w-0 flex-1 overflow-hidden">
          <span className="block min-w-0 truncate text-left">
            {selectedLabel || placeholder}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="w-(--anchor-width) min-w-44 overflow-hidden p-0 [&_[data-slot=select-scroll-up-button]]:hidden [&_[data-slot=select-scroll-down-button]]:hidden"
      >
        <ScrollArea className="w-full overflow-hidden [&_[data-slot=scroll-area-viewport]]:max-h-68 [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full">
          <div className="p-1">
            {options.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="h-auto py-1.5 leading-snug [&>*:first-child]:min-w-0 [&>*:first-child]:shrink [&>*:first-child]:whitespace-normal [&>*:first-child]:break-words"
              >
                {opt.label}
              </SelectItem>
            ))}
          </div>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
