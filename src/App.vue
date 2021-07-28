<template>
  <div id="app" ref="container" />
</template>

<script>
import { ref, onMounted } from "vue";
import app from "./game";
export default {
  name: "App",
  setup() {
    const container = ref(null);
    onMounted(() => {
      container.value.appendChild(app.view);
    });
    return {
      container,
    };
  },
};
</script>

<style >
html,
body,
div {
  margin: 0;
  padding: 0;
}
#app canvas {
  width: 100%;
  height: 100%;
}
</style>