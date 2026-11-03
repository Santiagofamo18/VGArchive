function platformId(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\+/g, ' plus ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeGroup(name, entries) {
  return {
    name,
    platforms: entries.map(([label, catalogKey = null]) => ({ id: platformId(label), name: label, catalogKey })),
  };
}

const MINERVA_PLATFORM_GROUPS = [
  makeGroup('Atari', [
    ['Atari Home Pong'], ['Atari Super Pong'], ['Atari Super Pong Ten'], ['Atari Ultra Pong'], ['Atari Ultra Pong Doubles'],
    ['Atari Stunt Cycle'], ['Atari Video Pinball'], ['Atari 2600', 'atari-2600'], ['Atari 5200', 'atari-5200'],
    ['Atari 2800', 'atari-2600'], ['Atari 7800', 'atari-7800'], ['Atari 2600 Jr.', 'atari-2600'], ['Atari XEGS', 'atari-xegs'],
    ['Atari Lynx', 'atari-lynx'], ['Atari Lynx II', 'atari-lynx'], ['Atari Jaguar', 'atari-jaguar'],
    ['Atari Jaguar CD', 'atari-jaguar-cd'], ['Atari Flashback'], ['Atari VCS', 'atari-2600'],
    ['Atari 2600+', 'atari-2600'], ['Atari 7800+', 'atari-7800'],
  ]),
  makeGroup('Nintendo', [
    ['Color TV-Game 6'], ['Color TV-Game 15'], ['Color TV-Game Racing 112'], ['Color TV-Game Block Kuzushi'], ['Computer TV-Game'],
    ['Game & Watch', 'nintendo-game-watch'], ['Nintendo Entertainment System (NES)', 'nintendo-nes'], ['Famicom Disk System', 'nintendo-fds'],
    ['Game Boy', 'nintendo-game-boy'], ['Super Nintendo (SNES)', 'nintendo-snes'], ['Virtual Boy', 'nintendo-virtual-boy'],
    ['Satellaview', 'nintendo-satellaview'], ['Game Boy Pocket', 'nintendo-game-boy'], ['Nintendo 64', 'nintendo-64'],
    ['Game Boy Light', 'nintendo-game-boy'], ['Game Boy Color', 'nintendo-game-boy-color'], ['Nintendo 64DD', 'nintendo-64dd'],
    ['Game Boy Advance', 'nintendo-gba'], ['Nintendo GameCube', 'nintendo-gamecube'], ['Pokémon Mini', 'nintendo-pokemon-mini'],
    ['Game Boy Advance SP', 'nintendo-gba'], ['iQue Player', 'nintendo-ique'], ['Nintendo DS', 'nintendo-ds'],
    ['Game Boy Micro', 'nintendo-gba'], ['Nintendo DS Lite', 'nintendo-ds'], ['Nintendo Wii', 'nintendo-wii'],
    ['Nintendo DSi', 'nintendo-dsi'], ['Nintendo DSi XL', 'nintendo-dsi'], ['Nintendo 3DS', 'nintendo-3ds'],
    ['Nintendo 3DS XL', 'nintendo-3ds'], ['Wii Mini', 'nintendo-wii'], ['Nintendo Wii U', 'nintendo-wii-u'],
    ['Nintendo 2DS', 'nintendo-3ds'], ['New Nintendo 3DS', 'nintendo-new-3ds'], ['New Nintendo 3DS XL', 'nintendo-new-3ds'],
    ['NES Classic Mini', 'nintendo-nes'], ['New Nintendo 2DS XL', 'nintendo-new-3ds'], ['Nintendo Switch', 'nintendo-switch'],
    ['SNES Classic Mini', 'nintendo-snes'], ['Nintendo Switch Lite', 'nintendo-switch'], ['Game & Watch: Super Mario Bros.', 'nintendo-game-watch'],
    ['Nintendo Switch OLED', 'nintendo-switch'], ['Game & Watch: The Legend of Zelda', 'nintendo-game-watch'], ['Nintendo Switch 2'],
  ]),
  makeGroup('Sony', [
    ['PlayStation', 'sony-ps1'], ['PS one', 'sony-ps1'], ['PlayStation 2', 'sony-ps2'], ['PSX'], ['PlayStation 2 Slim', 'sony-ps2'],
    ['PlayStation Portable (PSP)', 'sony-psp'], ['PlayStation 3', 'sony-ps3'], ['PSP-2000', 'sony-psp'], ['PSP-3000', 'sony-psp'],
    ['PSP Go', 'sony-psp'], ['PlayStation 3 Slim', 'sony-ps3'], ['PSP Street', 'sony-psp'], ['PlayStation Vita', 'sony-vita'],
    ['PlayStation 3 Super Slim', 'sony-ps3'], ['PlayStation Vita Slim', 'sony-vita'], ['PlayStation 4', 'sony-ps4'],
    ['PlayStation TV', 'sony-vita'], ['PlayStation 4 Slim', 'sony-ps4'], ['PlayStation 4 Pro', 'sony-ps4'],
    ['PlayStation Classic', 'sony-ps1'], ['PlayStation 5', 'sony-ps5'], ['PlayStation 5 Digital Edition', 'sony-ps5'],
    ['PlayStation 5 Slim', 'sony-ps5'], ['PlayStation Portal'], ['PlayStation 5 Pro', 'sony-ps5'],
  ]),
  makeGroup('Microsoft', [
    ['Xbox', 'microsoft-xbox'], ['Xbox 360', 'microsoft-xbox-360'], ['Xbox 360 Core', 'microsoft-xbox-360'],
    ['Xbox 360 Elite', 'microsoft-xbox-360'], ['Xbox 360 Arcade', 'microsoft-xbox-360'], ['Xbox 360 S', 'microsoft-xbox-360'],
    ['Xbox 360 E', 'microsoft-xbox-360'], ['Xbox One', 'microsoft-xbox-one'], ['Xbox One S', 'microsoft-xbox-one'],
    ['Xbox One X', 'microsoft-xbox-one'], ['Xbox One S All-Digital', 'microsoft-xbox-one'], ['Xbox Series X', 'microsoft-xbox-series-x'],
    ['Xbox Series S', 'microsoft-xbox-series-s'], ['Xbox Series S 1 TB', 'microsoft-xbox-series-s'],
    ['Xbox Series X Digital Edition', 'microsoft-xbox-series-x'], ['Xbox Series X Galaxy Black', 'microsoft-xbox-series-x'],
    ['ROG Xbox Ally'], ['ROG Xbox Ally X'],
  ]),
  makeGroup('SEGA', [
    ['SEGA SG-1000', 'sega-sg-1000'], ['SEGA SC-3000', 'sega-sg-1000'], ['SEGA SG-1000 II', 'sega-sg-1000'],
    ['SEGA Mark III', 'sega-master-system'], ['SEGA Master System', 'sega-master-system'], ['SEGA Mega Drive / Genesis', 'sega-mega-drive'],
    ['SEGA Game Gear', 'sega-game-gear'], ['SEGA Master System II', 'sega-master-system'], ['SEGA Mega-CD / Sega CD', 'sega-mega-cd'],
    ['SEGA Pico', 'sega-pico'], ['SEGA Mega Drive II', 'sega-mega-drive'], ['SEGA Mega Jet', 'sega-mega-drive'],
    ['SEGA 32X', 'sega-32x'], ['SEGA Saturn', 'sega-saturn'], ['SEGA Genesis Nomad', 'sega-mega-drive'],
    ['SEGA Dreamcast', 'sega-dreamcast'], ['SEGA Advanced Pico Beena', 'sega-beena'], ['SEGA Mega Drive Mini', 'sega-mega-drive'],
    ['SEGA Game Gear Micro', 'sega-game-gear'], ['SEGA Astro City Mini'], ['SEGA Astro City Mini V'], ['SEGA Mega Drive Mini 2', 'sega-mega-drive'],
  ]),
];

const MINERVA_SYSTEM_RULES = [
  [/^Atari - Atari Jaguar CD(?:$| -)/i, 'atari-jaguar-cd'],
  [/^Atari - Jaguar CD Interactive Multimedia System(?:$| -)/i, 'atari-jaguar-cd'],
  [/^Atari - Atari Jaguar(?:$| -)/i, 'atari-jaguar'],
  [/^Atari - Atari Lynx(?:$| -)/i, 'atari-lynx'],
  [/^Atari - Atari 7800(?:$| -)/i, 'atari-7800'],
  [/^Atari - Atari 5200(?:$| -)/i, 'atari-5200'],
  [/^Atari - Atari 2600(?:$| -)/i, 'atari-2600'],
  [/^Atari - 8-bit Family(?:$| -)/i, 'atari-xegs'],
  [/^Nintendo - Game & Watch(?:$| -)/i, 'nintendo-game-watch'],
  [/^Nintendo - Family Computer Disk System(?:$| -)/i, 'nintendo-fds'],
  [/^Nintendo - Nintendo Entertainment System(?:$| -)/i, 'nintendo-nes'],
  [/^Nintendo - Super Nintendo Entertainment System(?:$| -)/i, 'nintendo-snes'],
  [/^Nintendo - Virtual Boy(?:$| -)/i, 'nintendo-virtual-boy'],
  [/^Nintendo - Satellaview(?:$| -)/i, 'nintendo-satellaview'],
  [/^Nintendo - Nintendo 64DD(?:$| -)/i, 'nintendo-64dd'],
  [/^Nintendo - Nintendo 64(?:$| -)/i, 'nintendo-64'],
  [/^Nintendo - New Nintendo 3DS(?:$| -)/i, 'nintendo-new-3ds'],
  [/^Nintendo - Nintendo 3DS(?:$| -)/i, 'nintendo-3ds'],
  [/^Nintendo - Nintendo DSi(?:$| -)/i, 'nintendo-dsi'],
  [/^Nintendo - Nintendo DS(?:$| -)/i, 'nintendo-ds'],
  [/^Nintendo - Game Boy Advance(?:$| -)/i, 'nintendo-gba'],
  [/^Nintendo - Game Boy Color(?:$| -)/i, 'nintendo-game-boy-color'],
  [/^Nintendo - Game Boy(?:$| -)/i, 'nintendo-game-boy'],
  [/^Nintendo - Nintendo GameCube(?:$| -)/i, 'nintendo-gamecube'],
  [/^Nintendo - GameCube(?:$| -)/i, 'nintendo-gamecube'],
  [/^Nintendo - Pokemon Mini(?:$| -)/i, 'nintendo-pokemon-mini'],
  [/^Nintendo - Wii U(?:$| -)/i, 'nintendo-wii-u'],
  [/^Nintendo - Wii(?:$| -)/i, 'nintendo-wii'],
  [/^Nintendo - Nintendo Switch(?:$| -)/i, 'nintendo-switch'],
  [/^iQue(?:$| -)/i, 'nintendo-ique'],
  [/^Sony - PlayStation Portable(?:$| -)/i, 'sony-psp'],
  [/^Sony - PlayStation Vita(?:$| -)/i, 'sony-vita'],
  [/^Sony - PlayStation 5(?:$| -)/i, 'sony-ps5'],
  [/^Sony - PlayStation 4(?:$| -)/i, 'sony-ps4'],
  [/^Sony - PlayStation 3(?:$| -)/i, 'sony-ps3'],
  [/^Sony - PlayStation 2(?:$| -)/i, 'sony-ps2'],
  [/^Sony - PlayStation(?:$| -)/i, 'sony-ps1'],
  [/^Microsoft - Xbox 360(?:$| -)/i, 'microsoft-xbox-360'],
  [/^Microsoft - Xbox One(?:$| -)/i, 'microsoft-xbox-one'],
  [/^Microsoft - Xbox Series X(?:$| -)/i, 'microsoft-xbox-series-x'],
  [/^Microsoft - Xbox Series S(?:$| -)/i, 'microsoft-xbox-series-s'],
  [/^Microsoft - Xbox(?:$| -)/i, 'microsoft-xbox'],
  [/^Sega - SG-1000(?:$| -)/i, 'sega-sg-1000'],
  [/^Sega - Master System - Mark III(?:$| -)/i, 'sega-master-system'],
  [/^Sega - Master System(?:$| -)/i, 'sega-master-system'],
  [/^Sega - Mega Drive - Genesis(?:$| -)/i, 'sega-mega-drive'],
  [/^Sega - Genesis Nomad(?:$| -)/i, 'sega-mega-drive'],
  [/^Sega - Mega CD & Sega CD(?:$| -)/i, 'sega-mega-cd'],
  [/^Sega - Sega Mega CD \+ Sega CD(?:$| -)/i, 'sega-mega-cd'],
  [/^Sega - Game Gear(?:$| -)/i, 'sega-game-gear'],
  [/^Sega - Dreamcast(?:$| -)/i, 'sega-dreamcast'],
  [/^Sega - Sega Saturn(?:$| -)/i, 'sega-saturn'],
  [/^Sega - Saturn(?:$| -)/i, 'sega-saturn'],
  [/^Sega - PICO(?:$| -)/i, 'sega-pico'],
  [/^Sega - Beena(?:$| -)/i, 'sega-beena'],
  [/^Sega - 32X(?:$| -)/i, 'sega-32x'],
];

const MINERVA_PLATFORM_BY_ID = new Map(MINERVA_PLATFORM_GROUPS.flatMap((group) => group.platforms).map((platform) => [platform.id, platform]));
const MINERVA_PLATFORM_LABEL_BY_KEY = new Map();
for (const group of MINERVA_PLATFORM_GROUPS) {
  for (const platform of group.platforms) {
    if (platform.catalogKey && !MINERVA_PLATFORM_LABEL_BY_KEY.has(platform.catalogKey)) {
      MINERVA_PLATFORM_LABEL_BY_KEY.set(platform.catalogKey, { name: platform.name, group: group.name });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MINERVA_PLATFORM_GROUPS, MINERVA_SYSTEM_RULES, MINERVA_PLATFORM_BY_ID, MINERVA_PLATFORM_LABEL_BY_KEY };
} else if (typeof window !== 'undefined') {
  window.MINERVA_PLATFORM_GROUPS = MINERVA_PLATFORM_GROUPS;
}
