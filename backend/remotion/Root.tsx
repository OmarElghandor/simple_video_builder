import React from 'react';
import { Composition } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { FPS, HEIGHT, WIDTH } from '../src/constants';
import type { LessonVideoProps } from '../src/types';
import { LessonVideo } from './LessonVideo';

const defaultProps: LessonVideoProps = {
  title: 'Sample Lesson',
  scenes: [
    {
      caption: 'Welcome / مرحباً',
      audioFile: 'audio/sample/scene-0.mp3',
      durationInFrames: FPS * 3,
    },
  ],
};

const calculateMetadata: CalculateMetadataFunction<LessonVideoProps> = ({
  props,
}) => {
  const durationInFrames = props.scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );

  return {
    durationInFrames: Math.max(durationInFrames, 1),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LessonVideo"
      component={LessonVideo}
      durationInFrames={FPS * 10}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  );
};
