// The code shown beside each example lives in code/*.txt, which esbuild bundles as strings.
declare module '*.txt' {
  const text: string;
  export default text;
}
