<script setup lang="ts">
import dayjs from 'dayjs';
import { createWorker } from 'tesseract.js';
import { useFileSystemAccess } from '@vueuse/core';

import { ref, Ref, watch } from 'vue';
import vFcSignature from './v-fc-signature.vue';
import { Signature } from './v-fc-signature-type';
//---------------------------
const sleep = (timer: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, timer);
  });
};
//----------------------------
//手書きから変換
const control = ref(Signature.InitControl());
const scanTextByDraw = ref('');
const scanDelay = 1000;
const lastDrawEndTs = ref('');
const isScan = ref(false);
const drawEnd = async () => {
  const ts = dayjs().format('x');
  lastDrawEndTs.value = ts;
  await sleep(scanDelay);
  if (lastDrawEndTs.value !== ts) return;
  try {
    if (isScan.value) {
      drawEnd();
      return;
    }
    isScan.value = true;
    const worker = await createWorker();
    const dataUrl = await control.value.GetImage();
    if (dataUrl === null) return;
    (async () => {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const {
        data: { text },
      } = await worker.recognize(dataUrl);
      console.log(text);
      await worker.terminate();
      scanTextByDraw.value = text;
    })();
  } catch (error) {
    console.error(error);
  } finally {
    isScan.value = false;
  }
};

//----------------------------
//画像から変換
const dataType = ref('Text') as Ref<'Text' | 'ArrayBuffer' | 'Blob'>;
const scanTextByImage = ref('');
const importImageDataUrl = ref('');
const file = useFileSystemAccess({
  dataType,
  types: [
    {
      description: 'img',
      accept: {
        'image/*': ['.jpg', '.png', '.jpeg'],
      },
    },
  ],
  excludeAcceptAllOption: true,
});
watch(file.file, async (file) => {
  //
  console.log(file);
  if (!file) return;
  const fileReader = new FileReader();
  fileReader.onload = () => {
    importImageDataUrl.value = String(fileReader.result);
  };
  fileReader.readAsDataURL(file);

  const worker = await createWorker();
  (async () => {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const {
      data: { text },
    } = await worker.recognize(file);
    console.log(text);
    await worker.terminate();
    scanTextByImage.value = text;
    // console.log('読み取り結果', text);
  })();
});
</script>
<template>
  <div class="container-fluid">
    <div class="card mt-2">
      <div class="card-header bg-info">手書き機能テスト ※OCRライブラリはtesseract.js</div>
      <div class="card-body">
        <div class="d-flex">
          <button type="button" class="btn btn-warning" @click="control.Reset()">Reset</button>
        </div>
        <div class="mt-1">
          <vFcSignature
            v-model:control="control"
            class=""
            :size="{ w: 1000, h: 200 }"
            @draw-end="drawEnd()"
          ></vFcSignature>
        </div>
        <div class="mt-1">読み取り結果</div>
        <div class="scan-text">
          {{ scanTextByDraw }}
        </div>
      </div>
    </div>
    <div class="card mt-2">
      <div class="card-header bg-info">画像から変換 ※OCRライブラリはtesseract.js</div>
      <div class="card-body">
        <div class="d-flex">
          <button type="button" class="btn btn-warning" @click="file.open()">画像選択</button>
        </div>
        <div class="mt-1 img">
          <img :src="importImageDataUrl" alt="" v-if="importImageDataUrl.length != 0" />
        </div>
        <div class="mt-1">読み取り結果</div>
        <div class="scan-text">
          {{ scanTextByImage }}
        </div>
      </div>
      <div class="card-body"></div>
    </div>
  </div>
  <teleport to="#teleport"> </teleport>
</template>

<style lang="scss" scoped>
.card,
.card-header,
.card-body {
  border-color: rgb(24, 7, 112);
}
.modal-container .card {
  min-width: 400px;

  @media screen and (min-width: #{ 0 }px) and (max-width: #{ 600 - 0.1}px) {
    min-width: 300px;
  }
}

.scan-text {
  margin-top: 2px;
  border: solid 1px gray;
  min-height: 2em;
  line-height: 2em;
  white-space: pre;
  padding: 4px;
}

.img {
  border: solid 1px gray;
  min-height: 100px;
  background-color: gray;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px;

  > img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
