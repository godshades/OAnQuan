// src/utils/boardUtils.js

/**
 * Generates the initial pit data structure for the 2-player horizontal rectangle layout.
 * Order follows the visual counter-clockwise path around the board, starting at q0.
 * [q0, p0_d0..d4, q1, p1_d0..d4]
 * @param {number} playerCount (Must be 2)
 * @param {number} quanValue
 * @param {number} dânPitsPerPlayer (Must be 5)
 * @returns {Array<Object>} Array of pit objects.
 */
function generateHorizontalRectanglePits(playerCount, quanValue, dânPitsPerPlayer) {
    console.log(`generateHorizontalRectanglePits: Called for ${playerCount} players, ${dânPitsPerPlayer} dân pits per player, quanValue ${quanValue}.`);
    if (playerCount !== 2 || dânPitsPerPlayer !== 5) {
        console.error("generateHorizontalRectanglePits: Incorrect parameters. Supports only 2 players, 5 dân pits.");
        return []; // Return empty on error
    }
    const pits = [];
    // q0 (index 0)
    pits.push({ id: 'q0', type: 'quan', owner: null, stones: quanValue });
    // p0_d0..d4 (indices 1-5)
    for (let i = 0; i < dânPitsPerPlayer; i++) {
        pits.push({ id: `p0_d${i}`, type: 'dan', owner: 0, stones: 5 });
    }
    // q1 (index 6)
    pits.push({ id: 'q1', type: 'quan', owner: null, stones: quanValue });
    // p1_d0..d4 (indices 7-11) - Added in CCW order from q1
    for (let i = 0; i < dânPitsPerPlayer; i++) {
        pits.push({ id: `p1_d${i}`, type: 'dan', owner: 1, stones: 5 });
    }
    console.log("generateHorizontalRectanglePits: Generated pit order (CCW):", pits.map(p => p.id).join(', '));
    return pits;
}

/**
 * Generates the initial pit data structure for the 3-player triangle layout.
 * Order follows a visual counter-clockwise path around the board, starting at q0.
 * [q0, p0_d0..d4, q1, p1_d0..d4, q2, p2_d0..d4]
 * @param {number} playerCount (Must be 3)
 * @param {number} quanValue
 * @param {number} dânPitsPerPlayer (Must be 5)
 * @returns {Array<Object>} Array of pit objects.
 */
function generateTrianglePits(playerCount, quanValue, dânPitsPerPlayer) {
    console.log(`generateTrianglePits: Called for ${playerCount} players, ${dânPitsPerPlayer} dân pits per player, quanValue ${quanValue}.`);
    if (playerCount !== 3 || dânPitsPerPlayer !== 5) {
        console.error("generateTrianglePits: Incorrect parameters. Supports only 3 players, 5 dân pits.");
        return []; // Return empty on error
    }
    const pits = [];
    // Loop through players/sides
    for (let p = 0; p < playerCount; p++) {
        // Add Quan pit for this corner
        pits.push({ id: `q${p}`, type: 'quan', owner: null, stones: quanValue });
        // Add Dân pits for this player's side
        for (let i = 0; i < dânPitsPerPlayer; i++) {
            pits.push({ id: `p${p}_d${i}`, type: 'dan', owner: p, stones: 5 });
        }
    }
    console.log("generateTrianglePits: Generated pit order (CCW):", pits.map(p => p.id).join(', '));
    // Expected: q0, p0_d0..d4, q1, p1_d0..d4, q2, p2_d0..d4 (Total 18)
    return pits;
}

/**
 * Generates the initial pit data structure for the 4-player square layout.
 * Order follows a visual counter-clockwise path around the board, starting at q0.
 * [q0, p0_d0..d4, q1, p1_d0..d4, q2, p2_d0..d4, q3, p3_d0..d4]
 * @param {number} playerCount (Must be 4)
 * @param {number} quanValue
 * @param {number} dânPitsPerPlayer (Must be 5)
 * @returns {Array<Object>} Array of pit objects.
 */
function generateSquarePits(playerCount, quanValue, dânPitsPerPlayer) {
    console.log(`generateSquarePits: Called for ${playerCount} players, ${dânPitsPerPlayer} dân pits per player, quanValue ${quanValue}.`);
    if (playerCount !== 4 || dânPitsPerPlayer !== 5) {
        console.error("generateSquarePits: Incorrect parameters. Supports only 4 players, 5 dân pits.");
        return []; // Return empty on error
    }
    const pits = [];
    // Loop through players/sides
    for (let p = 0; p < playerCount; p++) {
        // Add Quan pit for this corner
        pits.push({ id: `q${p}`, type: 'quan', owner: null, stones: quanValue });
        // Add Dân pits for this player's side
        for (let i = 0; i < dânPitsPerPlayer; i++) {
            pits.push({ id: `p${p}_d${i}`, type: 'dan', owner: p, stones: 5 });
        }
    }
    console.log("generateSquarePits: Generated pit order (CCW):", pits.map(p => p.id).join(', '));
    // Expected: q0, p0_d0..d4, q1, p1_d0..d4, q2, p2_d0..d4, q3, p3_d0..d4 (Total 24)
    return pits;
}


/**
 * Generates the initial pit data structure based on layout type and player count.
 * Delegates to layout-specific functions.
 * @param {number} playerCount
 * @param {number} quanValue
 * @param {number} dânPitsPerPlayer
 * @param {string} layoutType - 'rectangle', 'triangle', 'square'
 * @returns {Array<Object>} Array of pit objects
 */
export function generateInitialPits(playerCount, quanValue, dânPitsPerPlayer, layoutType) {
     console.log(`generateInitialPits: Called with playerCount=${playerCount}, quanValue=${quanValue}, dânPitsPerPlayer=${dânPitsPerPlayer}, layoutType=${layoutType}.`);

     // Call the appropriate generator based on explicitly passed layoutType
     if (layoutType === 'rectangle' && playerCount === 2) {
         return generateHorizontalRectanglePits(playerCount, quanValue, dânPitsPerPlayer);
     } else if (layoutType === 'triangle' && playerCount === 3) {
         return generateTrianglePits(playerCount, quanValue, dânPitsPerPlayer);
     } else if (layoutType === 'square' && playerCount === 4) {
         return generateSquarePits(playerCount, quanValue, dânPitsPerPlayer);
     } else {
         console.error(`generateInitialPits: Unsupported layout/player count combination: ${layoutType}/${playerCount}. Falling back to 2-player rectangle.`);
         // Fallback to default 2-player rectangle if combination is invalid
         return generateHorizontalRectanglePits(2, 10, 5);
     }
}


/**
 * Gets the ID of the next pit in sequence based on direction and layout.
 * Relies on pitsData array being in the correct circular CCW order for the layout.
 * 'right' maps to moving forward (+1) in the array (CCW on the board).
 * 'left' maps to moving backward (-1) in the array (CW on the board).
 * @param {string} currentPitId
 * @param {'left' | 'right'} direction
 * @param {Array<Object>} pitsData - The current state of all pits (ordered CCW)
 * @param {string} layoutType - Used for validation and potentially future logic.
 * @returns {string | null} The ID of the next pit, or null if error
 */
export function getNextPitId(currentPitId, direction, pitsData, layoutType) {
    // console.log(`getNextPitId: From "${currentPitId}" in direction "${direction}" for layout "${layoutType}".`); // Very chatty
    const currentIndex = pitsData.findIndex(p => p.id === currentPitId);
    if (currentIndex === -1) {
        console.error(`getNextPitId: Pit "${currentPitId}" not found in pitsData!`);
        return null;
    }

    const numPits = pitsData.length;
    if (numPits === 0) {
        console.error("getNextPitId: pitsData is empty.");
        return null;
    }

    // Optional: Validate pit count based on layout
    const expectedPits = { rectangle: 12, triangle: 18, square: 24 };
    if (expectedPits[layoutType] && numPits !== expectedPits[layoutType]) {
        console.warn(`getNextPitId: Expected ${expectedPits[layoutType]} pits for layout "${layoutType}", but found ${numPits}. Check generation/state.`);
    }

    let nextIndex;

    // The core logic relies only on the array order being CCW.
    if (direction === 'right') { // Visually CCW
         nextIndex = (currentIndex + 1) % numPits;
    } else if (direction === 'left') { // Visually CW
        nextIndex = (currentIndex - 1 + numPits) % numPits;
    } else {
         console.error(`getNextPitId: Invalid direction "${direction}".`);
         return null;
    }

    if (nextIndex < 0 || nextIndex >= numPits) {
         console.error(`getNextPitId: Calculated invalid next index: ${nextIndex} (from index ${currentIndex}, direction ${direction}, numPits ${numPits}). This is a major logic error.`);
         return null;
    }

    // console.log(`getNextPitId: Next index calculated: ${nextIndex}. Pit ID: "${pitsData[nextIndex].id}".`); // Very chatty
    return pitsData[nextIndex].id;
}