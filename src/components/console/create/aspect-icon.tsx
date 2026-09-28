// Small rectangle scaled to the given aspect ratio, matching the visual
// language of davinciImage.png/davincivideo.png's aspect-ratio picker.
export function AspectIcon({ ratio }: { ratio: number | null }) {
  const r = ratio ?? 1;
  const size = 22;
  const width = r >= 1 ? size : size * r;
  const height = r >= 1 ? size / r : size;

  return (
    <span className="flex h-6 w-6 items-center justify-center">
      {ratio === null ? (
        <span className="block h-4 w-4 rounded-[3px] border-2 border-dashed border-current" />
      ) : (
        <span
          className="block rounded-[3px] border-2 border-current"
          style={{ width, height }}
        />
      )}
    </span>
  );
}
