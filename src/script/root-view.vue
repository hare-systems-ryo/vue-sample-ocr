<script setup lang="ts">
import dayjs from 'dayjs';
import { createWorker } from 'tesseract.js';
import { useFileSystemAccess } from '@vueuse/core';
import { useFileDialog } from '@vueuse/core';

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

const lang = ref('eng');

//----------------------------
//手書きから変換
const control = ref(Signature.InitControl());
const scanTextByDraw = ref('');
const scanDelay = 1000;
const lastDrawEndTs = ref('');
const isScanByDraw = ref(false);
const drawEnd = async () => {
  const ts = dayjs().format('x');
  lastDrawEndTs.value = ts;
  await sleep(scanDelay);
  if (lastDrawEndTs.value !== ts) return;
  try {
    if (isScanByDraw.value) {
      drawEnd();
      return;
    }
    isScanByDraw.value = true;
    const worker = await createWorker();
    const dataUrl = await control.value.GetImage();
    if (dataUrl === null) return;
    await (async () => {
      await worker.loadLanguage(lang.value);
      await worker.initialize(lang.value);
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
    isScanByDraw.value = false;
  }
};

//----------------------------
//画像から変換
const fileDialog = useFileDialog({
  multiple: false,
  accept: 'image/*',
});
const scanTextByImage = ref('');
const importImageDataUrl = ref('');
const isScanByImage = ref(false);
watch(fileDialog.files, async () => {
  if (!fileDialog.files.value) return;
  try {
    isScanByImage.value = true;
    const imgFile = fileDialog.files.value[0];
    console.log(imgFile);
    const fileReader = new FileReader();
    fileReader.onload = () => {
      importImageDataUrl.value = String(fileReader.result);
    };
    fileReader.readAsDataURL(imgFile);
    const worker = await createWorker();
    await worker.loadLanguage(lang.value);
    await worker.initialize(lang.value);
    const {
      data: { text },
    } = await worker.recognize(imgFile);
    console.log(text);
    await worker.terminate();
    scanTextByImage.value = text;
    isScanByImage.value = false;
  } catch (error) {
    console.error(error);
  } finally {
    isScanByImage.value = false;
  }
});
</script>
<template>
  <div class="container-fluid">
    <div class="card mt-2">
      <div class="card-body">
        <label class="form-label">読み取り言語 設定：{{ lang }}</label>
        <select class="form-select" v-model="lang">
          <option value="jpn">日本語</option>
          <option value="eng">英語</option>
        </select>
      </div>
    </div>
    <div class="card mt-2">
      <div class="card-header bg-info">手書き機能テスト ※OCRライブラリはtesseract.js</div>
      <div class="card-body">
        <div class="d-flex">
          <button type="button" class="btn btn-warning" @click="control.Reset()">Reset</button>
        </div>
        <div class="row mt-1">
          <div class="col-12 col-sm-6">
            <div class="">手書きエリア</div>
            <vFcSignature
              v-model:control="control"
              class=""
              :size="{ w: 1000, h: 200 }"
              @draw-end="drawEnd()"
            ></vFcSignature>
          </div>
          <div class="col-12 col-sm-6">
            <div class="">読み取り結果</div>
            <div class="scan-text">{{ scanTextByDraw }}</div>
          </div>
        </div>
        <div class="mt-1"></div>
      </div>
    </div>
    <div class="card mt-2">
      <div class="card-header bg-info">画像から変換 ※OCRライブラリはtesseract.js</div>
      <div class="card-body">
        <div
          class="loading d-flex align-items-center justify-content-center flex-column"
          :class="{ isLoading: isScanByImage }"
        >
          <div class="loader"></div>
          <div class="fs-1 text-white">解析中</div>
        </div>
        <div class="d-flex">
          <button type="button" class="btn btn-warning" @click="fileDialog.open()" :disabled="isScanByImage">
            画像選択
          </button>
        </div>
        <div class="row mt-1">
          <div class="col-12 col-sm-6">
            <div class="mt-1">選択画像</div>
            <div class="">
              <div class="img">
                <img :src="importImageDataUrl" alt="" v-if="importImageDataUrl.length != 0" />
              </div>
            </div>
          </div>
          <div class="col-12 col-sm-6">
            <div class="mt-1">読み取り結果</div>
            <div class="scan-text">
              {{ scanTextByImage }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <teleport to="#teleport"> </teleport>
</template>

<style lang="scss" scoped>
.loading {
  position: absolute;
  inset: 0;
  background-color: rgba(43, 50, 138, 0.411);
  z-index: 1;
  opacity: 0;
  transition: all 300ms;
  pointer-events: none;
  &.isLoading {
    pointer-events: all;
    opacity: 1;
  }
}
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
  width: 100%;
  height: 400px;
  background-color: gray;
  // display: flex;
  // justify-content: center;
  // align-items: center;
  padding: 2px;
  overflow: hidden;

  > img {
    object-fit: contain;
    width: 100%;
    height: 100%;
  }
}
</style>
