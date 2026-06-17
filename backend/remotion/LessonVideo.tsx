import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import type { LessonVideoProps } from '../src/types';

function SceneSlide({
  caption,
  audioSrc,
}: {
  caption: string;
  audioSrc: string;
}) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Audio src={audioSrc} />
      <div
        style={{
          color: '#ffffff',
          fontSize: 48,
          textAlign: 'center',
          padding: 80,
          lineHeight: 1.4,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
}

export const LessonVideo: React.FC<LessonVideoProps> = ({ scenes }) => {
  return (
    <Series>
      {scenes.map((scene, index) => (
        <Series.Sequence
          key={index}
          durationInFrames={scene.durationInFrames}
        >
          <SceneSlide
            caption={scene.caption}
            audioSrc={staticFile(scene.audioFile)}
          />
        </Series.Sequence>
      ))}
    </Series>
  );
};
