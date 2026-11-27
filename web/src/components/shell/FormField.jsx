import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Wrapper DRY de campo de formulário com min-w-0 (evita overflow em CSS Grid) e espaçamento consistente.
 */
export function FormField({ label, className, children }) {
  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      {label && <Label className="block leading-snug">{label}</Label>}
      {children}
    </div>
  );
}
