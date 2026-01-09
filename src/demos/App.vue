<template>
  <div class="glass-app">
    <!-- Animated background deco -->
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>

    <div class="main-layout" :class="{ 'has-content': isParsed }">
      <!-- Header Section -->
      <header class="app-header">
        <div class="logo-group">
          <h1>Docx<span>Parser</span></h1>
          <div class="version">v1.2.0</div>
        </div>
        <p class="tagline">High-Fidelity DOCX Rendering Engine</p>
      </header>

      <section class="content-stage">
        <!-- Upload Area (Initial State) -->
        <Transition name="fade-scale" mode="out-in">
          <div v-if="!isParsed" class="hero-uploader">
            <FileUploader 
              @file-selected="handleFileSelected"
              @file-dropped="handleFileDropped"
              :loading="loading"
              :error="error"
            />
          </div>

          <!-- Parsed Result View (Modern Split Layout) -->
          <div v-else class="preview-layout">
            <!-- Sidebar: Metadata & Controls -->
            <aside class="side-panel glass-card">
              <div class="panel-header">
                <h3>文档属性</h3>
                <button @click="resetSearch" class="btn-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                </button>
              </div>
              
              <div class="metadata-list" v-if="metadata">
                <div class="meta-item">
                  <label>标题</label>
                  <span>{{ metadata.title || '无' }}</span>
                </div>
                <div class="meta-item">
                  <label>作者</label>
                  <span>{{ metadata.creator || '未知' }}</span>
                </div>
                <div class="meta-item">
                  <label>创建日期</label>
                  <span>{{ formatDate(metadata.created) }}</span>
                </div>
                <div class="meta-item">
                  <label>最后修改日期</label>
                  <span>{{ formatDate(metadata.modified) }}</span>
                </div>
                <div class="meta-item">
                  <label>文件层级</label>
                  <span>AST Generated</span>
                </div>
              </div>

              <div class="actions">
                <button @click="triggerNewUpload" class="btn-primary">重新上传</button>
              </div>
            </aside>

            <!-- Main Viewer -->
            <main class="viewer-area">
              <div class="viewer-toolbar glass-card">
                <div class="zoom-controls">
                   <span>在线预览 (高保真)</span>
                </div>
              </div>
              <div class="document-scroller" ref="scroller">
                 <div class="render-canvas" ref="renderContent"></div>
              </div>
            </main>
          </div>
        </Transition>
      </section>

      <!-- Loading Overlay -->
      <Transition name="fade">
        <div v-if="loading" class="overlay-loading blur-backdrop">
          <LoadingSpinner :message="loadingMessage" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FileUploader from './components/FileUploader.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import { DocxParser } from '../docx-parser';

const loading = ref(false);
const loadingMessage = ref('');
const error = ref('');
const isParsed = ref(false);
const renderContent = ref<HTMLDivElement>();
const metadata = ref<any>(null);
let parser: DocxParser | null = null;

onMounted(() => {
  parser = new DocxParser();
});

const handleFileSelected = (file: File) => parseDocument(file);
const handleFileDropped = (file: File) => parseDocument(file);

const parseDocument = async (file: File) => {
  try {
    loading.value = true;
    loadingMessage.value = '正在解析高保真布局...';
    error.value = '';

    const result = await parser!.parse(file);
    metadata.value = result.metadata;

    console.log(result);
    
    // Smooth transition
    isParsed.value = true;
    
    // Wait for DOM to be ready
    setTimeout(() => {
      if (renderContent.value) {
        parser!.render(result, renderContent.value);
      }
      loading.value = false;
    }, 800);
  } catch (err: any) {
    loading.value = false;
    error.value = err.message || '解析失败';
  }
};

const triggerNewUpload = () => {
  isParsed.value = false;
  metadata.value = null;
};

const resetSearch = () => triggerNewUpload();

const formatDate = (date: string) => {
  if (!date) return '未知';
  return new Date(date).toLocaleDateString();
};
</script>

<style>
:root {
  --primary: #4e73df;
  --primary-glow: rgba(78, 115, 223, 0.4);
  --glass: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --text-main: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.6);
  --bg-deep: #0a0c10;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-deep);
  color: var(--text-main);
  font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
  overflow-x: hidden;
}

.glass-app {
  position: relative;
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Bg Deco */
.bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  z-index: -1;
  opacity: 0.4;
}
.bg-glow-1 {
  top: -200px;
  right: -100px;
  background: radial-gradient(circle, #4e73df, transparent);
}
.bg-glow-2 {
  bottom: -200px;
  left: -200px;
  background: radial-gradient(circle, #764ba2, transparent);
}

.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-header {
  padding: 2rem 4rem;
  text-align: left;
}

.logo-group {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.logo-group h1 {
  font-size: 2.2rem;
  margin: 0;
  font-weight: 800;
  letter-spacing: -1px;
}
.logo-group h1 span {
  background: linear-gradient(135deg, #4e73df, #22c1c3);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.version {
  background: var(--glass);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.tagline {
  margin: 0.5rem 0 0;
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* Split Viewer Layout */
.preview-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;
  padding: 0 4rem 2rem;
  height: calc(100vh - 160px);
}

.glass-card {
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.side-panel {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.metadata-list {
  flex: 1;
}

.meta-item {
  margin-bottom: 1.5rem;
}

.meta-item label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.meta-item span {
  font-weight: 500;
  font-size: 0.95rem;
  word-break: break-word;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #4e73df, #6f42c1);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px var(--primary-glow);
}

.viewer-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
}

.viewer-toolbar {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
}

.document-scroller {
  flex: 1;
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 40px;
}

.render-canvas {
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  transform-origin: top center;
}

/* Animations */
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.overlay-loading {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.7);
  z-index: 100;
}

.blur-backdrop {
  backdrop-filter: blur(10px);
}

/* Scrollbar Style */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: var(--glass-border);
  border-radius: 3px;
}
</style>
