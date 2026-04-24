export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoWorksheetOperation = "+" | "-" | "*" | "/";

export type SeoLandingPage = {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  h1: string;
  intro: string[];
  examples: string[];
  audienceTitle: string;
  audienceBody: string;
  faqs: SeoFaq[];
  relatedSlugs: string[];
  ctaLabel: string;
  ctaDescription: string;
  generatorOperations?: SeoWorksheetOperation[];
};

export const seoPages: SeoLandingPage[] = [
  {
    slug: "printable-math-worksheets",
    title: "Printable Math Worksheets | MathSheets",
    description:
      "Create free printable math worksheets for addition, subtraction, multiplication, and division practice with adjustable difficulty and ready-to-print layouts.",
    keywords:
      "printable math worksheets, free math worksheets, printable arithmetic worksheets, math practice sheets, homeschool math worksheets",
    h1: "Printable math worksheets for quick daily arithmetic practice",
    intro: [
      "Printable math worksheets are useful when you need focused arithmetic practice that students can solve away from a screen.",
      "MathSheets helps teachers, parents, and homeschool families generate fresh practice pages for warm-ups, homework, intervention, and independent review."
    ],
    examples: ["7 + 5 =", "14 - 8 =", "6 x 4 =", "24 / 6 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Classroom teachers, tutors, and families who want printable arithmetic practice without searching through static worksheet libraries.",
    faqs: [
      {
        question: "Can I create different worksheet difficulties?",
        answer: "Yes. You can vary operations, number ranges, and worksheet size to match beginner, mixed, or more advanced arithmetic practice."
      },
      {
        question: "Are these worksheets useful for repeat practice?",
        answer: "Yes. Freshly generated pages help students revisit the same skill without seeing the exact same problems each time."
      }
    ],
    relatedSlugs: ["addition-worksheets", "multiplication-worksheets", "math-worksheets-with-answers"],
    ctaLabel: "Create a printable math worksheet",
    ctaDescription: "Open the generator and build a worksheet that fits your students, lesson pace, and print format."
  },
  {
    slug: "addition-worksheets",
    title: "Printable Addition Worksheets | MathSheets",
    description:
      "Create free printable addition worksheets with answer support, adjustable difficulty, and number ranges for quick classroom or homeschool practice.",
    keywords:
      "addition worksheets, printable addition worksheets, math addition practice, addition worksheets with answers",
    h1: "Printable addition worksheets for fast daily practice",
    intro: [
      "Addition worksheets help students build fluency with number bonds, mental math, and written arithmetic.",
      "Use MathSheets to generate fresh printable addition pages for warm-ups, homework, centers, intervention, or homeschool review."
    ],
    examples: ["7 + 5 =", "14 + 8 =", "36 + 27 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Teachers, parents, and homeschool families who want repeatable addition practice without reusing the same worksheet.",
    faqs: [
      {
        question: "Can I create easier addition worksheets for beginners?",
        answer: "Yes. Use smaller number ranges and simpler page sizes for early learners who are still building confidence."
      },
      {
        question: "Can I print a new version each time?",
        answer: "Yes. The generator creates fresh practice sets so students can repeat the same skill without memorizing answers."
      }
    ],
    relatedSlugs: ["printable-math-worksheets", "subtraction-worksheets", "grade-1-math-worksheets"],
    ctaLabel: "Create an addition worksheet",
    ctaDescription: "Open the generator and choose the range and difficulty that fit your learners.",
    generatorOperations: ["+"]
  },
  {
    slug: "subtraction-worksheets",
    title: "Printable Subtraction Worksheets | MathSheets",
    description:
      "Generate printable subtraction worksheets for single-digit, two-digit, and mixed subtraction practice with flexible ranges and easy print layouts.",
    keywords:
      "subtraction worksheets, printable subtraction worksheets, subtraction practice sheets, subtraction worksheets with answers",
    h1: "Printable subtraction worksheets for steady skill-building",
    intro: [
      "Subtraction worksheets give students repeated practice with difference, regrouping, and number sense.",
      "MathSheets lets you create fresh subtraction sets that work for early review, independent seat work, or extra homework support."
    ],
    examples: ["12 - 5 =", "34 - 9 =", "81 - 27 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Students who need more comfort with basic subtraction facts, borrowing, and multi-step written subtraction practice.",
    faqs: [
      {
        question: "Can I focus on simple subtraction facts first?",
        answer: "Yes. Smaller number ranges make it easy to create beginner-friendly subtraction pages before moving to larger numbers."
      },
      {
        question: "Can subtraction worksheets be mixed into broader review?",
        answer: "Yes. You can use a dedicated subtraction page first, then move into mixed-operation practice when students are ready."
      }
    ],
    relatedSlugs: ["addition-worksheets", "mixed-operations-worksheets", "grade-2-math-worksheets"],
    ctaLabel: "Create a subtraction worksheet",
    ctaDescription: "Generate subtraction practice that matches the number range and pace your students need.",
    generatorOperations: ["-"]
  },
  {
    slug: "multiplication-worksheets",
    title: "Printable Multiplication Worksheets | MathSheets",
    description:
      "Create printable multiplication worksheets for times-table fluency and multi-digit multiplication review with ready-to-print layouts.",
    keywords:
      "multiplication worksheets, printable multiplication worksheets, times table practice, multiplication worksheets with answers",
    h1: "Printable multiplication worksheets for times-table fluency",
    intro: [
      "Multiplication worksheets help students move from counting strategies to faster fact recall and stronger written computation.",
      "MathSheets makes it easy to generate repeated multiplication practice for times tables, review packets, and quick classroom drills."
    ],
    examples: ["6 x 4 =", "7 x 8 =", "9 x 12 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Learners starting times tables, students who need fact-fluency review, and teachers preparing quick multiplication drills.",
    faqs: [
      {
        question: "Can I make multiplication worksheets for one times table at a time?",
        answer: "Yes. You can control ranges so the generated problems stay closer to the tables your students are practicing."
      },
      {
        question: "Do multiplication worksheets work for daily drills?",
        answer: "Yes. Fresh practice pages are useful for bell-ringers, homework, and weekly fact-fluency checks."
      }
    ],
    relatedSlugs: ["division-worksheets", "grade-3-math-worksheets", "printable-math-worksheets"],
    ctaLabel: "Create a multiplication worksheet",
    ctaDescription: "Build a multiplication practice sheet for times tables, reviews, or quick daily drills.",
    generatorOperations: ["*"]
  },
  {
    slug: "division-worksheets",
    title: "Printable Division Worksheets | MathSheets",
    description:
      "Generate printable division worksheets for fact families, basic quotients, and early division review with simple print-ready formatting.",
    keywords:
      "division worksheets, printable division worksheets, basic division practice, division worksheets with answers",
    h1: "Printable division worksheets for early quotient practice",
    intro: [
      "Division worksheets support fact-family understanding, quotient practice, and confidence with inverse operations.",
      "Use MathSheets to create fresh printable division pages for guided practice, homework, or quick mixed reviews alongside multiplication."
    ],
    examples: ["12 / 3 =", "24 / 6 =", "36 / 9 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Students learning the relationship between multiplication and division and classes that need more repetition with basic quotients.",
    faqs: [
      {
        question: "Can I pair division practice with multiplication review?",
        answer: "Yes. Division pages work well alongside multiplication worksheets because students can reinforce the inverse relationship."
      },
      {
        question: "Are these good for simple fact practice?",
        answer: "Yes. Keeping the number range tight creates approachable worksheets for students still learning basic division facts."
      }
    ],
    relatedSlugs: ["multiplication-worksheets", "mixed-operations-worksheets", "grade-3-math-worksheets"],
    ctaLabel: "Create a division worksheet",
    ctaDescription: "Open the generator and create printable division practice for review, homework, or fact fluency.",
    generatorOperations: ["/"]
  },
  {
    slug: "mixed-operations-worksheets",
    title: "Mixed Operations Worksheets | MathSheets",
    description:
      "Create printable mixed operations worksheets that combine addition, subtraction, multiplication, and division for broader math review.",
    keywords:
      "mixed operations worksheets, mixed math worksheets, printable mixed arithmetic worksheets, all operations practice",
    h1: "Mixed operations worksheets for all-in-one arithmetic review",
    intro: [
      "Mixed operations worksheets help students decide which operation to use instead of relying on one repeated pattern down the page.",
      "MathSheets makes it easy to generate printable review pages that blend skills for spiral review, assessments, and independent practice."
    ],
    examples: ["8 + 6 =", "15 - 7 =", "4 x 9 =", "28 / 7 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Students ready for broader arithmetic review, mixed-skills homework, and teachers building warm-ups that touch several concepts quickly.",
    faqs: [
      {
        question: "Why use mixed operations worksheets instead of single-skill pages?",
        answer: "Mixed practice strengthens decision-making and helps students switch between operations instead of following one predictable pattern."
      },
      {
        question: "Can I still control the difficulty?",
        answer: "Yes. You can choose the operations and number ranges that make the review manageable for your current grade level."
      }
    ],
    relatedSlugs: ["printable-math-worksheets", "addition-worksheets", "division-worksheets"],
    ctaLabel: "Create a mixed operations worksheet",
    ctaDescription: "Generate a printable worksheet that combines operations for fuller arithmetic review.",
    generatorOperations: ["+", "-", "*", "/"]
  },
  {
    slug: "math-worksheets-with-answers",
    title: "Math Worksheets With Answers | MathSheets",
    description:
      "Create printable math worksheets with answer support so teachers and families can review arithmetic work faster and more consistently.",
    keywords:
      "math worksheets with answers, printable math worksheets with answers, answer key worksheets, arithmetic worksheets with solutions",
    h1: "Math worksheets with answers for faster checking and review",
    intro: [
      "Math worksheets with answers are useful when you want students to practice independently and still review results quickly afterward.",
      "MathSheets helps you generate printable arithmetic practice while keeping the workflow simple for classroom correction, tutoring, or homeschool follow-up."
    ],
    examples: ["9 + 8 = 17", "18 - 9 = 9", "7 x 6 = 42"],
    audienceTitle: "Best for",
    audienceBody:
      "Teachers and families who want printable arithmetic practice that is easier to review, correct, and discuss after students finish.",
    faqs: [
      {
        question: "Why are answer-ready worksheets helpful?",
        answer: "They save time during checking and make it easier to spot patterns in mistakes without rewriting the whole worksheet manually."
      },
      {
        question: "Can these still be used for independent practice?",
        answer: "Yes. They work well for independent seat work, tutoring sessions, homework, and parent-guided review."
      }
    ],
    relatedSlugs: ["printable-math-worksheets", "addition-worksheets", "mixed-operations-worksheets"],
    ctaLabel: "Create a worksheet with answers",
    ctaDescription: "Build a worksheet that is easy to print, solve, and review with students after practice."
  },
  {
    slug: "grade-1-math-worksheets",
    title: "Grade 1 Math Worksheets | MathSheets",
    description:
      "Generate printable grade 1 math worksheets for early addition, subtraction, counting, and number sense practice with simple formats.",
    keywords:
      "grade 1 math worksheets, first grade math worksheets, printable grade 1 worksheets, grade 1 addition and subtraction",
    h1: "Grade 1 math worksheets for early number sense and fact practice",
    intro: [
      "Grade 1 math worksheets usually focus on counting, number recognition, and simple addition and subtraction facts.",
      "MathSheets helps you create printable first-grade practice that stays approachable for young learners while still giving them repetition."
    ],
    examples: ["3 + 4 =", "9 - 2 =", "6 + 1 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Families and teachers who want short, approachable arithmetic pages for early learners who are just starting independent written math practice.",
    faqs: [
      {
        question: "What skills fit grade 1 math worksheets best?",
        answer: "Early addition, subtraction within smaller ranges, and number-sense practice are usually the most useful starting points."
      },
      {
        question: "Should grade 1 worksheets stay short?",
        answer: "Yes. Shorter printable pages often work better for attention span, confidence, and early accuracy."
      }
    ],
    relatedSlugs: ["addition-worksheets", "subtraction-worksheets", "grade-2-math-worksheets"],
    ctaLabel: "Create a grade 1 math worksheet",
    ctaDescription: "Generate first-grade-friendly arithmetic practice with a simple range and easy print layout.",
    generatorOperations: ["+", "-"]
  },
  {
    slug: "grade-2-math-worksheets",
    title: "Grade 2 Math Worksheets | MathSheets",
    description:
      "Create printable grade 2 math worksheets for larger addition and subtraction practice, number fluency, and growing written arithmetic confidence.",
    keywords:
      "grade 2 math worksheets, second grade math worksheets, printable grade 2 worksheets, grade 2 arithmetic practice",
    h1: "Grade 2 math worksheets for stronger addition and subtraction fluency",
    intro: [
      "Grade 2 math practice often expands into larger addition and subtraction problems, more number fluency, and steadier written work.",
      "MathSheets lets you create printable second-grade worksheets that support review, homework, and small-group intervention."
    ],
    examples: ["24 + 13 =", "41 - 18 =", "56 + 22 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Students moving beyond the earliest fact work and building confidence with larger numbers, regrouping, and more consistent written arithmetic.",
    faqs: [
      {
        question: "Are grade 2 worksheets mostly addition and subtraction?",
        answer: "Usually, yes. Second grade often emphasizes stronger fluency with larger addition and subtraction ranges before later multiplication work."
      },
      {
        question: "Can these be used for extra review at home?",
        answer: "Yes. Printable pages are useful for quick nightly practice or short review sessions that reinforce current classroom work."
      }
    ],
    relatedSlugs: ["subtraction-worksheets", "grade-1-math-worksheets", "grade-3-math-worksheets"],
    ctaLabel: "Create a grade 2 math worksheet",
    ctaDescription: "Build a printable second-grade worksheet with the range and difficulty level your learners need.",
    generatorOperations: ["+", "-"]
  },
  {
    slug: "grade-3-math-worksheets",
    title: "Grade 3 Math Worksheets | MathSheets",
    description:
      "Generate printable grade 3 math worksheets for multiplication, division, and mixed arithmetic review with classroom-ready formatting.",
    keywords:
      "grade 3 math worksheets, third grade math worksheets, printable grade 3 worksheets, grade 3 multiplication and division",
    h1: "Grade 3 math worksheets for multiplication, division, and mixed review",
    intro: [
      "Grade 3 math worksheets often shift into multiplication, division, and broader mixed-operation review while still reinforcing number fluency.",
      "MathSheets helps you create printable third-grade practice pages for times tables, fact families, homework, or weekly review."
    ],
    examples: ["4 x 6 =", "24 / 3 =", "18 + 27 ="],
    audienceTitle: "Best for",
    audienceBody:
      "Third-grade teachers and families who want printable multiplication, division, and mixed arithmetic review in a flexible format.",
    faqs: [
      {
        question: "What topics are most useful for grade 3 math worksheets?",
        answer: "Multiplication, division, and mixed arithmetic review are often the most helpful topics for grade 3 practice."
      },
      {
        question: "Can grade 3 worksheets mix newer and older skills?",
        answer: "Yes. Combining multiplication or division with earlier addition and subtraction keeps review balanced and practical."
      }
    ],
    relatedSlugs: ["multiplication-worksheets", "division-worksheets", "grade-2-math-worksheets"],
    ctaLabel: "Create a grade 3 math worksheet",
    ctaDescription: "Generate printable third-grade arithmetic practice for times tables, division, and mixed review.",
    generatorOperations: ["*", "/"]
  }
];

const seoPageMap = new Map(seoPages.map((page) => [page.slug, page]));

export const getSeoPageBySlug = (slug: string) => seoPageMap.get(slug);
