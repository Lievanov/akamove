import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import supabase, { getUser } from "@/lib/supabase/client";
import { Button } from "@/app/components/ui/Button";
import GlobalNotes from "../notes/GlobalNotes";
function GoogleOAuth({ variant = "primary", size = "md" }) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState(null);

  async function handleSignInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  }

  useEffect(() => {
    getSession();
  }, []);

  useEffect(() => {
    // getCurrentPathAndSession();
  }, [pathname]);

  const getCurrentPathAndSession = async () => {
    if (pathname.includes("dashboard") && currentUser === null) {
      await handleSignInWithGoogle();
    }
  };

  const getSession = async () => {
    try {
      setCurrentUser(await getUser());
    } catch (error) {}
  };

  const logOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.push("/");
  };

  return (
    <>
      {(currentUser && (<>
        <GlobalNotes currentUser={currentUser} />
      <Button variant="ghost" size={size} onClick={() => logOut()}>Log out</Button>
      </>)
      ) || (
        <Button variant={variant} size={size} onClick={() => router.push("/login")}>
          Log In
        </Button>
      )}
    </>
  );
}

export default GoogleOAuth;
