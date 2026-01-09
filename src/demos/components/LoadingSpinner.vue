<template>
  <div class="modern-loading">
    <div class="loader-ring">
      <div class="ring-inner"></div>
    </div>
    <div class="text-group">
      <h3>{{ message }}</h3>
      <div class="shimmer-line"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  message: { type: String, default: 'Architecting your layout...' }
});
</script>

<style scoped>
.modern-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.loader-ring {
  width: 60px;
  height: 60px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-inner {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(78, 115, 223, 0.1);
  border-top: 2px solid #4e73df;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
  box-shadow: 0 -4px 10px rgba(78, 115, 223, 0.3);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text-group h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  background: linear-gradient(90deg, #fff, #4e73df, #fff);
  background-size: 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 2s linear infinite;
}

.shimmer-line {
  margin-top: 12px;
  width: 120px;
  height: 2px;
  background: rgba(255,255,255,0.05);
  border-radius: 1px;
  position: relative;
  overflow: hidden;
}

.shimmer-line::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, #4e73df, transparent);
  animation: progress 1.5s infinite;
}

@keyframes progress {
  to { left: 100%; }
}

@keyframes shimmer {
  to { background-position: 200% center; }
}
</style>
