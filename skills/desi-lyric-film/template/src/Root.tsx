import React from 'react';
import {Composition} from 'remotion';
import {LyricFilm} from './engine';
import {DURATION, FPS, H, W} from './theme';

export const Root: React.FC = () => <Composition id="LyricFilm" component={LyricFilm} durationInFrames={DURATION} fps={FPS} width={W} height={H} />;
