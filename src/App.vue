<script setup lang="ts">
import ImageUploader from './components/ImageUploader.vue'
</script>

<template>
  <div class="container">
    <h1>图片批量上传</h1>
    <ImageUploader />
  </div>
</template>

<style>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}
</style>