import { CreationBox } from "@/components/console/create/creation-box";

export default function ImageToolPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-8 py-14">
      <h1 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        Generate an image
      </h1>
      <CreationBox initialMode="image" />
    </div>
  );
}
