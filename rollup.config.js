import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import copy from 'rollup-plugin-copy'
import clear from 'rollup-plugin-clear'
import fs from 'fs';
import path from 'path';

const extensions = [".ts", ".js"];

const preventTreeShakingPlugin = () => {
    return {
      name: 'no-treeshaking',
      resolveId(id, importer) {
        if (!importer) {
            // let's not treeshake entry points, as we're not exporting anything in App Scripts
          return {id, moduleSideEffects: "no-treeshake" }
        }
        return null;
      }
    }
  }

const removeExports = () => {
  return {
    writeBundle(options, bundle){
      for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
        
        let data = fs.readFileSync(path.join(options.dir,fileName), {encoding:'utf8'});
        data = data.split("\n").filter(line => /^exports\..+ =/.test(line) == false).join("\n");
        fs.writeFileSync(path.join(options.dir,fileName), data);
      }
    }
  }
}

export default {
  input: "./src/index.ts",
  output: {
    dir: "dist",
    format: "cjs",
  },
  plugins: [
    clear({
      targets: ['dist'],
    }),
    preventTreeShakingPlugin(),
    nodeResolve({
      extensions,
      mainFields: ['jsnext:main', 'main']
    }),
    babel({ extensions, babelHelpers: "runtime" }),
    copy({
      targets: [
        { src: 'src/appsscript.json', dest: 'dist' },
        { src: 'src/ui/*', dest: 'dist/ui' },
      ]
    }),
    removeExports()
  ],
};