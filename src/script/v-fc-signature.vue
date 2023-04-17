<script setup lang="ts">
import { Signature } from './v-fc-signature-type';
import { reactive, ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useElementHover } from '@vueuse/core';
type Emits = {
  (e: 'update:control', control: Signature.Control): void;
  (e: 'update:drawType', drawType: Signature.DrawType): void;
  (e: 'update:drawColor', drawColor: string): void;
  (e: 'update:drawWidthPen', drawWidthPen: number): void;
  (e: 'update:drawWidthEraser', drawWidthEraser: number): void;
  (e: 'update:size', size: { w: number; h: number }): void;

  (e: 'draw-end'): void;
};
const emit = defineEmits<Emits>();
interface Props {
  class?: string | string[] | any;
  control: Signature.Control;
  drawType?: Signature.DrawType;
  drawColor?: string;
  drawWidthPen?: number;
  drawWidthEraser?: number;
  size?: { w: number; h: number };
}
const props = withDefaults(defineProps<Props>(), {
  class: '',
  drawType: Signature.DrawType.Pen,
  drawColor: Signature.DefaultValue.drawColor,
  drawWidthPen: Signature.DefaultValue.drawWidthPen,
  drawWidthEraser: Signature.DefaultValue.drawWidthEraser,
  size: () => ({
    w: Signature.DefaultValue.size.w,
    h: Signature.DefaultValue.size.h,
  }),
});
interface State {
  drawType: Signature.DrawType;
  drawColor: string;
  drawWidthPen: number;
  drawWidthEraser: number;
  size: { w: number; h: number };
  penPos: {
    x: number;
    y: number;
  };

  draw: {
    isDrag: boolean;
  };
  ctx: CanvasRenderingContext2D | null;
}
const state = reactive<State>({
  drawType: props.drawType,
  drawColor: props.drawColor,
  drawWidthPen: props.drawWidthPen,
  drawWidthEraser: props.drawWidthEraser,
  size: {
    w: props.size.w,
    h: props.size.h,
  },
  penPos: {
    x: 0,
    y: 0,
  },
  draw: {
    isDrag: false,
  },
  ctx: null,
});

//キャンバス用オブジェクト
const canvas = ref<HTMLCanvasElement | null>(null);
onUnmounted(() => {
  state.ctx = null;
  canvas.value = null;
});

// [ drawType ]

watch(
  () => props.drawType,
  (drawType) => {
    if (state.drawType === drawType) return;
    state.drawType = drawType;
  }
);

// [ drawColor ]
watch(
  () => props.drawColor,
  (drawColor) => {
    if (state.drawColor === drawColor) return;
    state.drawColor = drawColor;
  }
);
const drawColorUpdate = () => {
  emit('update:drawColor', state.drawColor);
};
//---------------------------------------------------------------------------------
watch(
  () => props.drawWidthPen,
  (drawWidthPen) => {
    if (state.drawWidthPen === drawWidthPen) return;
    state.drawWidthPen = drawWidthPen;
  }
);
watch(
  () => props.drawWidthEraser,
  (drawWidthEraser) => {
    if (state.drawWidthEraser === drawWidthEraser) return;
    state.drawWidthEraser = drawWidthEraser;
  }
);
// [ Size ]
watchEffect(() => {
  state.size.h = props.size.h;
  state.size.w = props.size.w;
});

watch(
  () => [state.size.h, state.size.w],
  () => {
    if (!canvas.value) return;
    console.log('state.size');
    const ret = canvas.value.toDataURL();
    nextTick(() => {
      const img = new Image();
      img.src = ret;
      img.onload = function () {
        if (state.ctx === null) return;
        state.ctx.drawImage(img, 0, 0);
      };
    });
  }
);
// [ state.ctx 制御 ]
watchEffect(() => {
  if (state.ctx === null) return;
  if (state.ctx.globalCompositeOperation !== state.drawType) {
    state.ctx.globalCompositeOperation = state.drawType;
  }
  if (state.drawType === Signature.DrawType.Pen) {
    state.ctx.lineWidth = state.drawWidthPen;
  } else {
    state.ctx.lineWidth = state.drawWidthEraser;
  }
});

watchEffect(() => {
  if (state.ctx === null) return;
  state.ctx.strokeStyle = state.drawColor;
});
// [ CanvasのZoom自動サイズ調整 ]
/**
 * サイズ計測用要素
 */
const elmSigContainer = ref<HTMLElement | null>(null);

const { width } = useElementSize(elmSigContainer);
/**
 * Canvasのズームレート
 */
const zoomScale = computed(() => {
  if (width.value === 0) {
    return 1;
  }
  return width.value / state.size.w;
});

/**
 * ズーム調整のCanvas内包要素のスタイル
 */
const signatureZoomStyle = computed(() => {
  return { transform: `scale(${zoomScale.value.toFixed(3)})` };
});

/**
 * ズーム調整後のCanvas内包要素のスタイル
 */
const signatureContainerStyle = computed(() => {
  return {
    height: `${Math.ceil(state.size.h * zoomScale.value)}px`,
  };
});
// [ 描画系 ]

// 描画開始（mousedown）
const dragStart = (e: any) => {
  e.preventDefault();
  // console.log(e);
  state.penPos.x = e.layerX / zoomScale.value;
  state.penPos.y = e.layerY / zoomScale.value;
  if (state.ctx === null) return;
  state.ctx.beginPath();
  state.ctx.lineTo(state.penPos.x, state.penPos.y);
  state.ctx.stroke();
  state.draw.isDrag = true;
};
// 描画
const draw = (e: any) => {
  e.preventDefault();
  if (e.buttons === 1 || e.witch === 1 || e.type == 'touchmove') {
    state.penPos.x = e.layerX / zoomScale.value;
    state.penPos.y = e.layerY / zoomScale.value;
    if (!state.draw.isDrag) {
      return;
    }
    if (state.ctx === null) return;
    state.ctx.lineTo(state.penPos.x, state.penPos.y);
    state.ctx.stroke();
  } else {
    state.penPos.x = e.layerX / zoomScale.value;
    state.penPos.y = e.layerY / zoomScale.value;
  }
};

// 描画終了（mouseup, mouseout）
const dragEnd = (e: any) => {
  e.preventDefault();
  if (state.ctx === null) return;
  state.ctx.closePath();
  state.draw.isDrag = false;
  emit('draw-end');
};
// [ ポインターのスタイル ]

/**
 * CanvasにマウスがHoverしているかどうか
 */
const isHovered = useElementHover(elmSigContainer);

/**
 * ポインターを描画する要素のスタイル
 */
const penPointerStyle = computed(() => {
  if (isHovered.value === false) {
    return { display: 'none' };
  }
  if (state.drawType === Signature.DrawType.Eraser) {
    return {
      top: (state.penPos.y - state.drawWidthEraser / 2).toFixed(3) + 'px',
      left: (state.penPos.x - state.drawWidthEraser / 2).toFixed(3) + 'px',
      width: state.drawWidthEraser + 'px',
      height: state.drawWidthEraser + 'px',
      'border-color': 'red',
      'background-color': 'rgba(255, 0, 0, 0.11)',
    };
  } else {
    return {
      top: (state.penPos.y - (state.drawWidthPen + 1) / 2).toFixed(3) + 'px',
      left: (state.penPos.x - (state.drawWidthPen + 1) / 2).toFixed(3) + 'px',
      width: (state.drawWidthPen + 1).toFixed(1) + 'px',
      height: (state.drawWidthPen + 1).toFixed(3) + 'px',
      'border-color': 'orange',
      'background-color': 'rgba(255, 0, 0, 0.11)',
    };
  }
});

// [ Control受け渡し ]

const canvasReset = () => {
  if (state.ctx === null) return;
  state.ctx.clearRect(0, 0, state.size.w, state.size.h);
};

const getImage = () => {
  try {
    if (canvas.value === null) return null;
    const ret = canvas.value.toDataURL('image/png');
    return ret;
  } catch (error) {
    console.log('getImage', error);
    return null;
  }
};

const setImage = (dataUrl: string | null) => {
  return new Promise<boolean>((resolve) => {
    try {
      if (dataUrl === null || dataUrl.length === 0) {
        // Toast.Error('サインフォームに表示するデータが指定されていません。', 'サインフォーム');
        return;
      }
      canvasReset();
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        if (state.ctx === null) return;
        state.ctx.drawImage(img, 0, 0);
        return true;
      };
      img.onerror = () => {
        // Toast.Error('サインフォームに表示するデータの展開に失敗しました。', 'サインフォーム');
        return false;
      };
    } catch (error) {
      console.error('setImage', error);
      return false;
    }
  });
};
//---------------------------------------------------------------------------------
// [ コントロール用関数の受け渡し ]------------------------------------------------
emit('update:control', {
  Reset: canvasReset,
  GetImage: getImage,
  SetImage: setImage,
});
//---------------------------------------------------------------------------------
// [ VueComponent Lifecycle ]------------------------------------------------------
const init = () => {
  if (!canvas.value) return;
  state.ctx = canvas.value.getContext('2d');
  if (state.ctx === null) return;
  state.ctx.lineCap = 'round';
  state.ctx.lineJoin = 'round';
  state.ctx.globalCompositeOperation = state.drawType;
  if (state.drawType === Signature.DrawType.Pen) {
    state.ctx.lineWidth = state.drawWidthPen;
  } else {
    state.ctx.lineWidth = state.drawWidthEraser;
  }
  state.ctx.strokeStyle = state.drawColor;
};
onMounted(() => {
  init();
});
//---------------------------------------------------------------------------------
</script>
<template>
  <div class="vfc-signature">
    <div class="signature-container" ref="elmSigContainer" :style="signatureContainerStyle">
      <div class="signature-zoom" :style="signatureZoomStyle">
        <canvas
          ref="canvas"
          :height="state.size.h"
          :width="state.size.w"
          class="draw"
          @mousedown="dragStart"
          @mouseup="dragEnd"
          @mouseout="dragEnd"
          @mousemove="draw"
          @touchstart="dragStart"
          @touchend="dragEnd"
          @touchmove="draw"
        >
        </canvas>
        <div class="pointer" :style="penPointerStyle"></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dev {
  background-color: black;
  color: white;
  padding: 4px;
  white-space: pre-line;
}
.vfc-signature {
  overflow: hidden;
  width: 100%;
  background-color: #fff;
  max-width: 100%;
  border: 2px dotted gray;
  .signature-container {
    overflow: hidden;
    background-color: rgb(255, 255, 255);

    .signature-zoom {
      transform-origin: left top;
      .pointer {
        z-index: 2;
        position: absolute;
        pointer-events: none;
        border-style: solid;
        border-width: 1px;
        border-radius: 50%;
      }
    }
  }
}
</style>
