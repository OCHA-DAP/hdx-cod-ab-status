import adapter from "@sveltejs/adapter-static";
import { env } from "process";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true),
  },
  kit: {
    adapter: adapter(),
    paths: {
      base: env.BASE_PATH ?? "",
    },
  },
};

export default config;
