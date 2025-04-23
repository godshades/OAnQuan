import { ref, computed, nextTick } from 'vue'
import { defineStore } from 'pinia'
import { getNextPitId, generateInitialPits } from '../utils/boardUtils'
// Import animation functions and position getter
import { animateSowing, animateCapture, animateSingleStone, getScoreAreaPosition } from '../utils/animationManager';


// --- Constants ---
const DEFAULT_QUAN_NON_THRESHOLD = 5;
const DÂN_PITS_PER_PLAYER = 5;
// Animation delays (these can be shorter now that we have visual animation timing)
const DELAY_AFTER_SOW_STONE_DROP = 20; // Short pause between stones landing
const DELAY_BETWEEN_CAPTURES = 100; // Pause between capturing stones from different pits
const DELAY_EMPTY_SIDE_RULE_VISUAL = 500; // Delay before empty side rule applies visually
const DELAY_COLLECT_REMAINING_VISUAL = 1000; // Delay before final collection animation starts
// ---

export const useGameStore = defineStore('game', () => {
    // --- State ---
    const gameState = ref('SETUP') // 'SETUP', 'AWAITING_SELECTION', 'AWAITING_DIRECTION', 'ANIMATING_SOW', 'EVALUATING_LANDING', 'PROCESSING_CAPTURE', 'TURN_END', 'APPLYING_EMPTY_SIDE_RULE', 'GAME_OVER')
    const settings = ref({
        playerCount: 2,
        quanValue: 10,
        quanNonEnabled: false,
        quanNonThreshold: DEFAULT_QUAN_NON_THRESHOLD,
    })
    const boardLayout = ref('rectangle') // horizontal 2-player
    const pitsData = ref([]) // Array of pit objects { id, type, owner, stones }
    const playerScores = ref([]) // [{ id: 0, name: 'P1', dân: 0, quan: 0 }, ...]
    const debtRecords = ref([]) // [{ borrowerId, lenderId, amount }]
    const currentPlayerIndex = ref(0)
    const selectedPitId = ref(null)
    const currentDirection = ref(null) // 'left' or 'right'
    const lastLandingPitId = ref(null)
    const isAnimating = ref(false) // IMPORTANT for blocking input

    const gameMessage = ref("Welcome to Ô Ăn Quan!"); // State for displaying messages to the user

    // State to hold pit positions (Map<string, {x, y}>) - Needs to be set from outside
    const pitPositions = ref(new Map());


    // --- Getters (Computed Properties) ---
    // ... (Getters remain largely the same)
    const isGameOver = computed(() => gameState.value === 'GAME_OVER')
    const activePlayer = computed(() => playerScores.value[currentPlayerIndex.value] || null)

    const selectablePits = computed(() => {
        if (gameState.value !== 'AWAITING_SELECTION' || isAnimating.value || !activePlayer.value) {
            return new Set();
        }
        const playerId = activePlayer.value.id;
        const selectable = pitsData.value
            .filter(p => p.owner === playerId && p.type === 'dan' && p.stones > 0)
            .map(p => p.id);
        return new Set(selectable);
    });

    const potentialSelectablePits = computed(() => {
        if (isAnimating.value || !activePlayer.value) {
            return new Set();
        }
        const playerId = activePlayer.value.id;
        const potential = pitsData.value
            .filter(p => p.owner === playerId && p.type === 'dan' && p.stones > 0)
            .map(p => p.id);
        return new Set(potential);
    });


    const playerNetDebts = computed(() => {
        const debts = {};
        playerScores.value.forEach(p => { debts[p.id] = 0; });
        debtRecords.value.forEach(debt => {
            if (debts[debt.lenderId] !== undefined) debts[debt.lenderId] += debt.amount;
            if (debts[debt.borrowerId] !== undefined) debts[debt.borrowerId] -= debt.amount;
        });
        return debts;
    });

    const finalScores = computed(() => {
        if (!isGameOver.value) return [];
        const netDebts = playerNetDebts.value;
        return playerScores.value.map(player => {
            const baseScore = player.dân + (player.quan * settings.value.quanValue);
            const finalScore = baseScore + (netDebts[player.id] || 0);
            return { ...player, finalScore };
        });
    });

    const winner = computed(() => {
        if (!isGameOver.value || finalScores.value.length === 0) return null;
        // Find player with max finalScore. Handle ties if necessary (e.g., first player in list wins tie).
        return finalScores.value.reduce((prev, current) =>
            (prev.finalScore > current.finalScore) ? prev : current
        );
    });


    // --- Helper Functions (Internal to store) ---
    function _getPitById(pitId) {
        const pit = pitsData.value.find(p => p.id === pitId);
        if (!pit) {
            console.warn(`_getPitById: Pit "${pitId}" not found!`);
        }
        return pit;
    }

    function _updatePitStones(pitId, count) {
        const pit = _getPitById(pitId);
        if (pit) {
            console.log(`_updatePitStones: Setting stones for pit "${pitId}" from ${pit.stones} to ${Math.max(0, Math.floor(count))}`);
            pit.stones = Math.max(0, Math.floor(count));
        } else {
            console.error(`_updatePitStones: Pit not found for update: ${pitId}`);
        }
    }

    // Helper to log current board state (useful for debugging)
    function _logBoardState() {
        console.log("--- Current Board State ---");
        console.log("Pits Data:", JSON.parse(JSON.stringify(pitsData.value)));
        console.log("Player Scores:", JSON.parse(JSON.stringify(playerScores.value)));
        console.log("Debt Records:", JSON.parse(JSON.stringify(debtRecords.value)));
        console.log("Current Player Index:", currentPlayerIndex.value);
        console.log("Selected Pit ID:", selectedPitId.value);
        console.log("Current Direction:", currentDirection.value);
        console.log("Game State:", gameState.value);
        console.log("Is Animating:", isAnimating.value);
        console.log("Game Message:", gameMessage.value);
        console.log("--- End Board State ---");
    }

    // Helper to update game message
    function _setMessage(message) {
        gameMessage.value = message;
        console.log("Game Message Updated:", message);
    }


    // --- Actions ---

    // Action to receive and store pit positions from Board component
    function setPitPositions(positions) {
        pitPositions.value = positions;
        console.log(`Store: Received ${positions.size} pit positions.`);
    }


    function initializeGame(config) {
        console.log("--- initializeGame START ---");
        console.log("Received config:", config);
        settings.value = { ...settings.value, ...config };
        const numPlayers = settings.value.playerCount; // Use configured player count

        playerScores.value = [];
        for (let i = 0; i < numPlayers; i++) {
            playerScores.value.push({ id: i, name: `Player ${i + 1}`, dân: 0, quan: 0 });
        }
        console.log("Initialized player scores:", JSON.parse(JSON.stringify(playerScores.value)));


        // --- Set Board Layout based on Player Count ---
        if (numPlayers === 2) {
            boardLayout.value = 'rectangle';
        } else if (numPlayers === 3) {
            boardLayout.value = 'triangle';
        } else if (numPlayers === 4) {
            boardLayout.value = 'square';
        } else {
            console.error(`Unsupported player count (${numPlayers}). Defaulting to 2 players / rectangle.`);
            settings.value.playerCount = 2; // Correct settings if invalid
            boardLayout.value = 'rectangle';
            // Re-initialize scores if player count was corrected
            playerScores.value = [{ id: 0, name: `Player 1`, dân: 0, quan: 0 }, { id: 1, name: `Player 2`, dân: 0, quan: 0 }];
        }
        console.log(`Set boardLayout to "${boardLayout.value}" for ${settings.value.playerCount} players.`);
        // --- End Board Layout Setting ---

        pitsData.value = generateInitialPits(
            settings.value.playerCount,
            settings.value.quanValue,
            DÂN_PITS_PER_PLAYER,
            boardLayout.value
        );
        console.log("Generated initial pits (ID order):", pitsData.value.map(p => p.id));

        debtRecords.value = [];
        currentPlayerIndex.value = Math.floor(Math.random() * settings.value.playerCount);

        selectedPitId.value = null;
        currentDirection.value = null;
        lastLandingPitId.value = null;
        isAnimating.value = false;

        gameState.value = 'AWAITING_SELECTION';
        _setMessage(`Player ${currentPlayerIndex.value + 1}'s turn. Select a Dân pit.`);
        console.log("Initial game state set to:", gameState.value);

        // Use nextTick and timeout to allow initial render *and* position calculation
        nextTick(() => {
            setTimeout(() => {
                console.log("Checking for empty side rule after initialization...");
                // Ensure pit positions are available before checking empty side rule if it involves visual feedback
                if (pitPositions.value.size === 0) {
                    console.warn("Pit positions not available during initial empty side check.");
                    // If positions are critical for empty side rule animation, might need to wait longer or re-trigger
                    // For now, proceed, but logs might show errors if animation tries to run.
                }
                _checkAndApplyEmptySideRuleIfNeeded(); // Check immediately for the first player
                console.log("--- initializeGame END ---");
                _logBoardState();
            }, 100); // Small delay
        });

    }


    function selectPit(pitId) {
        console.log(`--- selectPit START ---`);
        console.log(`Attempting to select pit: "${pitId}". Current state: ${gameState.value}, isAnimating: ${isAnimating.value}, selectedPitId: ${selectedPitId.value}`);
        const pit = _getPitById(pitId);
        if (!pit) {
            console.warn(`selectPit: Pit "${pitId}" not found!`);
            console.log(`--- selectPit END ---`);
            return;
        }
        console.log(`Clicked pit details:`, JSON.parse(JSON.stringify(pit)));

        if (isAnimating.value) {
            console.log("selectPit: Ignoring click while animating.");
            console.log(`--- selectPit END ---`);
            return;
        }

        const canPotentiallySelect = (pit.owner === currentPlayerIndex.value && pit.type === 'dan' && pit.stones > 0);
        console.log(`selectPit: Can potentially select this pit? ${canPotentiallySelect}`);


        if (gameState.value === 'AWAITING_SELECTION') {
            if (canPotentiallySelect) {
                console.log(`selectPit: Valid initial selection. Selected pit "${pitId}".`);
                selectedPitId.value = pitId;
                gameState.value = 'AWAITING_DIRECTION';
                _setMessage(`Choose a direction for pit "${pitId}".`);
                console.log(`selectPit: Transitioning to state: ${gameState.value}`);
            } else {
                console.log("selectPit: Ignoring click: Pit not a valid starting pit in AWAITING_SELECTION state.");
                _setMessage(`Player ${currentPlayerIndex.value + 1}: Select one of your non-empty Dân pits.`); // Reiterate instructions
            }
        }
        else if (gameState.value === 'AWAITING_DIRECTION') {
            if (selectedPitId.value === pitId) {
                console.log(`selectPit: Clicked selected pit "${pitId}". De-selecting.`);
                selectedPitId.value = null;
                currentDirection.value = null;
                gameState.value = 'AWAITING_SELECTION';
                _setMessage(`Player ${currentPlayerIndex.value + 1}'s turn. Select a Dân pit.`);
                console.log(`selectPit: Transitioning back to state: ${gameState.value}`);
            }
            else if (canPotentiallySelect) {
                console.log(`selectPit: Switched selection from "${selectedPitId.value}" to "${pitId}".`);
                selectedPitId.value = pitId;
                currentDirection.value = null;
                _setMessage(`Choose a direction for pit "${pitId}".`);
                console.log(`selectPit: Staying in state: ${gameState.value}`);
            }
            else {
                console.log("selectPit: Ignoring click: Not current selection and not a potentially selectable pit in AWAITING_DIRECTION state.");
                _setMessage(`Click "Left" or "Right", or select a different valid pit.`);
            }
        }
        else {
            console.log("selectPit: Ignoring pit selection in current state:", gameState.value);
        }
        console.log(`--- selectPit END ---`);
    }


    async function chooseDirection(direction) {
        console.log(`--- chooseDirection START ---`);
        console.log(`Attempting to choose direction: "${direction}". Current state: ${gameState.value}, selectedPitId: ${selectedPitId.value}, isAnimating: ${isAnimating.value}`);
        if (gameState.value === 'AWAITING_DIRECTION' && selectedPitId.value && !isAnimating.value) {
            if (direction !== 'left' && direction !== 'right') {
                console.error("chooseDirection: Invalid direction received:", direction);
                _setMessage("Invalid direction. Please choose Left or Right.");
                console.log(`--- chooseDirection END (Invalid Direction) ---`);
                return;
            }
            currentDirection.value = direction;
            gameState.value = 'ANIMATING_SOW';
            isAnimating.value = true;
            _setMessage("Sowing stones...");
            console.log(`chooseDirection: Valid direction "${direction}" chosen for pit "${selectedPitId.value}". Transitioning to state: ${gameState.value}. isAnimating: ${isAnimating.value}`);

            await sowStones(); // Start the sowing process and wait for it to complete

            console.log(`chooseDirection: sowStones sequence finished.`);
            console.log(`--- chooseDirection END ---`);
            // sowStones, evaluateLanding, processCaptures, endTurn handle subsequent state transitions and isAnimating=false
        } else {
            console.warn("chooseDirection: Cannot choose direction in current state or condition:", { state: gameState.value, selected: selectedPitId.value, animating: isAnimating.value });
            _setMessage("Cannot choose direction now.");
            console.log(`--- chooseDirection END (Cannot Choose) ---`);
        }
    }

    // --- Sowing and Turn Logic ---
    async function sowStones(startPitId = selectedPitId.value, direction = currentDirection.value) {
        console.log(`--- sowStones START ---`);
        console.log(`sowStones called with: startPitId="${startPitId}", direction="${direction}".`);
        _setMessage("Sowing stones...");

        if (!startPitId || (direction !== 'left' && direction !== 'right')) {
            console.error("sowStones: Called with invalid parameters. Aborting.", { startPitId, direction });
            isAnimating.value = false;
            endTurn();
            console.log(`--- sowStones END (Invalid Params) ---`);
            return;
        }

        const pitToSowFrom = _getPitById(startPitId);
        const stonesToSow = pitToSowFrom ? pitToSowFrom.stones : 0;

        if (!pitToSowFrom || stonesToSow === 0) {
            console.error("sowStones: Invalid or empty start pit for sowing. Aborting.", startPitId);
            isAnimating.value = false;
            endTurn();
            console.log(`--- sowStones END (Invalid/Empty Pit) ---`);
            return;
        }

        console.log(`sowStones: Picking up ${stonesToSow} stones from "${startPitId}".`);
        // Get initial position BEFORE setting stones to 0 in state
        const startPos = pitPositions.value.get(startPitId);
        if (!startPos) {
            console.error(`sowStones: Start pit position not found for "${startPitId}". Cannot animate.`);
            // Decide if we proceed without animation or abort. Proceeding seems safer.
            // isAnimating.value = false; // Don't set to false yet, animation manager handles it
            // continue without animation call below
        }


        _updatePitStones(startPitId, 0); // Pick up stones (update state)

        let currentPitId = startPitId;
        let landingPitId = null; // Keep track of the pit where the *last* stone was placed in THIS sowing sequence

        const sequencePitIds = []; // Array to hold the sequence of pits stones will land in

        // Determine the sequence of pit IDs for the stones to be dropped into
        let tempPitId = startPitId;
        for (let i = 0; i < stonesToSow; i++) {
            tempPitId = getNextPitId(tempPitId, direction, pitsData.value, boardLayout.value);
            if (!tempPitId) {
                console.error("sowStones: Failed to get next pit ID while determining sequence. Aborting.");
                isAnimating.value = false;
                endTurn();
                console.log(`--- sowStones END (GetNextPit Failed) ---`);
                return;
            }
            sequencePitIds.push(tempPitId);
        }
        console.log(`sowStones: Calculated sow sequence: [${sequencePitIds.join(', ')}]`);


        // --- Animate Sowing ---
        // Animate the stones moving along the sequence.
        // The animation manager needs to know the sequence and pit positions.
        // The store updates the state (stone counts in target pits) AFTER the animation resolves for each step.
        let currentStoneIndex = 0;
        let animationPromises = []; // Store promises for each stone drop animation

        // This structure requires the animation manager to signal when each stone "lands"
        // OR the animation manager animates one stone and resolves, and the store increments state and loops.
        // The latter is simpler: loop here, call animation for one stone, await, update state, repeat.

        let currentSourcePos = startPos; // Starting point for the first stone animation

        for (const targetPitId of sequencePitIds) {
            const targetPos = pitPositions.value.get(targetPitId);
            if (!targetPos) {
                console.error(`sowStones: Target pit position not found for "${targetPitId}". Cannot animate.`);
                // Proceed without animation for this stone
                // Simulate the delay anyway?
                await new Promise(resolve => setTimeout(resolve, 50)); // Small delay even without animation
            } else if (currentSourcePos) { // Only animate if we have both source and target
                // Animate one stone from the source position to the target pit
                const animationDuration = 100; // ms per pit
                await animateSingleStone(currentSourcePos, targetPos, animationDuration);

                // After animating, the source for the NEXT stone is this target pit's position
                currentSourcePos = targetPos;

                // Add a small delay *after* the stone lands before the next one starts moving
                await new Promise(resolve => setTimeout(resolve, DELAY_AFTER_SOW_STONE_DROP));

            } else {
                console.warn(`sowStones: Cannot animate stone ${currentStoneIndex + 1}: Missing source position.`);
                // Simulate delay
                await new Promise(resolve => setTimeout(resolve, 50));
                // The source for the next stone would still be the target's position if we *had* it
                // Need to handle the case where some positions are missing more gracefully.
                // For robustness, if a position is missing, maybe find the next available source?
                // Or just stop animating from that point? Let's assume positions ARE available.
            }


            // --- State Update ---
            // Increment the stone count in the target pit in state *after* the animation/delay for this stone
            const targetPit = _getPitById(targetPitId);
            if (targetPit) {
                _updatePitStones(targetPitId, targetPit.stones + 1);
                landingPitId = targetPitId; // Update landing pit ID
            } else {
                console.error(`sowStones: Target pit "${targetPitId}" not found after animation!`);
                // This indicates a severe issue, likely leading to game state corruption. Abort or log and try to continue?
                isAnimating.value = false; endTurn(); console.log(`--- sowStones END (Target Pit Missing) ---`); return;
            }

            currentStoneIndex++;
        }

        lastLandingPitId.value = landingPitId; // The last pit stone was dropped *into*
        console.log(`sowStones: All ${stonesToSow} stones sown. Last stone landed in: "${lastLandingPitId.value}".`);
        // Sowing animation finishes, proceed to evaluate the board state
        gameState.value = 'EVALUATING_LANDING';
        _setMessage("Evaluating board...");
        console.log(`sowStones: Transitioning to state: ${gameState.value}.`);
        console.log(`--- sowStones END ---`);
        evaluateLanding(); // Check rules after sowing finishes
    }

    async function evaluateLanding() {
        console.log(`--- evaluateLanding START ---`);
        console.log(`evaluateLanding: Evaluating based on last landing pit: "${lastLandingPitId.value}". Current Direction: "${currentDirection.value}".`);
        _setMessage("Evaluating board...");

        const lastPit = _getPitById(lastLandingPitId.value);
        if (!lastPit) {
            console.error("evaluateLanding: Last landing pit not found. Aborting.");
            endTurn(); // End turn safely
            console.log(`--- evaluateLanding END (Last Pit Not Found) ---`);
            return;
        }

        const pitAfterLandingId = getNextPitId(lastLandingPitId.value, currentDirection.value, pitsData.value, boardLayout.value);
        const pitAfterLanding = _getPitById(pitAfterLandingId);

        if (!pitAfterLanding) {
            console.log(`evaluateLanding: Pit immediately after landing pit ("${pitAfterLandingId}") not found. No continue or capture possible. Turn ends.`);
            endTurn();
            console.log(`--- evaluateLanding END (Pit After Landing Not Found) ---`);
            return;
        }
        console.log(`evaluateLanding: Pit immediately after landing pit is "${pitAfterLanding.id}". Type: ${pitAfterLanding.type}, Stones: ${pitAfterLanding.stones}.`);

        // Condition 1: Pit Immediately After Landing has Stones (Continue Sowing)
        if (pitAfterLanding.stones > 0) {
            console.log(`evaluateLanding: Condition met: Pit after landing has stones. Continuing sow from "${pitAfterLanding.id}".`);
            gameState.value = 'ANIMATING_SOW'; // Stay in animation state
            _setMessage("Continuing sow...");
            console.log(`evaluateLanding: Transitioning to state: ${gameState.value}. Calling sowStones recursively.`);
            await sowStones(pitAfterLandingId, currentDirection.value);
            // The recursive call to sowStones will handle subsequent states and eventually call endTurn.
            console.log(`evaluateLanding: Recursive sowStones call finished.`);
            console.log(`--- evaluateLanding END ---`);
            return;
        }

        // Condition 2: Pit Immediately After Landing is Empty (Check for Capture)
        if (pitAfterLanding.stones === 0) {
            console.log(`evaluateLanding: Condition met: Pit immediately after landing ("${pitAfterLanding.id}") is empty. Checking for capture...`);
            const potentialCapturePitId = getNextPitId(pitAfterLandingId, currentDirection.value, pitsData.value, boardLayout.value);
            const potentialCapturePit = _getPitById(potentialCapturePitId);

            if (!potentialCapturePit) {
                console.log(`evaluateLanding: Pit after empty pit ("${potentialCapturePitId}") not found. No capture possible. Turn ends.`);
                endTurn();
                console.log(`--- evaluateLanding END (Potential Capture Pit Not Found) ---`);
                return;
            }
            console.log(`evaluateLanding: Potential capture pit is "${potentialCapturePit.id}". Type: ${potentialCapturePit.type}, Stones: ${potentialCapturePit.stones}.`);

            // Capture Trigger: Potential Capture Pit Has Stones
            if (potentialCapturePit.stones > 0) {
                console.log(`evaluateLanding: Condition met: Potential capture pit has stones.`);
                // Check "Quan Non" Rule *only* if the pit being captured is a Quan pit
                if (settings.value.quanNonEnabled &&
                    potentialCapturePit.type === 'quan' &&
                    potentialCapturePit.stones < settings.value.quanNonThreshold) {
                    console.log(`evaluateLanding: Quan Non condition met for pit "${potentialCapturePit.id}" (${potentialCapturePit.stones} < ${settings.value.quanNonThreshold}). No capture. Turn ends.`);
                    _setMessage("Quan Non rule prevents capture. Turn ends.");
                    endTurn(); // Quan Non prevents capture, ends turn
                    console.log(`--- evaluateLanding END (Quan Non) ---`);
                } else {
                    console.log(`evaluateLanding: Capture triggered starting at "${potentialCapturePit.id}".`);
                    gameState.value = 'PROCESSING_CAPTURE';
                    _setMessage("Capture triggered!");
                    console.log(`evaluateLanding: Transitioning to state: ${gameState.value}. Calling processCaptures.`);
                    // Pass the pit to start capture checks from, and the direction
                    await processCaptures(potentialCapturePitId, currentDirection.value);
                    // processCaptures will handle the next state transition (calling endTurn)
                    console.log(`evaluateLanding: processCaptures sequence finished.`);
                    console.log(`--- evaluateLanding END ---`);
                }
            }
            // Condition 3: Next Two+ Pits are Empty (Stop Turn - Next is empty, Pit After Next is also empty)
            else {
                console.log(`evaluateLanding: Condition met: Potential capture pit ("${potentialCapturePit.id}") is also empty. Next two pits are empty. Turn ends.`);
                _setMessage("No capture possible. Turn ends.");
                endTurn();
                console.log(`--- evaluateLanding END (Next Two Empty) ---`);
            }
            return;
        }

        // Fallback
        console.error("evaluateLanding: Reached end of logic without a state transition. This should not happen. Forcing end turn.");
        _setMessage("Error in game logic. Ending turn.");
        endTurn();
        console.log(`--- evaluateLanding END (Fallback Error) ---`);
    }

    // Takes startCapturePitId and the direction of movement for sequential checks
    async function processCaptures(startCapturePitId, captureDirection) {
        console.log(`--- processCaptures START ---`);
        console.log(`processCaptures called with: startCapturePitId="${startCapturePitId}", captureDirection="${captureDirection}".`);
        _setMessage("Processing captures...");

        if (captureDirection !== 'left' && captureDirection !== 'right') {
            console.error("processCaptures: Called with invalid direction. Aborting.", captureDirection);
            endTurn();
            console.log(`--- processCaptures END (Invalid Direction) ---`);
            return;
        }

        let currentCheckPitId = startCapturePitId;
        let capturedCount = 0; // Track how many pits were captured in this sequence

        while (true) {
            const pitToCapture = _getPitById(currentCheckPitId);

            if (!pitToCapture || pitToCapture.stones === 0) {
                console.log(`processCaptures: Capture sequence check stop: Pit "${currentCheckPitId}" empty or not found.`);
                break;
            }
            console.log(`processCaptures: Evaluating pit "${currentCheckPitId}" for capture. Type: ${pitToCapture.type}, Stones: ${pitToCapture.stones}.`);


            // Check Quan Non *again* if the current pit is a Quan and the rule is on
            if (settings.value.quanNonEnabled &&
                pitToCapture.type === 'quan' &&
                pitToCapture.stones < settings.value.quanNonThreshold) {
                console.log(`processCaptures: Quan Non condition met for pit "${pitToCapture.id}" (${pitToCapture.stones} < ${settings.value.quanNonThreshold}). Capture sequence stops.`);
                _setMessage(`Capture sequence stopped due to Quan Non at "${pitToCapture.id}".`); // Update message if sequence stops early
                break;
            }

            // --- Perform Capture ---
            console.log(`processCaptures: Performing capture from "${pitToCapture.id}". Stones: ${pitToCapture.stones}, Type: ${pitToCapture.type}.`);
            const stonesCapturedFromPit = pitToCapture.stones; // Get stone count *before* updating state
            const isQuanCapture = pitToCapture.type === 'quan';

            // Update Score
            if (isQuanCapture) {
                console.log(`processCaptures: Capturing Quan pit "${pitToCapture.id}". Adding ${stonesCapturedFromPit} stones to dân score and 1 to quan count.`);
                playerScores.value[currentPlayerIndex.value].dân += stonesCapturedFromPit;
                playerScores.value[currentPlayerIndex.value].quan += 1;
                _setMessage(`Captured Quan from "${pitToCapture.id}"!`);
            } else { // It's a Dân pit
                console.log(`processCaptures: Capturing Dân pit "${pitToCapture.id}". Adding ${stonesCapturedFromPit} stones to dân score.`);
                playerScores.value[currentPlayerIndex.value].dân += stonesCapturedFromPit;
                _setMessage(`Captured ${stonesCapturedFromPit} stones from "${pitToCapture.id}"!`);
            }

            // Update Pit state *after* getting stone count and updating score
            _updatePitStones(currentCheckPitId, 0);
            capturedCount++; // Increment count of pits captured in this sequence

            console.log("processCaptures: Current player scores:", JSON.parse(JSON.stringify(playerScores.value[currentPlayerIndex.value])));

            // --- Animate Capture ---
            // Animate stones moving from the captured pit to the player's score area
            const scoreAreaPos = getScoreAreaPosition(currentPlayerIndex.value);
            const pitPos = pitPositions.value.get(currentCheckPitId);

            if (pitPos && scoreAreaPos) {
                console.log(`processCaptures: Animating capture from "${pitToCapture.id}" to score area.`);
                // Animate the stones from this pit. Duration is set inside animateCapture.
                await animateCapture([pitToCapture.id], scoreAreaPos, pitPositions.value); // Pass as array for future batching
            } else {
                console.warn(`processCaptures: Cannot animate capture from "${pitToCapture.id}". Missing positions.`);
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CAPTURES)); // Simulate delay even without animation
            }


            // --- Check for Next Sequential Capture ---
            const pitAfterCapturedId = getNextPitId(currentCheckPitId, captureDirection, pitsData.value, boardLayout.value);
            const pitAfterCaptured = _getPitById(pitAfterCapturedId);

            if (!pitAfterCaptured || pitAfterCaptured.stones !== 0) {
                console.log(`processCaptures: Sequential capture broken: Pit after captured pit ("${pitAfterCapturedId}") is not empty or not found. Stopping sequence.`);
                break;
            }
            console.log(`processCaptures: Pit after captured pit ("${pitAfterCaptured.id}") is empty. Checking two steps ahead...`);

            const nextPotentialCapturePitId = getNextPitId(pitAfterCapturedId, captureDirection, pitsData.value, boardLayout.value);
            const nextPotentialCapturePit = _getPitById(nextPotentialCapturePitId);

            if (!nextPotentialCapturePit || nextPotentialCapturePit.stones === 0) {
                console.log(`processCaptures: Sequential capture broken: Pit two steps after captured pit ("${nextPotentialCapturePitId}") is empty or not found. Stopping sequence.`);
                break;
            }

            console.log(`processCaptures: Conditions met for sequential capture: Pit after captured ("${pitAfterCaptured.id}") is empty, pit after that ("${nextPotentialCapturePit.id}") has stones. Continuing capture sequence check with "${nextPotentialCapturePit.id}".`);
            currentCheckPitId = nextPotentialCapturePitId;
        }

        console.log("processCaptures: Capture processing finished.");
        // Set final message after sequence
        if (capturedCount > 0) {
            _setMessage(`Player ${currentPlayerIndex.value + 1} captured ${capturedCount} pit${capturedCount > 1 ? 's' : ''}! Turn ends.`);
        } else {
            // This case might happen if Quan Non stopped the *first* potential capture pit check
            // Or if evaluateLanding somehow triggered processCaptures when the starting pit was empty? (Shouldn't happen)
            _setMessage(`No captures this turn. Turn ends.`);
            console.warn("processCaptures: Ended with 0 captures. Check preceding logic.");
        }

        console.log(`--- processCaptures END ---`);
        endTurn();
    }


    function endTurn() {
        console.log(`--- endTurn START ---`);
        console.log(`Ending turn for player ${currentPlayerIndex.value}. Current state: ${gameState.value}, isAnimating: ${isAnimating.value}`);

        selectedPitId.value = null;
        currentDirection.value = null;
        lastLandingPitId.value = null;

        const allQuanEmpty = pitsData.value.every(p => p.type !== 'quan' || p.stones === 0);
        console.log(`endTurn: Checking Game Over condition (all Quan empty): ${allQuanEmpty}`);
        if (allQuanEmpty) {
            console.log("endTurn: GAME OVER condition met.");
            gameState.value = 'GAME_OVER';
            _setMessage("Game Over! Collecting remaining stones...");
            console.log(`endTurn: Transitioning to state: ${gameState.value}.`);
            nextTick(() => {
                setTimeout(() => {
                    console.log("endTurn: Starting final stone collection...");
                    collectRemainingStones(); // Collect remaining dân
                    // isAnimating will be set false AFTER collection animation
                }, DELAY_COLLECT_REMAINING_VISUAL);
            });
            // Don't set isAnimating = false here, it happens after collection finishes
            return;
        }

        // Game is not over, advance player
        const previousPlayerIndex = currentPlayerIndex.value;
        currentPlayerIndex.value = (currentPlayerIndex.value + 1) % settings.value.playerCount;
        console.log(`endTurn: Game not over. Advancing player from ${previousPlayerIndex} to ${currentPlayerIndex.value}.`);

        nextTick(() => {
            setTimeout(() => {
                console.log(`endTurn: Checking Empty Side Rule for new current player ${currentPlayerIndex.value}...`);
                if (!_checkAndApplyEmptySideRuleIfNeeded()) {
                    console.log(`endTurn: Empty Side Rule not needed for player ${currentPlayerIndex.value}.`);
                    gameState.value = 'AWAITING_SELECTION';
                    _setMessage(`Player ${currentPlayerIndex.value + 1}'s turn. Select a Dân pit.`);
                    console.log(`endTurn: Transitioning to state: ${gameState.value}.`);
                    isAnimating.value = false; // Release animation lock here if no rule applies
                    console.log(`endTurn: isAnimating set to ${isAnimating.value}.`);
                }
                // If rule *did* apply, _checkAndApply... will handle message and state/isAnimating
                console.log(`--- endTurn END ---`);
                _logBoardState(); // Log board state at the end of a normal turn
            }, 100); // Small delay before checking empty side rule
        });
    }

    function _checkAndApplyEmptySideRuleIfNeeded() {
        console.log(`--- _checkAndApplyEmptySideRuleIfNeeded START ---`);
        console.log(`Checking 'Rải lại' for player ${currentPlayerIndex.value}.`);
        const playerPits = pitsData.value.filter(p => p.type === 'dan' && p.owner === currentPlayerIndex.value);
        const allEmpty = playerPits.every(p => p.stones === 0);
        console.log(`_checkAndApplyEmptySideRuleIfNeeded: All Dân pits for player ${currentPlayerIndex.value} are empty? ${allEmpty}`);


        if (allEmpty) {
            console.log(`_checkAndApplyEmptySideRuleIfNeeded: Player ${currentPlayerIndex.value}'s Dân pits are empty. Applying 'Rải lại' rule.`);
            gameState.value = 'APPLYING_EMPTY_SIDE_RULE';
            isAnimating.value = true;
            _setMessage(`Player ${currentPlayerIndex.value + 1}'s pits are empty. Re-seeding...`);
            console.log(`_checkAndApplyEmptySideRuleIfNeeded: Transitioning to state: ${gameState.value}. isAnimating: ${isAnimating.value}.`);


            const player = playerScores.value[currentPlayerIndex.value];
            const neededStones = DÂN_PITS_PER_PLAYER;
            console.log(`_checkAndApplyEmptySideRuleIfNeeded: Player has ${player.dân} dân in score. Needed: ${neededStones}.`);

            // Use a delay to make the state change visible before stones appear
            setTimeout(() => {
                let stonesToPlace = player.dân;
                const borrowAmount = Math.max(0, neededStones - stonesToPlace); // Borrow only if needed

                if (stonesToPlace >= neededStones) {
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: Player ${currentPlayerIndex.value} has enough Dân in score. Reseeding...`);
                    player.dân -= neededStones;
                    playerPits.forEach(pit => _updatePitStones(pit.id, 1));
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: Reseeded ${neededStones} stones from score. Player ${currentPlayerIndex.value} score: ${player.dân} dân.`);
                    _setMessage(`Player ${currentPlayerIndex.value + 1} re-seeded pits.`);

                } else {
                    // Borrowing logic
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: Player ${currentPlayerIndex.value} needs to borrow ${borrowAmount} Dân (has ${stonesToPlace}).`);

                    player.dân = 0; // Use up any remaining score dân
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: Using ${stonesToPlace} from score. Player ${currentPlayerIndex.value} score now ${player.dân}.`);

                    // Distribute 1 stone per pit
                    playerPits.forEach(pit => {
                        _updatePitStones(pit.id, 1); // Add 1 stone
                    });
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: Placed 1 stone in each of the 5 Dân pits.`);

                    // Record the debt. Find lender (simple cyclic for now)
                    const lenderId = (currentPlayerIndex.value + 1) % settings.value.playerCount;
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: Recording debt: Player ${currentPlayerIndex.value} owes ${borrowAmount} to Player ${lenderId}.`);
                    debtRecords.value.push({ borrowerId: currentPlayerIndex.value, lenderId: lenderId, amount: borrowAmount });
                    console.log("_checkAndApplyEmptySideRuleIfNeeded: Current debt records:", JSON.parse(JSON.stringify(debtRecords.value)));

                    _setMessage(`Player ${currentPlayerIndex.value + 1} re-seeded pits and borrowed ${borrowAmount} dân.`);
                }

                // After applying rule (either from score or borrowing)
                // Add a small delay *after* stones appear before turn starts
                setTimeout(() => {
                    gameState.value = 'AWAITING_SELECTION'; // Ready for player's turn
                    isAnimating.value = false; // Allow input now
                    _setMessage(`Player ${currentPlayerIndex.value + 1}'s turn. Select a Dân pit.`);
                    console.log(`_checkAndApplyEmptySideRuleIfNeeded: 'Rải lại' rule applied for Player ${currentPlayerIndex.value}. Transitioning to state: ${gameState.value}. isAnimating: ${isAnimating.value}.`);
                    console.log(`--- _checkAndApplyEmptySideRuleIfNeeded END (Rule Applied) ---`);
                    _logBoardState();
                }, 500); // Delay before turn becomes interactive

            }, DELAY_EMPTY_SIDE_RULE_VISUAL); // Delay for rule application message/animation

            return true; // Rule was applied
        }
        console.log(`_checkAndApplyEmptySideRuleIfNeeded: No 'Rải lại' needed for player ${currentPlayerIndex.value}.`);
        console.log(`--- _checkAndApplyEmptySideRuleIfNeeded END (Rule Not Needed) ---`);
        return false; // Rule was not needed/applied
    }

    function collectRemainingStones() {
        console.log(`--- collectRemainingStones START ---`);
        console.log("collectRemainingStones: Collecting remaining Dân stones ('Tàn dân')...");
        _setMessage("Collecting remaining stones...");

        // Collect pits that need emptying
        const pitsToCollect = pitsData.value.filter(pit => pit.type === 'dan' && pit.stones > 0 && pit.owner !== null);

        // Use a delay for the message and visual before clearing
        setTimeout(async () => { // Made async to await animations

            for (const pit of pitsToCollect) {
                const stonesToCollect = pit.stones; // Get count before emptying pit state
                const ownerId = pit.owner;
                console.log(`collectRemainingStones: Collecting ${stonesToCollect} from "${pit.id}" for player ${ownerId}.`);

                // Update state *before* animating, so the pit visually empties
                _updatePitStones(pit.id, 0);

                // Animate stones from this pit to the owner's score area
                const scoreAreaPos = getScoreAreaPosition(ownerId);
                const pitPos = pitPositions.value.get(pit.id);

                if (pitPos && scoreAreaPos) {
                    console.log(`collectRemainingStones: Animating collection from "${pit.id}" to score area.`);
                    // Animate the stones from this pit. Maybe animate multiple stones or a single batch.
                    // For simplicity, animate one element representing the collected batch.
                    await animateSingleStone(pitPos, scoreAreaPos, 300); // Animate a single element
                } else {
                    console.warn(`collectRemainingStones: Cannot animate collection from "${pit.id}". Missing positions.`);
                    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
                }

                // Add stones to the player's dân score *after* animation
                playerScores.value[ownerId].dân += stonesToCollect;
                console.log(`collectRemainingStones: Player ${ownerId} dân score is now ${playerScores.value[ownerId].dân}.`);


            } // End for loop through pitsToCollect

            console.log("collectRemainingStones: Finished animating all remaining stones.");
            console.log("collectRemainingStones: Final player scores after collection:", JSON.parse(JSON.stringify(playerScores.value)));

            // After all collection animations are done
            isAnimating.value = false; // Release lock after final animations
            _setMessage(`Game Over! ${winner.value?.name || 'No one'} wins!`); // Final game over message

            console.log(`--- collectRemainingStones END ---`);
            _logBoardState();
        }, DELAY_COLLECT_REMAINING_VISUAL);
    }


    return {
        // State
        gameState,
        settings,
        boardLayout,
        pitsData,
        playerScores,
        debtRecords,
        currentPlayerIndex,
        selectedPitId,
        currentDirection,
        lastLandingPitId,
        isAnimating,
        gameMessage, // Expose game message state
        // Getters
        isGameOver,
        activePlayer,
        selectablePits,
        potentialSelectablePits,
        playerNetDebts,
        finalScores,
        winner,
        // Actions
        initializeGame,
        selectPit,
        chooseDirection,
        setPitPositions, // Expose action to receive pit positions
        // Internal actions are not exposed
    }
})