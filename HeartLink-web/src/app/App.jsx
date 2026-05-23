import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "../features/landing/landing";
import Dashboard from "../features/dashboard/home";
import Login from "../features/auth/login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
