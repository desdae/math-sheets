import { getEnv, setEnvValueForTests } from "./runtime-env.js";

type EnvShape = ReturnType<typeof getEnv>;

export const env = new Proxy({} as EnvShape, {
  get(_target, property) {
    return getEnv()[property as keyof EnvShape];
  },
  set(_target, property, value) {
    setEnvValueForTests(property as keyof EnvShape, value as EnvShape[keyof EnvShape]);
    return true;
  }
});

export {
  configureNodeEnv,
  configureWorkerEnv,
  getEnv,
  resetRuntimeEnvForTests
} from "./runtime-env.js";
