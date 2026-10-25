import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer('angle');
// 8 workers at 1080x1920 has crashed Chrome on 16 GB Macs; 6 is safe.
Config.setConcurrency(6);

// Remotion's bundled headless shell sometimes crashes on macOS ("icudtl.dat not found in bundle").
// If Google Chrome is installed, render with it instead.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (fs.existsSync(CHROME)) Config.setBrowserExecutable(CHROME);
