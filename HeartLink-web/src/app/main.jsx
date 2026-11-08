import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import "../styles/app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
