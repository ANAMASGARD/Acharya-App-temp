import { useAuth, useUser } from "@clerk/expo";

type HomeGreetingResult = {
  isLoaded: boolean;
  displayName: string | null;
  greetingText: string;
};

function resolveDisplayName(
  firstName: string | null | undefined,
  fullName: string | null | undefined,
  username: string | null | undefined,
): string {
  if (firstName?.trim()) {
    return firstName.trim();
  }
  if (fullName?.trim()) {
    return fullName.trim();
  }
  if (username?.trim()) {
    return username.trim();
  }
  return "Teacher";
}

export function useHomeGreeting(): HomeGreetingResult {
  const { isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  const isLoaded = isAuthLoaded && isUserLoaded;

  const displayName = isLoaded
    ? resolveDisplayName(
        user?.firstName,
        user?.fullName,
        user?.username,
      )
    : null;

  const greetingText = displayName
    ? `Namaste, ${displayName}!`
    : "Namaste!";

  return {
    isLoaded,
    displayName,
    greetingText,
  };
}
