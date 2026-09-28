import { auth } from "@clerk/nextjs/server";
import { VoiceToolClient } from "@/components/console/create/voice-tool-client";

// No "voice" job type exists in the schema yet (jobType is only
// image|video) - there's no real history to show here, so this is an
// honest empty array rather than a fabricated one.
export default async function VoiceToolPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  return (
    <div className="flex h-full flex-col">
      <VoiceToolClient jobs={[]} />
    </div>
  );
}
