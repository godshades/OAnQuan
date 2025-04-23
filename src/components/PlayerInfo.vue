<script setup>
import { computed } from 'vue';

const props = defineProps({
  playerData: { type: Object, required: true }, // { id, name, dân, quan }
  isActive: { type: Boolean, default: false },
  netDebt: { type: Number, default: 0 },
  quanValue: { type: Number, required: true } // Pass from settings
});

const displayScore = computed(() => {
    return props.playerData.dân + (props.playerData.quan * props.quanValue);
});

const debtStatus = computed(() => {
    if (props.netDebt > 0) return `Owed: ${props.netDebt} Dân`;
    if (props.netDebt < 0) return `Owes: ${Math.abs(props.netDebt)} Dân`;
    return 'Debt: Clear';
});

</script>

<template>
  <div class="player-info" :class="{ active: isActive }">
    <h3>{{ playerData.name }} (P{{ playerData.id + 1 }})</h3>
    <!-- Add a unique ID to the score area for animation targeting -->
    <div :id="`player-score-${playerData.id}`" class="player-score-area">
        <div>Score (Dân): {{ playerData.dân }}</div>
        <div>Score (Quan): {{ playerData.quan }} (Value: {{ playerData.quan * quanValue }})</div>
        <div><strong>Calculated Score: {{ displayScore }}</strong></div>
    </div>
     <div><em>{{ debtStatus }}</em></div>
    <div v-if="isActive" class="active-indicator">Your Turn!</div>
  </div>
</template>

<style scoped>
.player-info {
  border: 1px solid #ccc;
  padding: 10px;
  margin: 5px;
  background-color: #f9f9f9;
   min-width: 150px;
   position: relative; /* Needed if animating relative to this */
}
.player-info.active {
  border-color: gold;
  background-color: #fffacd;
}
.active-indicator {
  font-weight: bold;
  color: green;
  margin-top: 5px;
}
h3 { margin-top: 0; margin-bottom: 5px;}
em { color: #666; font-size: 0.9em; }

/* Style the score area if needed */
.player-score-area {
    margin-bottom: 5px;
}
</style>