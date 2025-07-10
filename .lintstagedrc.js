export default {
  // Process files in smaller chunks to avoid memory issues
  "apps/api/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < filenames.length; i += chunkSize) {
      chunks.push(filenames.slice(i, i + chunkSize));
    }
    return chunks.map(
      (chunk) => `cd apps/api && pnpm eslint --cache ${chunk.join(" ")}`
    );
  },
  "apps/web/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < filenames.length; i += chunkSize) {
      chunks.push(filenames.slice(i, i + chunkSize));
    }
    return chunks.map(
      (chunk) => `cd apps/web && pnpm eslint --cache ${chunk.join(" ")}`
    );
  },
  "packages/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < filenames.length; i += chunkSize) {
      chunks.push(filenames.slice(i, i + chunkSize));
    }
    // For packages, we'll use the web's eslint since packages doesn't have its own
    return chunks.map(
      (chunk) =>
        `cd apps/web && pnpm eslint --cache ${chunk
          .map((f) => `../../${f}`)
          .join(" ")}`
    );
  },
};
