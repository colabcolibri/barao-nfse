import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shell/FormField';

/**
 * Dialog reutilizável de confirmação destrutiva que exige digitar uma palavra-chave (ex: "CANCELAR").
 */
export function ConfirmDangerDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord = 'CANCELAR',
  confirmLabel = 'Confirmar',
  onConfirm,
  children
}) {
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTyped('');
      setSubmitting(false);
    }
  }, [open]);

  const isMatch = typed.trim().toUpperCase() === confirmWord.toUpperCase();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isMatch || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {children}

          <FormField label={`Digite ${confirmWord} para confirmar *`}>
            <Input
              required
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              className="font-mono-num uppercase"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={!isMatch || submitting}>
              {submitting ? 'Processando...' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
