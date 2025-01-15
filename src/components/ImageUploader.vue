<script setup lang="ts">
import { ref } from "vue";

const uploadedUrls = ref<string[]>([]);
const isUploading = ref(false);

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  isUploading.value = true;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '上传失败');
    }

    const result = await response.json();
    console.log('上传成功:', result.fileUrl);
    uploadedUrls.value.push(result.fileUrl);
  } catch (error) {
    console.error('上传失败:', error);
    alert(error.message || '上传失败，请重试');
  } finally {
    isUploading.value = false;
    if (input) input.value = '';
  }
};
</script>

<template>
  <div class="uploader">
    <input
      type="file"
      multiple
      accept="image/*"
      @change="handleFileUpload"
      :disabled="isUploading"
    />

    <div v-if="isUploading" class="status">正在上传...</div>

    <div v-if="uploadedUrls.length" class="urls">
      <h3>已上传的图片链接：</h3>
      <ul>
        <li v-for="(url, index) in uploadedUrls" :key="index">
          <a :href="url" target="_blank">{{ url }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.uploader {
  padding: 20px;
}

.status {
  margin: 10px 0;
  color: #666;
}

.urls {
  margin-top: 20px;
  text-align: left;
}

.urls ul {
  list-style: none;
  padding: 0;
}

.urls li {
  margin: 5px 0;
}

.urls a {
  color: #42b883;
  word-break: break-all;
}
</style>
