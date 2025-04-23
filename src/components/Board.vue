<script setup>
// ... imports ...
import { computed, ref, onMounted, nextTick, onUpdated } from 'vue';
import Pit from './Pit.vue';
import { useGameStore } from '@/stores/game';
import { updatePitPositions } from '../utils/animationManager';

const store = useGameStore();
const emit = defineEmits(['pit-positions-updated']);

const pitsToDisplay = computed(() => store.pitsData);
const currentLayout = computed(() => store.boardLayout);

// --- Styling and Positioning Logic ---

function getGridStyle(pit) {
    const style = {};
    const id = pit.id;
    const type = pit.type;
    const owner = pit.owner;
    const layout = currentLayout.value;

    const arrayIndex = store.pitsData.findIndex(p => p.id === id);
    if (arrayIndex === -1) {
        console.error(`Board.vue getGridStyle: Pit ${id} not found in pitsData array!`);
        return {};
    }

    // --- Layout-Specific Grid Positioning ---
    if (layout === 'rectangle') { // 2 Players (Should be OK)
        // ... logic unchanged ...
        if (type === 'quan') {
            style['grid-row'] = '1 / 3';
            style['align-self'] = 'stretch';
            style['grid-column'] = (id === 'q0') ? '1 / 2' : '7 / 8';
        } else {
            const visualColumnStart = (owner === 0) ? (arrayIndex + 1) : (13 - arrayIndex);
            style['grid-row'] = (owner === 0) ? '2 / 3' : '1 / 2';
            style['grid-column'] = `${visualColumnStart} / ${visualColumnStart + 1}`;
        }
    }
    else if (layout === 'triangle') { // 3 Players - Mapped to 11 Col x 7 Row Grid
        const danPitsPerSide = 5;
        const pitsPerSide = danPitsPerSide + 1;
        const pitIndexInSide = arrayIndex % pitsPerSide; // 0 for quan, 1-5 for dân

        // Handle Quan pits by id
        if (type === 'quan') {
            const quanIndex = parseInt(id.replace('q', ''), 10);
            if (quanIndex === 0) {
                style['grid-row'] = '7 / 8';
                style['grid-column'] = '1 / 2';
            } else if (quanIndex === 1) {
                style['grid-row'] = '7 / 8';
                style['grid-column'] = '10 / 11';
            } else if (quanIndex === 2) {
                style['grid-row'] = '1 / 2';
                style['grid-column'] = '5 / 7';
            } else {
                console.error(`Triangle layout: Invalid quanIndex ${quanIndex} for pit ${id}`);
            }
        } else {
            // Handle dân pits by owner side
            if (owner === 0) { // Player 0 - Bottom Side
                style['grid-row'] = '7 / 8';
                const mappings = [
                    {}, // dummy
                    { col: '2 / 3' }, // p1_d0
                    { col: '3 / 5' }, // p1_d1
                    { col: '5 / 7' }, // p1_d2
                    { col: '7 / 9' }, // p1_d3
                    { col: '9 / 10' }, // p1_d4
                ];
                style['grid-column'] = mappings[pitIndexInSide].col;
            } else if (owner === 1) { // Player 1 - Right Side (Staggered)
                const mappings = [
                    {}, // dummy
                    { row: '6 / 7', col: '10 / 11' }, // p1_d0
                    { row: '5 / 6', col: '9 / 10' }, // p1_d1
                    { row: '4 / 5', col: '8 / 9' }, // p1_d2
                    { row: '3 / 4', col: '7 / 8' }, // p1_d3
                    { row: '2 / 3', col: '6 / 7' }, // p1_d4
                ];
                style['grid-row'] = mappings[pitIndexInSide].row;
                style['grid-column'] = mappings[pitIndexInSide].col;
            } else if (owner === 2) { // Player 2 - Left Side (Staggered)
                const mappings = [
                    {}, // dummy
                    { row: '2 / 3', col: '5 / 6' }, // p2_d0
                    { row: '3 / 4', col: '4 / 5' }, // p2_d1
                    { row: '4 / 5', col: '3 / 4' }, // p2_d2
                    { row: '5 / 6', col: '2 / 3' }, // p2_d3
                    { row: '6 / 7', col: '1 / 2' }, // p2_d4
                ];
                style['grid-row'] = mappings[pitIndexInSide].row;
                style['grid-column'] = mappings[pitIndexInSide].col;
            } else {
                console.error(`Triangle layout: Invalid owner ${owner} for pit ${id}`);
            }
        }

        // Center items within their grid cell
        style['align-self'] = 'center';
        style['justify-self'] = 'center';
    }
    else if (layout === 'square') { // 4 Players (Should be OK now)
        const danPitsPerSide = 5;
        const sideLength = danPitsPerSide + 2; // 7 grid cells per side
        const pitsPerSide = danPitsPerSide + 1;

        if (type === 'quan') {
            const quanIndex = parseInt(id.split('q')[1], 10);
            if (quanIndex === 0) { style['grid-row'] = '1 / 2'; style['grid-column'] = '1 / 2'; }
            else if (quanIndex === 1) { style['grid-row'] = '1 / 2'; style['grid-column'] = '7 / 8'; }
            else if (quanIndex === 2) { style['grid-row'] = '7 / 8'; style['grid-column'] = '7 / 8'; }
            else if (quanIndex === 3) { style['grid-row'] = '7 / 8'; style['grid-column'] = '1 / 2'; }
            else { console.error(`Square layout: Invalid quanIndex ${quanIndex} for pit ${id}`); }
        } else {
            const pitIndexInSide = arrayIndex % pitsPerSide - 1;
            if (owner === 0) { style['grid-row'] = '1 / 2'; style['grid-column'] = `${pitIndexInSide + 2} / ${pitIndexInSide + 3}`; }
            else if (owner === 1) { style['grid-column'] = '7 / 8'; style['grid-row'] = `${pitIndexInSide + 2} / ${pitIndexInSide + 3}`; }
            else if (owner === 2) { style['grid-row'] = '7 / 8'; style['grid-column'] = `${sideLength - 1 - pitIndexInSide} / ${sideLength - pitIndexInSide}`; }
            else { style['grid-column'] = '1 / 2'; style['grid-row'] = `${sideLength - 1 - pitIndexInSide} / ${sideLength - pitIndexInSide}`; }
        }
        style['align-self'] = 'stretch';
        style['justify-self'] = 'stretch';
    }

    return style;
}

// --- Position Update Logic (remains the same) ---
// ...
</script>

<template>
    <!-- Bind layout class dynamically -->
    <div class="board" :class="`board-layout-${currentLayout}`">
        <Pit v-for="pit in pitsToDisplay" :key="pit.id" :id="pit.id" :pit-data="pit"
            :is-selected="store.selectedPitId === pit.id" :is-animating="store.isAnimating"
            :style="getGridStyle(pit)" />
    </div>
</template>

<style scoped>
.board {
    padding: 20px;
    border: 2px solid saddlebrown;
    background: burlywood;
    border-radius: 10px;
    width: fit-content;
    margin: 20px auto;
    /* Center the board */
    position: relative;
}

/* --- 2-Player Rectangle Layout --- */
.board-layout-rectangle {
    display: grid;
    grid-template-columns: minmax(80px, 1.5fr) repeat(5, minmax(60px, 1fr)) minmax(80px, 1.5fr);
    /* 7 Columns */
    grid-template-rows: auto auto;
    /* 2 Rows */
    gap: 10px 5px;
    align-items: stretch;
    justify-items: stretch;
}

/* --- 3-Player Triangle Layout --- */
.board-layout-triangle {
    display: grid;
    /* 11 columns x 7 rows based on visual target */
    grid-template-columns: repeat(11, minmax(45px, auto));
    /* Adjusted min width */
    grid-template-rows: repeat(7, minmax(45px, auto));
    /* Adjusted min height */
    gap: 4px;
    /* Slightly reduced gap */
    padding: 15px;
    /* Adjusted padding */
    width: fit-content;
    /* align/justify set via inline style (center) */
}

/* Triangle specific overrides for pit appearance */
.board-layout-triangle :deep(.pit-quan) {
    border-radius: 50%;
    width: 55px;
    /* Adjusted size */
    height: 55px;
}

.board-layout-triangle :deep(.pit-dan) {
    width: 45px;
    /* Adjusted size */
    height: 45px;
}

/* --- 4-Player Square Layout --- */
.board-layout-square {
    display: grid;
    /* 7x7 grid */
    grid-template-columns: minmax(70px, auto) repeat(5, minmax(55px, auto)) minmax(70px, auto);
    grid-template-rows: minmax(70px, auto) repeat(5, minmax(55px, auto)) minmax(70px, auto);
    gap: 5px;
    align-items: stretch;
    justify-items: stretch;
}

/* Square specific overrides */
.board-layout-square :deep(.pit-quan) {
    border-radius: 20%;
    min-height: 70px;
}

.board-layout-square :deep(.pit-dan) {
    min-height: 55px;
}
</style>