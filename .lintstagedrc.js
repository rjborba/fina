export default {
  // Process files in smaller chunks to avoid memory issues
  "apps/api/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < filenames.length; i += chunkSize) {
      chunks.push(filenames.slice(i, i + chunkSize));
    }
    return chunks.map(
      (chunk) =>
        `pnpm --dir apps/api exec eslint --cache ${chunk
          .map((filename) => JSON.stringify(filename))
          .join(" ")}`,
    );
  },
  "apps/web/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < filenames.length; i += chunkSize) {
      chunks.push(filenames.slice(i, i + chunkSize));
    }
    return chunks.map(
      (chunk) =>
        `pnpm --dir apps/web exec eslint --cache ${chunk
          .map((filename) => JSON.stringify(filename))
          .join(" ")}`,
    );
  },
  "packages/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < filenames.length; i += chunkSize) {
      chunks.push(filenames.slice(i, i + chunkSize));
    }
    return chunks.map(
      (chunk) =>
        `pnpm --dir packages/types exec eslint --cache ${chunk
          .map((filename) => JSON.stringify(filename))
          .join(" ")}`,
    );
  },
};
