import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

import PracticeGame from "./pages/PracticeGame";
import MultiplayerGame from "./pages/MultiplayerGame";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/practice"
          element={<PracticeGame />} />
        <Route
          path="/"
          element={<MultiplayerGame />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
