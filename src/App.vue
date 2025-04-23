<script setup>
import { computed } from 'vue';
import { useGameStore } from './stores/game';
import Settings from './components/Settings.vue';
import Board from './components/Board.vue';
import PlayerInfo from './components/PlayerInfo.vue';
import DirectionSelector from './components/DirectionSelector.vue';
// Optional: Message display component
// import MessageDisplay from './components/MessageDisplay.vue';


const store = useGameStore();

const showSettings = computed(() => store.gameState === 'SETUP');
const showGame = computed(() => store.gameState !== 'SETUP');
const showDirectionSelector = computed(() => store.gameState === 'AWAITING_DIRECTION' && store.selectedPitId);

function handleStartGame(config) {
  store.initializeGame(config);
}

// Handle pit positions update from Board component
function handlePitPositionsUpdated(positions) {
    store.setPitPositions(positions);
}

// No handleDirectionChosen needed here if DirectionSelector calls store directly

</script>

<template>
  <div id="app-container">
    <h1>Ô Ăn Quan</h1>
    <p>Momo/Zalo: <a href="#">0383338728</a></p>
    <Settings v-if="showSettings" @start-game="handleStartGame" />

    <div v-if="showGame" class="game-area">

      <!-- Game Message Area -->
      <div class="game-message">{{ store.gameMessage }}</div>
      <!-- Or use a dedicated component: <MessageDisplay :message="store.gameMessage" /> -->


      <div class="player-info-container">
        <PlayerInfo
          v-for="player in store.playerScores"
          :key="player.id"
          :player-data="player"
          :is-active="store.currentPlayerIndex === player.id && !store.isGameOver"
          :net-debt="store.playerNetDebts[player.id] || 0"
          :quan-value="store.settings.quanValue"
        />
      </div>

      <Board
        v-if="store.pitsData.length > 0"
        :key="store.boardLayout"
        @pit-positions-updated="handlePitPositionsUpdated"
        />
      <div v-else>Loading board...</div>

       <DirectionSelector
          v-if="showDirectionSelector"
          :target-element-id="store.selectedPitId"
          :current-player-index="store.currentPlayerIndex"
          :board-layout="store.boardLayout"
          @direction-chosen="store.chooseDirection"
       />

      <div v-if="store.isGameOver" class="game-over-message">
        <h2>Game Over!</h2>
        <!-- Message is now handled by store.gameMessage -->
        <!-- <div v-if="store.winner">
            Winner: {{ store.winner.name }} with {{ store.winner.finalScore }} points!
        </div>
         <h3>Final Scores:</h3>
        <ul>
            <li v-for="ps in store.finalScores" :key="ps.id">
               {{ ps.name }}: {{ ps.finalScore }} (Dân: {{ps.dân}}, Quan: {{ps.quan}}, Debt Adj: {{store.playerNetDebts[ps.id] || 0}})
            </li>
        </ul> -->
        <button @click="store.gameState = 'SETUP'">Play Again?</button>
      </div>
       <!-- Game status message is now handled by gameMessage state -->
       <!-- <div v-else class="game-status"> ... </div> -->


    </div>
  </div>
</template>

<style>
/* Import base styles */
@import '@/assets/main.css';

/* Add basic global styles in src/assets/main.css */
#app-container {
  font-family: sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 15px;
}

.game-area {
  margin-top: 20px;
  position: relative;
}

.game-message {
    margin-top: 15px;
    padding: 10px;
    background-color: #f0f0f0;
    border-radius: 5px;
    text-align: center;
    font-weight: bold;
    min-height: 1.2em; /* Reserve space even when empty */
}

.player-info-container {
  display: flex;
  /* Adjust justification based on number of players? Or keep space-around? */
  /* justify-content: space-around; */
  justify-content: center; /* Center items */
  gap: 15px; /* Add gap between player boxes */
  margin-bottom: 20px;
  flex-wrap: wrap; /* Ensure wrapping */
}

.game-over-message {
    margin-top: 20px;
    padding: 20px;
    border: 2px solid red;
    background-color: #ffe0e0;
    text-align: center;
}
.game-over-message h2 { color: red; }
.game-over-message button { margin-top: 15px; padding: 10px 15px; font-size: 1em;}



</style>