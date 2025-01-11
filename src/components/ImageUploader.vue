<script setup lang="ts">
import { ref } from 'vue'

interface UploadedImage {
  file: File
  preview: string
  url?: string
  uploading: boolean
  error?: string
}

const uploadedImages = ref<UploadedImage[]>([])

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  Array.from(input.files).forEach(file => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImages.value.push({
        file,
        preview: e.target?.result as string,
        uploading: false
      })
    }
    reader.readAsDataURL(file)
  })
  // Reset input value to allow uploading the same file again
  input.value = ''
}

const uploadImage = async (image: UploadedImage) => {
  if (image.uploading) return
  image.uploading = true
  image.error = undefined

  try {
    console.log('Starting upload for:', image.file.name)
    const response = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: image.preview,
        filename: `${Date.now()}-${image.file.name}`
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    if (data.url) {
      image.url = data.url
      console.log('Upload successful:', data.url)
    } else {
      throw new Error('Upload failed - no URL returned')
    }
  } catch (error) {
    console.error('Upload error:', error)
    image.error = error instanceof Error ? error.message : 'Upload failed'
  } finally {
    image.uploading = false
  }
}

const uploadAll = async () => {
  const promises = uploadedImages.value
    .filter(image => !image.url && !image.uploading)
    .map(image => uploadImage(image))
  
  await Promise.all(promises)
}

// Add drag and drop support
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  
  const files = event.dataTransfer?.files
  if (!files?.length) return

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImages.value.push({
        file,
        preview: e.target?.result as string,
        uploading: false
      })
    }
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <div class="image-uploader">
    <div 
      class="upload-zone"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        @change="handleFileSelect"
        class="file-input"
      >
      <div class="upload-text">
        点击或拖拽图片到此处上传
      </div>
    </div>

    <div v-if="uploadedImages.length" class="preview-zone">
      <div v-for="(image, index) in uploadedImages" 
           :key="index" 
           class="image-preview">
        <img :src="image.preview" :alt="image.file.name">
        <div class="image-info">
          <div class="filename">{{ image.file.name }}</div>
          <template v-if="image.url">
            <div class="success">✓ 已上传</div>
            <input 
              type="text" 
              :value="image.url" 
              readonly 
              @click="$event.target.select()"
              class="url-input"
            >
          </template>
          <div v-else-if="image.uploading" class="uploading">
            上传中...
          </div>
          <div v-else-if="image.error" class="error">
            {{ image.error }}
          </div>
          <button 
            v-else 
            @click="uploadImage(image)"
            class="upload-btn"
          >
            上传
          </button>
        </div>
      </div>
    </div>

    <button 
      v-if="uploadedImages.length" 
      @click="uploadAll" 
      class="upload-all-btn"
    >
      上传所有图片
    </button>
  </div>
</template>

<style scoped>
.image-uploader {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-zone {
  border: 2px dashed #ccc;
  padding: 40px;
  text-align: center;
  position: relative;
  cursor: pointer;
  margin-bottom: 20px;
  transition: border-color 0.3s;
}

.upload-zone:hover {
  border-color: #4caf50;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-text {
  color: #666;
}

.preview-zone {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.image-preview {
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.image-preview:hover {
  transform: translateY(-2px);
}

.image-preview img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  margin-bottom: 10px;
  border-radius: 4px;
}

.image-info {
  font-size: 0.9em;
}

.filename {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.url-input {
  width: 100%;
  padding: 4px 8px;
  margin-top: 4px;
  font-size: 0.8em;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
}

.success {
  color: #4caf50;
  margin: 4px 0;
}

.uploading {
  color: #2196f3;
  margin: 4px 0;
}

.error {
  color: #f44336;
  margin: 4px 0;
  font-size: 0.8em;
}

.upload-btn, .upload-all-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.3s;
}

.upload-btn:hover, .upload-all-btn:hover {
  background-color: #45a049;
}

.upload-all-btn {
  margin-top: 20px;
  width: 100%;
  padding: 10px;
  font-size: 1.1em;
}

.upload-btn:disabled, .upload-all-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>