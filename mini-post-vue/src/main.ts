import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useEntriesStore } from '@/stores/entries'
import { useSettingsStore } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 先用「默认/系统偏好」上色，避免等网络期间闪白
useSettingsStore(pinia).applyTheme()

app.mount('#app')

// 挂载之后再异步拉数据：首屏不被网络阻塞，失败也只是局部降级
void useSettingsStore(pinia).init()
void useEntriesStore(pinia).init()
void useWeatherStore(pinia).init()
