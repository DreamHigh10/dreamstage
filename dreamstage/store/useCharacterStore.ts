import { create } from 'zustand';
import { syncBus } from '@/lib/sync';

export interface CharacterState {
  isVisible: boolean;
  isSpeaking: boolean;
  text: string;
}

interface AppState {
  dream: CharacterState;
  sidekick: CharacterState;
  updateCharacter: (name: 'dream' | 'sidekick', state: Partial<CharacterState>) => void;
  showCharacters: () => void;
  hideCharacters: () => void;
}

const defaultState: CharacterState = {
  isVisible: false,
  isSpeaking: false,
  text: '',
};

export const useCharacterStore = create<AppState>((set, get) => ({
  dream: { ...defaultState },
  sidekick: { ...defaultState },

  updateCharacter: (name, state) => {
    set((prev) => {
      const newState = { ...prev[name], ...state };
      return { [name]: newState };
    });

    // Broadcast the change
    const updatedState = get()[name];
    syncBus.emit({
      type: 'CHARACTER_STATE_CHANGE',
      payload: {
        character: name,
        ...updatedState,
      }
    });
  },

  showCharacters: () => {
    set((prev) => ({
      dream: { ...prev.dream, isVisible: true },
      sidekick: { ...prev.sidekick, isVisible: true },
    }));
    syncBus.emit({ type: 'WAKE_WORD_DETECTED' });
  },

  hideCharacters: () => {
    set((prev) => ({
      dream: { ...prev.dream, isVisible: false, isSpeaking: false, text: '' },
      sidekick: { ...prev.sidekick, isVisible: false, isSpeaking: false, text: '' },
    }));
    syncBus.emit({ type: 'DISMISS_CHARACTERS' });
  }
}));

// Initialize syncing logic: listen to bus events and update local store
if (typeof window !== 'undefined') {
  syncBus.subscribe((event) => {
    const store = useCharacterStore.getState();

    if (event.type === 'WAKE_WORD_DETECTED') {
       useCharacterStore.setState({
         dream: { ...store.dream, isVisible: true },
         sidekick: { ...store.sidekick, isVisible: true },
       });
    } else if (event.type === 'DISMISS_CHARACTERS') {
       useCharacterStore.setState({
         dream: { ...store.dream, isVisible: false, isSpeaking: false, text: '' },
         sidekick: { ...store.sidekick, isVisible: false, isSpeaking: false, text: '' },
       });
    } else if (event.type === 'CHARACTER_STATE_CHANGE') {
       useCharacterStore.setState({
         [event.payload.character]: {
           isVisible: event.payload.isVisible,
           isSpeaking: event.payload.isSpeaking,
           text: event.payload.text || '',
         }
       });
    }
  });
}
