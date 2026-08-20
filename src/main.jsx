import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Backtest from "./Backtest.jsx";
import "./styles.css";

const isBacktest = new URLSearchParams(window.location.search).get("backtest") === "1";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isBacktest ? <Backtest /> : <App />}
  </React.StrictMode>
);
