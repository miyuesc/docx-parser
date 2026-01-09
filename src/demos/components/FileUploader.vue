<template>
  <div 
    class="glass-uploader"
    :class="{ 'is-dragging': isDragging, 'has-file': !!selectedFile }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div class="glow-edge"></div>
    <div class="uploader-body">
      <div class="icon-mount">
        <svg v-if="!selectedFile" class="up-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        <svg v-else class="file-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>

      <div class="text-group">
        <h3 v-if="!selectedFile">Drop your DOCX here</h3>
        <h3 v-else>{{ selectedFile.name }}</h3>
        <p class="hint">{{ selectedFile ? 'Ready to process' : 'Tap to browse or drag & drop' }}</p>
      </div>

      <div class="action-zone">
        <label class="btn-glass">
          <input type="file" @change="handleFileChange" accept=".docx" hidden />
          {{ selectedFile ? 'Change File' : 'Browse Files' }}
        </label>
      </div>
    </div>
    
    <div class="footer-info">
      <span>Supported formats: .docx</span>
      <span class="dot">·</span>
      <span>Max 50MB</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits(['fileSelected', 'fileDropped']);
const isDragging = ref(false);
const selectedFile = ref<File | null>(null);

const handleDragOver = () => (isDragging.value = true);
const handleDragLeave = () => (isDragging.value = false);

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) validateAndEmit(files[0]);
};

const handleFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) validateAndEmit(files[0]);
};

const validateAndEmit = (file: File) => {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    alert('Please select a valid .docx file');
    return;
  }
  selectedFile.value = file;
  emit('fileSelected', file);
};
</script>

<style scoped>
.glass-uploader {
  position: relative;
  width: 500px;
  max-width: 90vw;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  margin: 200px auto;
}

.is-dragging {
  background: rgba(78, 115, 223, 0.1);
  border-color: #4e73df;
  transform: scale(1.02);
}

.uploader-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.icon-mount {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border-radius: 20px;
  color: #4e73df;
}

.up-svg, .file-svg {
  width: 40px;
  height: 40px;
}

.text-group h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

.hint {
  margin: 0.5rem 0 0;
  color: rgba(255,255,255,0.4);
  font-size: 0.9rem;
}

.btn-glass {
  display: inline-block;
  padding: 12px 32px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.4);
}

.footer-info {
  margin-top: 3rem;
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.3);
}

.dot {
  font-weight: bold;
}

.glow-edge {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}
</style>
