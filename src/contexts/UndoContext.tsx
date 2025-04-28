import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';

// Define the types for our undo stack
type UndoAction = {
  type: 'ADD' | 'UPDATE' | 'REMOVE';
  entity: 'transaction' | 'import' | 'category' | 'bankAccount' | 'group';
  // TODO
  // biome-ignore lint/suspicious/noExplicitAny: Ignore for now, but we shuld circle back to this
  data: any;
  undo: () => Promise<void>;
};

type UndoState = {
  stack: UndoAction[];
  canUndo: boolean;
};

// Create atoms for the undo stack
const undoStackAtom = atom<UndoAction[]>([]);
const canUndoAtom = atom<boolean>(false);

// Create a derived atom that combines both states
const undoStateAtom = atom(
  (get) => ({
    stack: get(undoStackAtom),
    canUndo: get(canUndoAtom),
  }),
  (_, set, newState: UndoState) => {
    set(undoStackAtom, newState.stack);
    set(canUndoAtom, newState.canUndo);
  }
);

// Create a hook to manage the undo functionality
export function useUndo() {
  const [state, setState] = useAtom(undoStateAtom);

  const pushAction = useCallback(
    (action: UndoAction) => {
      setState({
        stack: [...state.stack, action],
        canUndo: true,
      });
    },
    [state.stack, setState]
  );

  const undo = useCallback(async () => {
    if (state.stack.length === 0) return;

    const lastAction = state.stack[state.stack.length - 1];
    await lastAction.undo();

    setState({
      stack: state.stack.slice(0, -1),
      canUndo: state.stack.length > 1,
    });
  }, [state.stack, setState]);

  return {
    state,
    pushAction,
    undo,
  };
}
