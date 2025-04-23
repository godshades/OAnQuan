<script setup>
// ... imports ...
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';

const props = defineProps({
  pitData: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  isAnimating: { type: Boolean, default: false },
});

const store = useGameStore();

// ... computed properties for selection/click ...
const isVisuallySelectable = computed(() => {
    return store.potentialSelectablePits.has(props.pitData.id);
});

const canClickToSelect = computed(() => {
     return !store.isAnimating && (isVisuallySelectable.value || props.isSelected);
});


const pitClasses = computed(() => ({
  pit: true,
  'pit-dan': props.pitData.type === 'dan',
  'pit-quan': props.pitData.type === 'quan',
  // Removed specific owner classes here, will use data attribute + CSS
  // 'pit-owner-0': props.pitData.owner === 0, ...
  'selectable': isVisuallySelectable.value,
  'selected': props.isSelected,
  'clickable': canClickToSelect.value,
}));

// Data attribute for owner styling
const ownerDataAttr = computed(() => {
    return props.pitData.owner !== null ? { 'data-owner': props.pitData.owner } : {};
});

function handleClick() {
   if (!store.isAnimating) {
       store.selectPit(props.pitData.id);
   } else {
        console.log("Click ignored: Animation in progress.");
   }
}
</script>

<template>
  <!-- Add data-owner attribute -->
  <div :id="pitData.id" :class="pitClasses" v-bind="ownerDataAttr" @click="handleClick">
    <span class="pit-id">{{ pitData.id }}</span>
    <span class="stone-count">{{ pitData.stones }}</span>
    <!-- ... (optional stone visuals) ... -->
  </div>
</template>

<style scoped>
.pit {
  border: 1px solid #555;
   min-width: 60px;
   min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #eee;
  position: relative;
  padding: 5px;
  text-align: center;
  box-sizing: border-box;
  border-radius: 10px;
}

.pit-dan {
    background-color: #fff8dc;
}

.pit-quan {
    background-color: #b8860b;
    color: white;
    min-width: 80px;
    min-height: 80px;
    border-radius: 30px / 50px; /* Default Oval */
 }

/* Generic Player Ownership Border Styling using Data Attribute */
/* Define colors per player */
.pit[data-owner="0"] { border-color: blue; border-width: 3px; }
.pit[data-owner="1"] { border-color: red; border-width: 3px; }
.pit[data-owner="2"] { border-color: green; border-width: 3px; }
.pit[data-owner="3"] { border-color: orange; border-width: 3px; }
/* You can adjust which border gets the color (top/bottom/left/right) if needed based on layout,
   but a full border might be simpler */


.stone-count {
  font-size: 1.5em;
  font-weight: bold;
  z-index: 1;
}
.pit-id {
   position: absolute;
   top: 2px;
   left: 2px;
   font-size: 0.7em;
   color: #aaa;
   z-index: 1;
}

.selectable {
    border-color: #00dd00;
    box-shadow: 0 0 8px #00dd00;
}
.selected { outline: 4px solid gold; }

.clickable { cursor: pointer; }
.clickable:hover { background-color: #e0e0e0; }
.pit-dan.clickable:hover { background-color: #f5deb3; }
.pit-quan.clickable:hover { background-color: #daa520; }

.pit:not(.clickable) { /* Changed from :not(.selectable) to :not(.clickable) */
    opacity: 0.7;
    cursor: default;
}

.pit.selected {
    opacity: 1; /* Ensure selected pit is always fully visible */
}

</style>