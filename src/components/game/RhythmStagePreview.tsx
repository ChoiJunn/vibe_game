import Image from 'next/image';

type RhythmStagePreviewProps = Readonly<{
  className?: string;
  compact?: boolean;
}>;

export function RhythmStagePreview({ className, compact = false }: RhythmStagePreviewProps) {
  const classes = ['rhythm-preview', className].filter(Boolean).join(' ');

  return (
    <div className={classes} data-compact={compact ? 'true' : undefined} aria-hidden="true">
      <Image
        className="rhythm-preview__background"
        src="/game/art/background/arrival.png"
        alt=""
        width={1280}
        height={720}
        sizes="(max-width: 560px) 100vw, (max-width: 1100px) 92vw, 68vw"
        preload
      />
      <div className="rhythm-preview__shade" />
      <div className="rhythm-preview__light rhythm-preview__light--mint" />
      <div className="rhythm-preview__light rhythm-preview__light--coral" />

      <div className="rhythm-preview__label">
        <span>OFFICE MORNING</span>
        <strong>출근길의 첫 박자</strong>
      </div>

      <Image
        className="rhythm-preview__character"
        src="/game/art/character/protagonist-perfect.png"
        alt=""
        width={320}
        height={320}
        sizes="(max-width: 560px) 48vw, 34vw"
        loading="eager"
      />
      <Image
        className="rhythm-preview__moka"
        src="/game/art/mascot/moka-perfect.png"
        alt=""
        width={128}
        height={128}
        sizes="(max-width: 560px) 20vw, 14vw"
        loading="eager"
      />

      <div className="rhythm-preview__lane">
        <span className="rhythm-preview__hit-line" />
        <span className="rhythm-preview__note rhythm-preview__note--one">●</span>
        <span className="rhythm-preview__note rhythm-preview__note--two">◆</span>
        <span className="rhythm-preview__note rhythm-preview__note--three">●</span>
        <span className="rhythm-preview__note rhythm-preview__note--four">◆</span>
      </div>
      <span className="rhythm-preview__sparkle rhythm-preview__sparkle--one">✦</span>
      <span className="rhythm-preview__sparkle rhythm-preview__sparkle--two">♪</span>
    </div>
  );
}
