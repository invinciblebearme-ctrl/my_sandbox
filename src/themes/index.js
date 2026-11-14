// Every theme and its monsters (and player items). Add a theme here to show it in the viewer.
import graveyard from './graveyard/index.js';
import campground from './campground/index.js';
import snow from './snow/index.js';
import desert from './desert/index.js';
import space from './space/index.js';
import playground from './playground/index.js';
import alley from './alley/index.js'; // backup of the first neighborhood set
import edu from '../edu/index.js'; // separate game: educational ARPG (cute, no gore)

export const THEMES = { campground, snow, desert, space, playground, graveyard, alley, edu };
