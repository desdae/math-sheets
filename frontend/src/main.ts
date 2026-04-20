import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { applyRouteSeo } from "./lib/seo";
import "./styles/main.css";

router.afterEach((to) => {
  applyRouteSeo(to);
});

createApp(App).use(createPinia()).use(router).mount("#app");
