// src/utils/animationManager.js
import { getElementCenter, getElementById } from './domUtils';
import { nextTick } from 'vue';

// Base class/styling for temporary stone elements
const STONE_STYLE = {
    position: 'fixed', // Use fixed to position relative to viewport
    width: '20px', // Size of the animating stone
    height: '20px',
    backgroundColor: '#666', // Dark gray color for stones
    borderRadius: '50%',
    pointerEvents: 'none', // Cannot interact with it
    zIndex: 1000, // High z-index to be visible above board
    transition: 'transform linear', // Basic linear transition
    transform: 'translate(-50%, -50%)', // Center the element on its {x, y} coordinates
};

// Create a single temporary stone element
function createStoneElement() {
    const stone = document.createElement('div');
    Object.assign(stone.style, STONE_STYLE);
    return stone;
}

// Set the position and duration for animation
function setStonePosition(stoneElement, x, y, durationMs) {
    stoneElement.style.transitionDuration = `${durationMs}ms`;
    stoneElement.style.left = `${x}px`;
    stoneElement.style.top = `${y}px`;
}

/**
 * Animates a single stone moving from a source to a target position.
 * @param {{x: number, y: number}} sourcePos
 * @param {{x: number, y: number}} targetPos
 * @param {number} durationMs
 * @returns {Promise<void>} Resolves when the animation is complete.
 */
export async function animateSingleStone(sourcePos, targetPos, durationMs) {
    if (!sourcePos || !targetPos) {
         console.error("animateSingleStone: Missing source or target position.");
         return Promise.resolve(); // Skip animation if positions are invalid
    }

    const stone = createStoneElement();
    document.body.appendChild(stone); // Append to body for fixed positioning

    // Set initial position
    setStonePosition(stone, sourcePos.x, sourcePos.y, 0); // Duration 0 for instant placement

    // Use requestAnimationFrame for the next frame to start the transition
    await new Promise(requestAnimationFrame);

    // Set the target position and duration to start the animation
    setStonePosition(stone, targetPos.x, targetPos.y, durationMs);

    // Wait for the transition to end
    await new Promise(resolve => {
        const handleTransitionEnd = () => {
            stone.removeEventListener('transitionend', handleTransitionEnd);
            resolve();
        };
        stone.addEventListener('transitionend', handleTransitionEnd);

        // Fallback timeout in case transitionend doesn't fire (e.g., duration is 0 or element removed)
        setTimeout(resolve, durationMs + 50); // A little buffer
    });

    // Clean up the stone element after animation
    stone.remove();
}

/**
 * Animates the sowing process stone by stone.
 * Assumes pit stone counts are updated IN STATE *after* each stone animation resolves.
 * @param {string} startPitId - The ID of the pit the stones were picked up from.
 * @param {string[]} sequencePitIds - Array of pit IDs in the order stones are dropped.
 * @param {Map<string, {x: number, y: number}>} pitPositions - Map of pit ID to center coordinates.
 * @param {number} totalStones - Total number of stones being sown in this sequence.
 * @returns {Promise<void>} Resolves when all stone animations for this sequence are complete.
 */
export async function animateSowing(startPitId, sequencePitIds, pitPositions, totalStones) {
    console.log(`animateSowing: Starting animation from "${startPitId}", sequence: [${sequencePitIds.join(', ')}], total stones: ${totalStones}`);
    const startPos = pitPositions.get(startPitId);
     if (!startPos) {
         console.error(`animateSowing: Start pit position not found for "${startPitId}".`);
         return; // Cannot animate
     }

    let currentStoneSourcePos = startPos;
    let stoneCount = 0;

    for (const targetPitId of sequencePitIds) {
        const targetPos = pitPositions.get(targetPitId);
         if (!targetPos) {
             console.error(`animateSowing: Target pit position not found for "${targetPitId}".`);
             // Decide how to handle this - continue without animating this stone or stop? Let's stop for now.
             return;
         }

        stoneCount++;
         // Optional: Adjust duration based on distance or just use a fixed time per step
        const durationPerStep = 100; // ms per pit traversal

        // Animate one stone moving from the *previous* position to the *current* target pit
        await animateSingleStone(currentStoneSourcePos, targetPos, durationPerStep);

        // After animation, the stone "lands". Update its source position for the *next* stone animation
        // The next stone animation starts from the pit the previous stone just landed in.
        currentStoneSourcePos = targetPos;

        // --- State Update Simulation (handled by the store action, not here) ---
        // The store action (sowStones) is responsible for calling _updatePitStones(targetPitId, pit.stones + 1)
        // *after* the await animateSingleStone call returns for each logical stone drop.
        // This animation manager is purely visual.
        // ----------------------------------------------------------------------

        // Add a small delay *after* the stone lands before the next one starts moving
         await new Promise(resolve => setTimeout(resolve, 20)); // Tiny pause between stone drops
    }
     console.log("animateSowing: All stones animated.");
}

/**
 * Animates stones being collected from pits to a score area.
 * Can be batched or sequential. Let's start with sequential capture animation.
 * @param {string[]} capturedPitIds - Array of pit IDs that were just captured.
 * @param {{x: number, y: number}} scoreAreaPos - Center coordinates of the player's score area.
 * @param {Map<string, {x: number, y: number}>} pitPositions - Map of pit ID to center coordinates.
 * @returns {Promise<void>} Resolves when all capture animations are complete.
 */
export async function animateCapture(capturedPitIds, scoreAreaPos, pitPositions) {
     console.log(`animateCapture: Starting animation for pits [${capturedPitIds.join(', ')}] to score area.`);
    if (!scoreAreaPos) {
        console.error("animateCapture: Score area position not provided.");
        return; // Cannot animate
    }

    for (const pitId of capturedPitIds) {
        const pitPos = pitPositions.get(pitId);
         if (!pitPos) {
             console.error(`animateCapture: Captured pit position not found for "${pitId}".`);
             continue; // Skip this pit, try the next one
         }

        // In a real game, you might animate multiple stones or a representation of the collected stones.
        // For simplicity, let's animate a single element representing the batch.
        // Get the stone count BEFORE the store logic sets it to 0
        // (This means the store logic should pass the stone count here, or this reads the current state)
        // Let's assume the store passes the stone count *before* updating the state.
        // But it's cleaner if the animation reads the *previous* state if possible.
        // Alternative: The store updates state to 0, and the animation uses the pit's *old* stone count passed as a parameter.

        // Let's assume the store passes { id, stonesCaptured } for each captured pit.
        // This requires changing the processCaptures action slightly.

        // --- Revised approach: animate one element per pit capture ---
         const duration = 300; // ms for capture animation

         // Animate a single element moving from pit to score area
         await animateSingleStone(pitPos, scoreAreaPos, duration);

         // Add a small delay between animating collection from different pits
         await new Promise(resolve => setTimeout(resolve, 100));

         // --- State Update Simulation (handled by store) ---
         // The store action (processCaptures) is responsible for updating player score
         // and setting the captured pit stones to 0 *after* the await returns.
         // ----------------------------------------------------
    }
    console.log("animateCapture: All capture animations finished.");
}


// Function to get all pit positions on the board
// This needs to be called by the Board component or a parent component
export function updatePitPositions(pitsData) {
    const positions = new Map();
    pitsData.forEach(pit => {
        const element = getElementById(pit.id);
        const center = getElementCenter(element);
        if (center) {
            positions.set(pit.id, center);
        } else {
            console.warn(`updatePitPositions: Could not get position for pit "${pit.id}". Element not found?`);
        }
    });
    // console.log("updatePitPositions: Got positions for pits:", Array.from(positions.keys())); // Chatty
    return positions; // Return the map
}

// Function to get the score area position for a player
export function getScoreAreaPosition(playerId) {
     const scoreAreaElement = getElementById(`player-score-${playerId}`); // Assuming PlayerInfo uses this ID pattern
     return getElementCenter(scoreAreaElement);
}