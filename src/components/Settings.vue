<script setup>
import { ref } from 'vue';

const emit = defineEmits(['start-game']);

// Default to 2 players
const playerCount = ref(2);
const quanValue = ref(10);
const quanNonEnabled = ref(false);

function startGame() {
  emit('start-game', {
    playerCount: playerCount.value,
    quanValue: quanValue.value,
    quanNonEnabled: quanNonEnabled.value,
    // quanNonThreshold is currently fixed in store, could be added here
  });
}
</script>

<template>
  <div class="settings">
    <h2>Game Settings</h2>
    <div>
      <label>Players: </label>
      <select v-model.number="playerCount">
        <option value="2">2 Players (Rectangle)</option>
        <option value="3">3 Players (Triangle)</option>
        <option value="4">4 Players (Square)</option>
      </select>
    </div>
    <div>
      <label>Quan Value: </label>
      <select v-model.number="quanValue">
        <option value="10">10 Dân</option>
        <option value="5">5 Dân</option>
      </select>
    </div>
    <div>
      <label>
        <input type="checkbox" v-model="quanNonEnabled">
        Enable "Quan Non" Rule (Capture Quan only if >= 5 stones)
      </label>
    </div>
    <button @click="startGame">Start Game</button>
  </div>
</template>

<style scoped>
.settings {
  padding: 20px;
  border: 1px solid #ccc;
  margin-bottom: 20px;
}
.settings div {
  margin-bottom: 10px;
}
</style>