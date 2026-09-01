import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Smite2App from "./smite2/Smite2App";
import "./smite2/smite2.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Smite2App />
  </StrictMode>,
);
