import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GamePage from "./pages/GamePage";
import ResultPage from "./pages/ResultPage";
import Home from "./pages/Home";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/leaderboard" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
