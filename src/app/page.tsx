import OnboardingClient from "@/components/OnboardingClient";

const AUTH_MESSAGES: Record<string, string> = {
  denied: "Strava connection was cancelled. Try again or use the upload path.",
  invalid_state: "Your session expired before connecting. Please try again.",
  missing_code: "Strava didn't return an authorization code. Please try again.",
  no_athlete: "We couldn't read your Strava profile. Please try again.",
  db_error: "Something went wrong saving your account. Please try again.",
  error: "Something went wrong connecting to Strava. Please try again.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const authMessage = auth ? AUTH_MESSAGES[auth] : undefined;

  return <OnboardingClient authMessage={authMessage} />;
}
