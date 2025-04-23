<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';

const props = defineProps({
  targetElementId: { type: String, required: true },
  currentPlayerIndex: { type: Number, required: true },
  boardLayout: { type: String, required: true } // 'rectangle', 'triangle', 'square'
});
const emit = defineEmits(['direction-chosen']);

const position = ref({ top: '0px', left: '0px', visibility: 'hidden' });

// Computed properties to determine the *actual* direction to emit
// based on player index AND layout
const emitLeftDirection = computed(() => {
    const player = props.currentPlayerIndex;
    const layout = props.boardLayout;

    if (layout === 'rectangle') { // 2P
        return player === 0 ? 'left' : 'right'; // P0: CW, P1: CCW
    } else if (layout === 'triangle') { // 3P
        if (player === 1 || player === 2 ) return 'right'; // P0, P1: CW
        else return 'left'; // P2: CCW
    } else if (layout === 'square') { // 4P
        if (player === 0 || player === 1) return 'left'; // P0, P1: CW
        else return 'right'; // P2, P3: CCW
    } else {
        console.warn(`DirectionSelector: Unknown layout "${layout}". Defaulting logic.`);
        // Fallback to original simple logic? Or just P0 logic?
        return 'left'; // Default to CW
    }
});

const emitRightDirection = computed(() => {
    const player = props.currentPlayerIndex;
    const layout = props.boardLayout;

     if (layout === 'rectangle') { // 2P
        return player === 0 ? 'right' : 'left'; // P0: CCW, P1: CW
    } else if (layout === 'triangle') { // 3P
        if (player === 1 || player === 2) return 'left'; // P0, P1: CCW
        else return 'right'; // P2: CW
    } else if (layout === 'square') { // 4P
        if (player === 0 || player === 1) return 'right'; // P0, P1: CCW
        else return 'left'; // P2, P3: CW
    } else {
        console.warn(`DirectionSelector: Unknown layout "${layout}". Defaulting logic.`);
        // Fallback to original simple logic? Or just P0 logic?
        return 'right'; // Default to CCW
    }
});


function updatePosition() { // ... (remains the same) ...
    const target = document.getElementById(props.targetElementId);
    if (target) {
        const rect = target.getBoundingClientRect();
        position.value = {
            top: `${window.scrollY + rect.top - 40}px`,
            left: `${window.scrollX + rect.left + rect.width / 2 - 50}px`,
            visibility: 'visible'
        };
    } else {
         position.value.visibility = 'hidden';
    }
}

// ... (watch, onMounted, onUnmounted remain the same) ...
watch(() => props.targetElementId, (newId) => {
  if (newId) {
    import('vue').then(({ nextTick }) => {
        nextTick(updatePosition);
    });
  } else {
    position.value.visibility = 'hidden';
  }
}, { immediate: true });

onMounted(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    updatePosition();
});
onUnmounted(() => {
     window.removeEventListener('resize', updatePosition);
     window.removeEventListener('scroll', updatePosition, true);
});
</script>

<template>
  <div class="direction-selector" :style="position">
    <!-- Buttons labeled based on visual perspective -->
    <button @click="emit('direction-chosen', emitLeftDirection)">Left</button>
    <button @click="emit('direction-chosen', emitRightDirection)">Right</button>
  </div>
</template>

<style scoped>
.direction-selector {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ccc;
  padding: 5px;
  border-radius: 5px;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  display: flex;
  gap: 10px;
  z-index: 100;
   width: fit-content;
   justify-content: center;
}
button {
  padding: 5px 10px;
  cursor: pointer;
}
</style>