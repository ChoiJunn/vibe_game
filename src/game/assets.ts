import type { SectionId } from '@/domain/rhythm';

type AssetReference = { key: string; path: string };
type SectionAssets = Record<SectionId, AssetReference>;
type BackgroundAssets = SectionAssets & { fever: AssetReference };

export const GAME_ASSETS = {
  backgrounds: {
    arrival: { key: 'background-arrival', path: '/game/art/background/arrival.png' },
    keyboard: { key: 'background-keyboard', path: '/game/art/background/keyboard.png' },
    mail: { key: 'background-mail', path: '/game/art/background/mail.png' },
    meeting: { key: 'background-meeting', path: '/game/art/background/meeting.png' },
    copy: { key: 'background-copy', path: '/game/art/background/copy.png' },
    departure: { key: 'background-departure', path: '/game/art/background/departure.png' },
    fever: { key: 'background-fever', path: '/game/art/background/fever-stage.png' },
  } satisfies BackgroundAssets,
  feverBackgrounds: {
    arrival: { key: 'background-fever-arrival', path: '/game/art/background/fever-arrival.png' },
    keyboard: { key: 'background-fever-keyboard', path: '/game/art/background/fever-keyboard.png' },
    mail: { key: 'background-fever-mail', path: '/game/art/background/fever-mail.png' },
    meeting: { key: 'background-fever-meeting', path: '/game/art/background/fever-meeting.png' },
    copy: { key: 'background-fever-copy', path: '/game/art/background/fever-copy.png' },
    departure: { key: 'background-fever-departure', path: '/game/art/background/fever-departure.png' },
  } satisfies SectionAssets,
  protagonist: {
    walkA: { key: 'protagonist-walk-a', path: '/game/art/character/protagonist-walk-a.png' },
    walkB: { key: 'protagonist-walk-b', path: '/game/art/character/protagonist-walk-b.png' },
    good: { key: 'protagonist-good', path: '/game/art/character/protagonist-good.png' },
    perfect: { key: 'protagonist-perfect', path: '/game/art/character/protagonist-perfect.png' },
    miss: { key: 'protagonist-miss', path: '/game/art/character/protagonist-miss.png' },
    fever: { key: 'protagonist-fever', path: '/game/art/character/protagonist-fever.png' },
    feverGood: { key: 'protagonist-fever-good', path: '/game/art/character/protagonist-fever-good.png' },
    feverPerfect: { key: 'protagonist-fever-perfect', path: '/game/art/character/protagonist-fever-perfect.png' },
    feverMiss: { key: 'protagonist-fever-miss', path: '/game/art/character/protagonist-fever-miss.png' },
  },
  moka: {
    tumbler: { key: 'moka-tumbler', path: '/game/art/mascot/moka-tumbler.png' },
    deskCup: { key: 'moka-desk-cup', path: '/game/art/mascot/moka-desk-cup.png' },
    good: { key: 'moka-good', path: '/game/art/mascot/moka-good.png' },
    perfect: { key: 'moka-perfect', path: '/game/art/mascot/moka-perfect.png' },
    miss: { key: 'moka-miss', path: '/game/art/mascot/moka-miss.png' },
    fever: { key: 'moka-fever', path: '/game/art/mascot/moka-fever.png' },
    feverGood: { key: 'moka-fever-good', path: '/game/art/mascot/moka-fever-good.png' },
    feverPerfect: { key: 'moka-fever-perfect', path: '/game/art/mascot/moka-fever-perfect.png' },
    feverMiss: { key: 'moka-fever-miss', path: '/game/art/mascot/moka-fever-miss.png' },
  },
  notes: {
    arrival: { key: 'note-arrival', path: '/game/art/notes/arrival.png' },
    keyboard: { key: 'note-keyboard', path: '/game/art/notes/keyboard.png' },
    mail: { key: 'note-mail', path: '/game/art/notes/mail.png' },
    meeting: { key: 'note-meeting', path: '/game/art/notes/meeting.png' },
    copy: { key: 'note-copy', path: '/game/art/notes/copy.png' },
    departure: { key: 'note-departure', path: '/game/art/notes/departure.png' },
  } satisfies SectionAssets,
} as const;
