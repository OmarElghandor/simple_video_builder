export type ScriptScene = {
  narration: string;
  caption: string;
};

export type LessonScript = {
  title: string;
  scenes: ScriptScene[];
};

export type RenderScene = {
  caption: string;
  audioFile: string;
  durationInFrames: number;
};

export type LessonVideoProps = {
  title: string;
  scenes: RenderScene[];
};

export type SceneWithAudio = ScriptScene & {
  durationInFrames: number;
};
