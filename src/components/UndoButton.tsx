import { Button } from '@/components/ui/button';
import { useUndo } from '@/contexts/UndoContext';
import { Undo } from 'lucide-react';

export function UndoButton() {
  const { state, undo } = useUndo();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={undo}
      disabled={!state.canUndo}
      title="Undo last action"
    >
      <Undo className="h-4 w-4" />
    </Button>
  );
}
