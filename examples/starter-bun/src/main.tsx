import { defineApp } from 'liteforge'
import { routerPlugin, defineRouter, createBrowserHistory } from '@liteforge/router'
import { toastPlugin } from '@liteforge/toast'
import { HomePage } from './pages/Home.js'
import { AboutPage } from './pages/About.js'
import { App } from './App.js'
import './styles.css'

const router = defineRouter({
  history: createBrowserHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/about', component: AboutPage },
  ],
})

await defineApp({
  root: App,
  target: '#app',
})
  .use(routerPlugin(router))
  .use(toastPlugin({ position: 'bottom-right' }))
  .mount()
