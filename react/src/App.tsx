import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";

import PracticeGame from "./pages/PracticeGame";
import MultiplayerGame from "./pages/MultiplayerGame";
import { ConnectMenu } from "./components/ConnectMenu";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <>
      <div>Mini App + Vite + TS + React + Wagmi</div>
      <ConnectMenu />
      <MultiplayerGame />
    </>
  );
}

export default App;
