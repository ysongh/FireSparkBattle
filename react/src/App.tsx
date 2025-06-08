import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

import Lobby from "./pages/Lobby";
import PracticeGame from "./pages/PracticeGame";
import MultiplayerGame from "./pages/MultiplayerGame";
import HowToPlay from "./pages/HowToPlay";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/howtoplay"
          element={<HowToPlay />} />
        <Route
          path="/practice"
          element={<PracticeGame />} />
        <Route
          path="/multiplayer"
          element={<MultiplayerGame />} />
        <Route
          path="/"
          element={<Lobby />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
