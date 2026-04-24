<template>
  <section v-if="page" data-testid="seo-landing-page" class="page-stack seo-landing-page">
    <header class="page-heading seo-landing-hero">
      <div>
        <p class="eyebrow">Printable math practice</p>
        <h1>{{ page.h1 }}</h1>
      </div>
    </header>

    <section class="card seo-landing-copy">
      <p v-for="paragraph in page.intro" :key="paragraph">{{ paragraph }}</p>
    </section>

    <section class="card seo-landing-examples">
      <h2>Example problems</h2>
      <ul>
        <li v-for="example in page.examples" :key="example">{{ example }}</li>
      </ul>
    </section>

    <section class="card seo-landing-audience">
      <h2>{{ page.audienceTitle }}</h2>
      <p>{{ page.audienceBody }}</p>
    </section>

    <section class="card seo-landing-faq">
      <h2>FAQs</h2>
      <article v-for="faq in page.faqs" :key="faq.question">
        <h3>{{ faq.question }}</h3>
        <p>{{ faq.answer }}</p>
      </article>
    </section>

    <section class="card seo-landing-related">
      <h2>Related worksheet topics</h2>
      <ul>
        <li v-for="relatedPage in relatedPages" :key="relatedPage.slug">
          <RouterLink :to="`/${relatedPage.slug}`">{{ relatedPage.h1 }}</RouterLink>
        </li>
      </ul>
    </section>

    <section class="card seo-landing-cta">
      <h2>{{ page.ctaLabel }}</h2>
      <p>{{ page.ctaDescription }}</p>
      <RouterLink class="button" :to="generatorTarget">{{ page.ctaLabel }}</RouterLink>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { getSeoPageBySlug } from "../content/seo-pages";

const props = defineProps<{
  slug: string;
}>();

const page = computed(() => getSeoPageBySlug(props.slug));
const relatedPages = computed(() =>
  (page.value?.relatedSlugs ?? [])
    .map((slug) => getSeoPageBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
);
const generatorTarget = computed(() => {
  if (!page.value?.generatorOperations?.length) {
    return "/generate";
  }

  const params = new URLSearchParams({
    operations: page.value.generatorOperations.join(",")
  });

  return `/generate?${params.toString()}`;
});
</script>
