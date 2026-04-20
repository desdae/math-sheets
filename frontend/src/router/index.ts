import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("../views/LandingView.vue"),
    meta: {
      title: "MathSheets | Printable Math Worksheets and Practice",
      description:
        "Create printable math worksheets for addition, subtraction, multiplication, and division practice for students, teachers, and homeschool families.",
      keywords:
        "printable math worksheets, math practice, arithmetic worksheets, addition worksheets, subtraction worksheets, multiplication worksheets, division worksheets"
    }
  },
  {
    path: "/login",
    component: () => import("../views/LoginView.vue"),
    meta: {
      title: "Sign In | MathSheets",
      description: "Sign in to MathSheets to sync saved worksheets, scores, and progress.",
      robots: "noindex, nofollow"
    }
  },
  {
    path: "/auth/callback",
    component: () => import("../views/AuthCallbackView.vue"),
    meta: {
      title: "Signing In | MathSheets",
      description: "Completing sign-in for MathSheets.",
      robots: "noindex, nofollow"
    }
  },
  {
    path: "/complete-profile",
    component: () => import("../views/CompleteProfileView.vue"),
    meta: {
      title: "Complete Profile | MathSheets",
      description: "Finish setting up your MathSheets profile.",
      robots: "noindex, nofollow"
    }
  },
  {
    path: "/privacy",
    component: () => import("../views/PrivacyPolicyView.vue"),
    meta: {
      title: "Privacy Policy | MathSheets",
      description: "Read the MathSheets privacy policy and learn how worksheet, account, and consent data are handled."
    }
  },
  {
    path: "/terms",
    component: () => import("../views/TermsView.vue"),
    meta: {
      title: "Terms of Service | MathSheets",
      description: "Read the MathSheets terms of service for using the worksheet generator and related features."
    }
  },
  {
    path: "/dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: {
      title: "Dashboard | MathSheets",
      description: "View your recent worksheet progress and next recommended practice steps.",
      robots: "noindex, nofollow"
    }
  },
  {
    path: "/generate",
    component: () => import("../views/GeneratorView.vue"),
    meta: {
      title: "Worksheet Generator | MathSheets",
      description:
        "Generate printable arithmetic worksheets by difficulty, operation, number range, and page size for fast classroom or homeschool practice.",
      keywords:
        "worksheet generator, printable math worksheet generator, arithmetic practice generator, homeschool math worksheets, teacher worksheet creator"
    }
  },
  {
    path: "/worksheets",
    component: () => import("../views/SavedWorksheetsView.vue"),
    meta: {
      title: "Saved Worksheets | MathSheets",
      description: "Review your saved worksheets and completed practice sessions.",
      robots: "noindex, nofollow"
    }
  },
  {
    path: "/worksheets/:id",
    component: () => import("../views/WorksheetView.vue"),
    meta: {
      title: "Worksheet | MathSheets",
      description: "Solve a saved MathSheets worksheet.",
      robots: "noindex, nofollow"
    }
  },
  {
    path: "/leaderboard",
    component: () => import("../views/LeaderboardView.vue"),
    meta: {
      title: "Leaderboard | MathSheets",
      description: "See recent MathSheets scores and compare worksheet performance on the leaderboard."
    }
  },
  {
    path: "/profile",
    component: () => import("../views/ProfileView.vue"),
    meta: {
      title: "Profile | MathSheets",
      description: "Manage your public MathSheets profile and worksheet progress.",
      robots: "noindex, nofollow"
    }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
