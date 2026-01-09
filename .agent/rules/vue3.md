---
trigger: manual
---

# Lanxk.com Vue 3 项目规范和开发指南

## 🛠 技术栈规范
- **前端框架**：Vue 3 (v3.5.13, 组合式API)
- **UI框架**：Element Plus (v2.7.4)
- **状态管理**：Pinia (v2.1.7)
- **样式**：SASS (v1.75.0)
- **构建工具**：Vite (v5.2.6)
- **TypeScript**：v5.7.x
- **Node.js**：≥v18.0.0

## 💻 代码规范

### 组件开发
- **命名**：使用 `PascalCase` 命名组件文件（如：`TemplateBase.vue`）
- **组织**：功能相似的组件放在同一目录下
- **语法**：必须使用 `<script setup>`
- **Props**：必须指定类型和默认值，**禁止直接修改 props**（使用 emit 通知父组件）

### 样式编写
- **命名**：CSS 类使用 `kebab-case`（如：`todo-list`）
- **BEM 规范**：必须遵循 BEM（块 `block`，元素 `block__element`，修饰符 `block--modifier`）
- **作用域**：组件样式必须使用 `scoped`
- **禁止**：使用行内样式
- **禁止**：直接使用 Element Plus 类名作为选择器（如：`.el-input`）

### 状态管理 (Pinia)
- 全局状态必须使用 Pinia store
- 使用 `computed` 获取派生状态
- Action 必须使用 `async/await` 处理异步
- 组件内优先使用 props/emit，避免滥用全局状态

### TypeScript
- 必须显式声明类型，**禁止使用 any**
- 接口和类型定义使用 `PascalCase`
- 优先使用 `interface` 而非 `type`

## 📂 项目结构规范
- `src/api/`：API请求
- `src/assets/`：静态资源
- `src/components/`：组件
- `src/router/`：路由
- `src/stores/`：Pinia存储
- `src/utils/`：工具函数
- `src/views/`：页面

## 🚫 禁止事项
1. 禁止使用 jQuery 或直接操作 DOM
2. 禁止在模板中使用复杂表达式
3. 禁止直接修改 props 中的对象属性
4. 禁止在组件中使用全局变量
5. 禁止使用特定框架的类名作为选择器

## ⚠️ 特殊注意事项
1. 保留 CSS 中原有的 `!important` 关键字
2. 保留原有的代码注释和 `console.log`
3. **请勿**将文案和注释中的全角引号（“”）改为半角引号（""）