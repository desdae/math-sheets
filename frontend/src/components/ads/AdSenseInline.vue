<template>
  <section v-if="active" class="adsense-shell-slot" data-testid="adsense-shell-slot" aria-label="Sponsored content">
    <p class="adsense-shell-label">Sponsored</p>
    <ins
      ref="adElement"
      class="adsbygoogle adsense-shell-unit"
      style="display: block"
      data-ad-format="auto"
      data-full-width-responsive="true"
      :data-ad-client="adClient"
      :data-ad-slot="slotId"
    />
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { ensureAdsenseScript } from "../../lib/adsense";

const props = defineProps<{
  active: boolean;
  adClient: string;
  slotId: string;
}>();

const adElement = ref<HTMLElement | null>(null);
const hasRequestedAd = ref(false);

async function requestAd() {
  if (!props.active || !props.adClient || !props.slotId || hasRequestedAd.value || !adElement.value) {
    return;
  }

  try {
    await ensureAdsenseScript(props.adClient);
    await nextTick();
    const adsQueue = ((window as typeof window & { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
    adsQueue.push({});
    hasRequestedAd.value = true;
  } catch {
    // Keep the page functional even if AdSense fails to load.
  }
}

onMounted(() => {
  void requestAd();
});

watch(
  () => [props.active, props.adClient, props.slotId],
  () => {
    void requestAd();
  }
);
</script>

<style scoped>
.adsense-shell-slot {
  width: min(960px, calc(100vw - 2rem));
  margin: 0 auto 1.5rem;
  padding: 0.75rem 1rem 1rem;
  border: 1px solid rgba(33, 52, 88, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.78);
}

.adsense-shell-label {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(33, 52, 88, 0.56);
}

.adsense-shell-unit {
  min-height: 90px;
}
</style>
