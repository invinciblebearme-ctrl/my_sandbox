// Player outfits, one per theme (same rig and animations for all).
import { createPlayer, PLAYER_DEFAULTS, PLAYER_SCHEMA } from './player.js';

// theme: the outfit's home theme (the gallery hands it that theme's ranged weapon)
const outfit = (label, role, theme, over) => ({
  label, role, theme, defaults: { ...PLAYER_DEFAULTS, ...over }, schema: PLAYER_SCHEMA, build: createPlayer,
});

export const PLAYERS = {
  survivor: outfit('생존자', '🪦 묘지', 'graveyard', {
    seed: 1, shirtColor: '#5a6a5a', pantsColor: '#3a4a6a', headgear: 'hood', headgearColor: '#4a5a4a', backpack: true,
  }),
  camper: outfit('캠퍼', '🏕️ 캠핑장', 'campground', {
    seed: 2, shirtColor: '#a83a32', pantsColor: '#5a5a3a', headgear: 'beanie', headgearColor: '#d8a83a', backpack: true,
    backpackColor: '#3a6a8a', vest: true, vestColor: '#4a6a3a',
  }),
  mountaineer: outfit('등산가', '❄️ 눈 마을', 'snow', {
    seed: 3, shirtColor: '#3a7ad8', pantsColor: '#2a2e3a', headgear: 'hood', headgearColor: '#3a7ad8', scarf: true,
    scarfColor: '#d8302a', gloves: true, gloveColor: '#2a2a2a', backpack: true, backpackColor: '#d88a2a',
  }),
  ranger: outfit('레인저', '🤠 사막 마을', 'desert', {
    seed: 4, skinColor: '#c8946a', shirtColor: '#c9b48a', pantsColor: '#4a5a78', headgear: 'cowboy', headgearColor: '#6b4a2e',
    vest: true, vestColor: '#6a4428', scarf: true, scarfColor: '#9a2a22', backpack: false,
  }),
  engineer: outfit('기지 정비사', '🚀 우주 기지', 'space', {
    seed: 5, shirtColor: '#e87a2a', pantsColor: '#e87a2a', headgear: 'headset', headgearColor: '#3a3e46', gloves: true,
    gloveColor: '#d8dde2', backpack: false, vest: true, vestColor: '#5a626e',
  }),
  kid: outfit('동네 아이', '🛝 동네 놀이터', 'playground', {
    seed: 6, height: 0.88, build: 0.9, skinColor: '#f0c8a4', shirtColor: '#e8c03a', pantsColor: '#3a5a9a',
    headgear: 'cap', headgearColor: '#d8302a', backpack: true, backpackColor: '#5a9ad8',
  }),
};
