import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "../features/dashboard/home";
import Login from "../features/auth/login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
