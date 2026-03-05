/**
 * Scene: world-map
 * 
 * Interactive About page / World Map.
 * Shows hotspots driven by about.content.json.
 * Navigable with d-pad, select with A button.
 */

import { KaboomCtx } from 'kaboom';
import aboutContent from '../../content/about.content.json';
import { getInputState, getAndClearOneShots } from '../inputManager';

const MAP_W = 256;
const MAP_H = 240;

export function registerWorldMap(k: KaboomCtx) {
  k.scene('world-map', () => {
    // Sky gradient background
    k.setBackground(100, 149, 237); // Cornflower blue

    // Draw ground
    k.add([
      k.rect(MAP_W, 60),
      k.pos(0, MAP_H - 60),
      k.color(34, 139, 34),
      k.z(0),
    ]);

    // Draw path/road
    k.add([
      k.rect(MAP_W, 8),
      k.pos(0, MAP_H - 40),
      k.color(210, 180, 140),
      k.z(1),
    ]);

    // Title
    k.add([
      k.text('GAME BOX', { size: 16 }),
      k.pos(MAP_W / 2, 20),
      k.anchor('center'),
      k.color(255, 255, 255),
      k.z(10),
    ]);

    k.add([
      k.text('WORLD MAP', { size: 10 }),
      k.pos(MAP_W / 2, 38),
      k.anchor('center'),
      k.color(255, 255, 0),
      k.z(10),
    ]);

    // Check completion flags
    const completed1_1 = localStorage.getItem('completed_1_1') === 'true';

    // Place hotspots
    const hotspots: { obj: any; data: typeof aboutContent.hotspots[0]; idx: number }[] = [];
    let selectedIdx = 0;

    aboutContent.hotspots.forEach((hs, idx) => {
      const isUnlocked = hs.unlocked || (hs.unlockCondition && localStorage.getItem(hs.unlockCondition) === 'true');
      
      const x = hs.x * MAP_W;
      const y = hs.y * MAP_H;

      // Node circle
      const nodeColor = isUnlocked
        ? (hs.id === 'world-1-1' ? [220, 50, 50] : [50, 150, 220])
        : [100, 100, 100];

      const node = k.add([
        k.circle(12),
        k.pos(x, y),
        k.anchor('center'),
        k.color(nodeColor[0], nodeColor[1], nodeColor[2]),
        k.outline(2, k.rgb(255, 255, 255)),
        k.z(5),
        k.area(),
        'hotspot',
        { hsIdx: idx },
      ]);

      // Label
      k.add([
        k.text(hs.label, { size: 6 }),
        k.pos(x, y + 18),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(5),
      ]);

      // Lock icon for locked nodes
      if (!isUnlocked) {
        k.add([
          k.text('🔒', { size: 8 }),
          k.pos(x, y - 2),
          k.anchor('center'),
          k.z(6),
        ]);
      }

      // Completion star
      if (hs.id === 'world-1-1' && completed1_1) {
        k.add([
          k.text('★', { size: 8 }),
          k.pos(x + 14, y - 14),
          k.anchor('center'),
          k.color(255, 215, 0),
          k.z(6),
        ]);
      }

      hotspots.push({ obj: node, data: hs, idx });
    });

    // Selection cursor
    const cursor = k.add([
      k.circle(16),
      k.pos(0, 0),
      k.anchor('center'),
      k.color(255, 255, 0),
      k.opacity(0.3),
      k.z(4),
    ]);

    // Info panel (hidden by default)
    let panelVisible = false;
    const panelBg = k.add([
      k.rect(220, 80),
      k.pos(MAP_W / 2, MAP_H / 2),
      k.anchor('center'),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(20),
    ]);
    const panelText = k.add([
      k.text('', { size: 6, width: 200 }),
      k.pos(MAP_W / 2, MAP_H / 2),
      k.anchor('center'),
      k.color(255, 255, 255),
      k.opacity(0),
      k.z(21),
    ]);
    const panelAction = k.add([
      k.text('', { size: 7 }),
      k.pos(MAP_W / 2, MAP_H / 2 + 32),
      k.anchor('center'),
      k.color(255, 255, 0),
      k.opacity(0),
      k.z(21),
    ]);

    function showPanel(hs: typeof aboutContent.hotspots[0]) {
      panelVisible = true;
      panelBg.opacity = 0.85;
      panelText.opacity = 1;
      panelText.text = hs.description;
      panelAction.opacity = 1;
      
      const isUnlocked = hs.unlocked || (hs.unlockCondition && localStorage.getItem(hs.unlockCondition) === 'true');
      
      if (hs.action === 'play-level' && isUnlocked) {
        panelAction.text = '[A] PLAY  [B] CLOSE';
      } else {
        panelAction.text = '[B] CLOSE';
      }
    }

    function hidePanel() {
      panelVisible = false;
      panelBg.opacity = 0;
      panelText.opacity = 0;
      panelAction.opacity = 0;
    }

    // Navigation cooldown
    let navCooldown = 0;

    // Update loop
    k.onUpdate(() => {
      const input = getInputState();
      const oneShots = getAndClearOneShots();
      navCooldown = Math.max(0, navCooldown - k.dt());

      if (panelVisible) {
        // Panel is open
        if (oneShots.jumpPressed) {
          // A button — play level if applicable
          const hs = hotspots[selectedIdx]?.data;
          if (hs?.action === 'play-level') {
            const isUnlocked = hs.unlocked || (hs.unlockCondition && localStorage.getItem(hs.unlockCondition) === 'true');
            if (isUnlocked) {
              k.go('level-1-1');
            }
          }
        }
        if (input.sprint) {
          // B button — close panel
          hidePanel();
        }
        if (oneShots.restartPressed) {
          k.go('world-map');
        }
        return;
      }

      // Navigate between hotspots
      if (navCooldown <= 0) {
        if (input.right) {
          selectedIdx = (selectedIdx + 1) % hotspots.length;
          navCooldown = 0.2;
        } else if (input.left) {
          selectedIdx = (selectedIdx - 1 + hotspots.length) % hotspots.length;
          navCooldown = 0.2;
        } else if (input.down) {
          selectedIdx = (selectedIdx + 1) % hotspots.length;
          navCooldown = 0.2;
        } else if (input.up) {
          selectedIdx = (selectedIdx - 1 + hotspots.length) % hotspots.length;
          navCooldown = 0.2;
        }
      }

      // Update cursor position
      if (hotspots[selectedIdx]) {
        const hs = hotspots[selectedIdx].data;
        cursor.pos.x = hs.x * MAP_W;
        cursor.pos.y = hs.y * MAP_H;
        // Pulse effect
        cursor.opacity = 0.2 + Math.sin(k.time() * 4) * 0.15;
      }

      // Select with A button
      if (oneShots.jumpPressed && hotspots[selectedIdx]) {
        showPanel(hotspots[selectedIdx].data);
      }

      // RESTART
      if (oneShots.restartPressed) {
        k.go('world-map');
      }
    });

    // Instructions at bottom
    k.add([
      k.text('[D-PAD] Navigate  [A] Select  [R] Restart', { size: 5 }),
      k.pos(MAP_W / 2, MAP_H - 8),
      k.anchor('center'),
      k.color(200, 200, 200),
      k.z(10),
    ]);

    // Draw connecting paths between hotspots
    for (let i = 0; i < aboutContent.hotspots.length - 1; i++) {
      const h1 = aboutContent.hotspots[i];
      const h2 = aboutContent.hotspots[i + 1];
      // Dotted path line
      const x1 = h1.x * MAP_W;
      const y1 = h1.y * MAP_H;
      const x2 = h2.x * MAP_W;
      const y2 = h2.y * MAP_H;
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const dots = Math.floor(dist / 8);
      for (let d = 0; d < dots; d++) {
        const t = d / dots;
        k.add([
          k.circle(1.5),
          k.pos(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t),
          k.anchor('center'),
          k.color(255, 255, 255),
          k.opacity(0.4),
          k.z(2),
        ]);
      }
    }
  });
}
